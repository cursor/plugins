"""pstack command line."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

from . import __version__
from .hosts import HOSTS, detect, resolve
from .installer import (MODE_END, MODE_START, Plan, apply, backup_dirs, payload_files, plan, read_mode,
                        remove, restore_mode_block, retire, set_mode)
from .profile import PROFILE_FILES, check_profile, saved_hosts, summary, switch
from .receipt import Receipt, ReceiptError
from .store import Build, available, manifest


def get_build(host_key: str) -> Build:
    b = Build.load(host_key)
    if b is None:
        sys.exit(f"pstack: no build shipped for host '{host_key}'. "
                 f"Available: {', '.join(available())}")
    return b


def pick_host(args, target: Path):
    if args.host:
        try:
            return resolve(args.host), "you chose it"
        except KeyError:
            sys.exit(f"pstack: unknown host '{args.host}'. "
                     f"One of: {', '.join(sorted(HOSTS))}")
    host, reason, others = detect(target, Path(os.path.expanduser("~")))
    if others:
        print(f"  note: also detected {', '.join(others)}. Using {host.key}. "
              f"Pass --host to choose another.")
    return host, reason


def kept_state(p: Plan, switching: bool) -> list:
    """State left in place. A host switch moves the profile pair, and its notes say where."""
    return [k for k in p.state_kept if not (switching and k.rsplit("/", 1)[1] in PROFILE_FILES)]


def report_retired(res: dict, left: str, dry_run: bool = False) -> None:
    """`left` says where the files came from: another host's install, or an older build."""
    verb = "would remove" if dry_run else "removed"
    if res["removed"]:
        print(f"  {verb} {len(res['removed'])} file(s) {left}, unchanged since pstack wrote them")
    if res.get("restored"):
        print(f"  {'would restore' if dry_run else 'restored'} {len(res['restored'])} file(s) you had before pstack replaced them")
    if res["kept"]:
        print(f"  kept    {len(res['kept'])} file(s) {left} that you had edited")
    if res["linked"]:
        print(f"  left    {len(res['linked'])} file(s) {left} reached through a symlink, outside this project")
    if res["unblocked"]:
        path, gone = res["unblocked"]
        print(f"  {verb} {path}, which pstack created and you had not changed" if gone
              else f"  {verb} pstack's text from {path}, keeping yours")
    if res["memory"]:
        print(f"  note    the pstack block in {res['memory']} was edited, so it stays. Delete it by hand if you want it gone.")


def other_user_installs(host, target: Path) -> list:
    """A user-level install lives in ~, or ~/.cursor for Cursor. Another host's receipt in the other
    root is an earlier user install that this one replaces. Each root keeps its own profile."""
    home = Path(os.path.expanduser("~"))
    out = []
    for root in sorted({h.user_root(home) for h in HOSTS.values()} - {target}):
        r = Receipt.load(root)
        if r and r.host != host.key:
            out.append((root, HOSTS.get(r.host), f"the {r.host} install in {root} left"))
    return out


def user_level(r, target: Path) -> bool:
    """A user-level install: recorded so, or, for a receipt from before scopes, one in a user root."""
    if r and r.scope:
        return r.scope == "user"
    home = Path(os.path.expanduser("~")).resolve()
    return target.resolve() in {h.user_root(home).resolve() for h in HOSTS.values()}


def report_backup(target: Path, rec, before: int) -> None:
    """Name every file this run copied aside, your instructions file included."""
    new = rec.backups[before:]
    files = [f.relative_to(target / d).as_posix() for d in new for f in sorted((target / d).rglob("*")) if f.is_file()]
    if files:
        print(f"  saved   {len(files)} file(s) of yours under {', '.join(new)} before pstack changed them:")
        for k in files[:8]:
            print(f"            {k}")
        if len(files) > 8:
            print(f"            ... and {len(files) - 8} more")


def kept_for(build, host, user: bool):
    """What an install at this scope keeps: a user-level one leaves out what does not belong in a home."""
    return frozenset(payload_files(build, host, True)) if user else build


def write_failed(e: OSError) -> int:
    print(f"pstack: could not write {e.filename or 'a file'} ({e.strerror or e}).")
    print("  Every file written so far is recorded, and the host profile was not switched.")
    print("  Fix the cause, then run the same command again.")
    return 1


def cmd_init(args) -> int:
    target = Path(args.target).expanduser().resolve()
    host, reason = pick_host(args, target)
    build = get_build(host.key)
    skip_shared = bool(args.user)

    if args.user:
        target = host.user_root(Path(os.path.expanduser("~")))

    print(f"host    {host.key}  ({host.label})")
    print(f"why     {reason}")
    print(f"target  {target}")
    print()

    # The mode block is per project (runtime/sticky-mode.md), so a user-level install skips it.
    p = plan(build, target, host, skip_shared=skip_shared, force=args.force, memory=not args.user)
    prior = Receipt.load(target)
    switching = bool(prior) and prior.host != host.key
    old = HOSTS.get(prior.host) if prior else None
    left = f"the {prior.host} install left" if switching else "this build no longer ships"
    elsewhere = other_user_installs(host, target) if args.user else []

    if args.dry_run:
        print(f"would write {p.total} file(s)")
        if switching:
            print(f"  would save the {prior.host} profile and restore any saved {host.key} profile")
        if prior:
            report_retired(retire(target, old, kept_for(build, host, args.user), current=host, dry_run=True,
                                  user=args.user), left, dry_run=True)
        for root, other, where in elsewhere:
            report_retired(retire(root, other, frozenset(), dry_run=True, user=True), where, dry_run=True)
        for k in p.write[:12]:
            print(f"    {k}")
        if p.total > 12:
            print(f"    ... and {p.total - 12} more")
        if p.backup:
            print(f"  would back up {len(p.backup)} file(s) you wrote or edited before replacing them")
        if p.merge:
            print(f"  {p.merge}: {p.merge_action}")
        if skip_shared:
            print("  would skip docs/ and automations/ (user-level install)")
            if host.memory:
                print(f"  would skip {host.memory}: the mode block is per project")
        return 0

    if not target.exists():
        target.mkdir(parents=True)

    try:
        rec = apply(build, target, host, p, scope="user" if args.user else "project")
    except OSError as e:
        return write_failed(e)
    # The profile moves only once the new host's files are in place.
    notes = switch(target, prior.host, host.key) if prior else []
    print(f"  wrote   {p.total} file(s)")
    for n in notes:
        print(f"  {n}")
    if prior:
        report_retired(retire(target, old, kept_for(build, host, args.user), current=host, user=args.user), left)
    for root, other, where in elsewhere:
        report_retired(retire(root, other, frozenset(), user=True), where)
        if not (Receipt.load(root) or Receipt()).files:
            (root / ".pstack" / "receipt.json").unlink(missing_ok=True)
    report_backup(target, rec, len(prior.backups) if prior else 0)
    if p.merge:
        msg = {"create": "created", "append": "appended to (your content untouched)",
               "keep": "kept (pstack block already present)",
               "repair": "repaired a broken pstack block",
               "replace": "replaced another host's pstack block with this host's",
               "outside": "left alone: it links outside this project"}[p.merge_action]
        print(f"  {p.merge}: {msg}")
    kept = kept_state(p, switching)
    if kept:
        print(f"  kept    {', '.join(kept)}")
    if skip_shared:
        print("  skipped docs/ and automations/ (a user-level install must not merge into ~/docs)")
        if host.memory:
            print(f"  skipped {host.memory}: the mode block is per project. Enter the mode in a project "
                  f"with {host.invoke}poteto-mode")

    inv = host.invoke
    print()
    print(f"Next: open a session in {target} and run {inv}setup-pstack")
    print("Then see what is installed with: pstack list" if args.user else f"Then read {target / 'USAGE.md'}")
    return 0


def cmd_status(args) -> int:
    target = Path(args.target).expanduser().resolve()
    r = Receipt.load(target)
    if r is None:
        print(f"pstack is not installed in {target}")
        print("Run: pstack init")
        return 1

    host = HOSTS.get(r.host)
    print(f"host       {r.host}" + (f"  ({host.label})" if host else ""))
    print(f"version    {r.version}" + ("" if r.version == __version__ else f"   (cli is {__version__})"))
    b = Build.load(r.host)
    if b:
        cur = b.content_id()
        same = (r.content or "?") == cur
        print(f"content    {r.content or 'unrecorded'}" + ("" if same else f"   (this CLI carries {cur}: run pstack update)"))
    print(f"installed  {r.installed}")

    counts = {"ours": 0, "modified": 0, "missing": 0}
    modified = []
    for key in r.files:
        s = r.classify(target, key)
        counts[s] = counts.get(s, 0) + 1
        if s == "modified":
            modified.append(key)
    print(f"files      {counts['ours']} intact, {counts['modified']} modified by you, {counts['missing']} missing")

    active = read_mode(target)
    if user_level(r, target):
        print("mode       per project (this is a user-level install)")
    elif active is not None:
        print(f"mode       {'ON' if active else 'off'}   (pstack {'off' if active else 'on'} to change)")
    hj = target / ".pstack" / "host.json"
    if hj.is_file():
        try:
            d = json.loads(hj.read_text(encoding="utf-8"))
            print(f"tier       {d.get('tier', '?')}  (probed by setup-pstack)")
        except json.JSONDecodeError:
            pass
    elif host:
        print(f"tier       {host.tier}  (build default, run setup-pstack to probe)")
    line = summary(target)
    if line:
        print(f"profile    {line}")
    saved = saved_hosts(target)
    if saved:
        print(f"saved      profiles for {', '.join(saved)}")
    held = sum(1 for d in backup_dirs(target, r) for f in d.rglob("*") if f.is_file())
    if held:
        print(f"backups    {held} file(s) pstack replaced, kept under .pstack/backup-* (uninstall puts them back)")

    if modified:
        print("\nmodified by you, and left alone on update:")
        for k in modified[:10]:
            print(f"  {k}")
        if len(modified) > 10:
            print(f"  ... and {len(modified) - 10} more")
    if r.version != __version__:
        print("\nAn update is available. Run: pstack update")
    return 0


def cmd_update(args) -> int:
    target = Path(args.target).expanduser().resolve()
    r = Receipt.load(target)
    if r is None:
        print(f"pstack is not installed in {target}. Run: pstack init")
        return 1
    if not args.host and r.host not in HOSTS:
        print(f"pstack: the receipt names an unknown host '{r.host}'. Run: pstack init --host <host>")
        return 1
    host = resolve(args.host) if args.host else HOSTS[r.host]
    build = get_build(host.key)

    switching = r.host != host.key
    old = HOSTS.get(r.host)
    left = f"the {r.host} install left" if switching else "this build no longer ships"
    # A user-level root is a home directory: no docs/ or automations/, and no instructions file.
    user = user_level(r, target)
    p = plan(build, target, host, force=args.force, update=True, skip_shared=user, memory=not user)
    keep = kept_for(build, host, user)
    stale = retire(target, old, keep, current=host, dry_run=True, user=user)
    if not (p.write or p.modes or switching
            or any(stale[k] for k in ("removed", "kept", "linked", "missing", "unblocked", "memory"))):
        if p.same and not args.dry_run:
            try:
                apply(build, target, host, p)  # only records files already identical on disk
            except OSError as e:
                return write_failed(e)
        print(f"Already up to date with the pstack build this CLI carries ({build.content_id()}).")
        if p.skip_modified:
            print(f"  {len(p.skip_modified)} file(s) you edited differ from it and stay as they are "
                  "(--force replaces them, after saving a copy).")
        if r.content and r.content != build.content_id():
            print("  (your project records a different build; nothing differs on disk)")
        print("  This CLI ships its own copy of pstack. To pick up newer content, reinstall the")
        print("  package first, then run update again.")
        return 0

    if args.dry_run:
        print(f"would update {p.total} file(s); {len(p.skip_modified)} kept because you edited them")
        if switching:
            print(f"  would save the {r.host} profile and restore any saved {host.key} profile")
        if p.backup:
            print(f"  would back up {len(p.backup)} file(s) you wrote or edited before replacing them")
        report_retired(stale, left, dry_run=True)
        return 0

    try:
        rec = apply(build, target, host, p)
    except OSError as e:
        return write_failed(e)
    notes = switch(target, r.host, host.key)
    if p.total:
        print(f"  updated {p.total} file(s)")
    for n in notes:
        print(f"  {n}")
    gone = retire(target, old, keep, current=host, user=user)
    report_retired(gone, left)
    report_backup(target, rec, len(r.backups))
    if p.skip_modified:
        print(f"  kept    {len(p.skip_modified)} file(s) you edited (use --force to overwrite):")
        for k in p.skip_modified[:8]:
            print(f"            {k}")
    if switching:
        kept = kept_state(p, switching)
        if kept:
            print(f"  kept    {', '.join(kept)}")
    if p.total or gone["removed"] or switching:
        print("  note    a pstack session already running here keeps the files it read; restart it")
    return 0


def cmd_uninstall(args) -> int:
    target = Path(args.target).expanduser().resolve()
    if not args.yes:
        r = Receipt.load(target)
        n = len(r.files) if r else 0
        also = (" and its .pstack/ config, mode state and saved host profiles"
                + (", and the run records in .pstack/runs/" if args.delete_runs else "")) if args.purge else ""
        reply = input(f"Remove {n} pstack file(s){also} from {target}? [y/N] ").strip().lower()
        if reply not in ("y", "yes"):
            print("Cancelled.")
            return 1
    res = remove(target, keep_config=not args.purge, keep_runs=not args.delete_runs)
    if "error" in res:
        print(f"pstack: {res['error']}")
        return 1
    print(f"  removed {len(res['removed'])} file(s)")
    if res["restored"]:
        print(f"  restored {len(res['restored'])} file(s) you had before pstack replaced them")
    if res["kept"]:
        print(f"  kept    {len(res['kept'])} file(s) you had edited")
    if res["linked"]:
        print(f"  left    {len(res['linked'])} file(s) reached through a symlink, outside this project")
    for path, gone in res["unblocked"]:
        print(f"  removed {path}, which pstack created and you had not changed" if gone
              else f"  removed pstack's text from {path}, keeping yours")
    for path in res["memory"]:
        print(f"  note    the pstack block in {path} was edited, so it stays. Delete it by hand if you want it gone.")
    if res["backups_left"]:
        print(f"  kept    {len(res['backups_left'])} backed-up file(s) under .pstack/backup-*. They differ from")
        print("          what is there now, so compare them and delete them yourself.")
    runs = target / ".pstack" / "runs"
    if not args.purge:
        print("  kept    .pstack/ (config, mode state, saved host profiles, run records). --purge removes it.")
    elif runs.is_dir():
        n = sum(1 for _ in runs.glob("*.json"))
        print(f"  kept    .pstack/runs/ ({n} run record(s)). Add --delete-runs to remove them too.")
    return 0


def cmd_on(args) -> int:
    target = Path(args.target).expanduser().resolve()
    r = Receipt.load(target)
    host = HOSTS.get(r.host) if r else None
    # mode.md outlives an uninstall, so the receipt is what says pstack is here.
    if read_mode(target) is None or host is None:
        print(f"pstack is not installed in {target}. Run: pstack init")
        return 1
    if user_level(r, target):
        print(f"{target} holds a user-level install, and the mode is per project.")
        print(f"  Run pstack init in a project, or enter the mode there with {host.invoke}poteto-mode.")
        return 1
    inv = host.invoke if host else "/"
    build = Build.load(host.key) if host else None
    # The block first, so a file that cannot be written leaves the mode as it was.
    try:
        restored = restore_mode_block(build, target, host) if build else None
    except OSError as e:
        print(f"pstack: could not restore the mode block in {host.memory} ({e}).")
        print("  Mode is unchanged. Fix the file, then run pstack on again.")
        return 1
    set_mode(target, True)
    print("pstack mode is ON for this project.")
    if restored == "outside":
        print(f"  left    {host.memory} alone: it links outside this project, so it has no mode block")
    elif restored:
        verb = {"create": "created", "append": "restored the mode block in",
                "repair": "repaired the mode block in"}[restored]
        print(f"  {verb} {host.memory}")
    print("  Engineering turns route through a playbook. Casual questions are untouched.")
    print(f"  It takes effect in your next session, or say {inv}poteto-mode now.")
    print("  Turn it off with: pstack off")
    return 0


def cmd_off(args) -> int:
    target = Path(args.target).expanduser().resolve()
    if read_mode(target) is None:
        print(f"pstack is not installed in {target}. Nothing to turn off.")
        return 1
    r = Receipt.load(target)
    if user_level(r, target):
        print(f"{target} holds a user-level install, and the mode is per project. Turn it off in the project.")
        return 1
    set_mode(target, False)
    print("pstack mode is OFF for this project.")
    print("  The skills are still installed, so you can still invoke one by name.")
    print("  Turn it back on with: pstack on")
    return 0


def cmd_doctor(args) -> int:
    target = Path(args.target).expanduser().resolve()
    problems = []
    r = Receipt.load(target)

    user = user_level(r, target)
    if r is None:
        problems.append(("not installed", "Run: pstack init"))
    else:
        host = HOSTS.get(r.host)
        if host is None:
            problems.append((f"receipt names unknown host '{r.host}'", "Reinstall with: pstack init --host <host>"))
        else:
            if not (target / host.skill_dir).is_dir():
                problems.append((f"skill directory missing: {host.skill_dir}", "Run: pstack update"))
            if host.memory and not user and not (target / host.memory).is_file():
                problems.append((f"instructions file missing: {host.memory}", "Run: pstack update"))
            missing = [k for k in r.files if r.classify(target, k) == "missing"]
            if missing:
                problems.append((f"{len(missing)} installed file(s) have been deleted", "Run: pstack update"))
        if not (target / ".pstack" / "host.json").is_file():
            problems.append(("setup-pstack has not run, so capabilities are build-time guesses",
                             f"Run {HOSTS[r.host].invoke if r.host in HOSTS else '/'}setup-pstack in a session"))

    detected, reason, _ = detect(target, Path(os.path.expanduser("~")))
    own_markers = HOSTS[r.host].markers if r and r.host in HOSTS else ()
    # A user root is a home directory, where every installed host leaves its own config.
    if (r and not user and r.host != detected.key and detected.key != "generic"
            and not any((target / m).exists() for m in own_markers)):
        problems.append((f"installed for '{r.host}' but this project looks like '{detected.key}'",
                         f"If that is wrong: pstack init --host {detected.key}"))

    # A mode block sends every session to its host-binding.md. One left by a host switch, or half
    # deleted by hand, sends it nowhere.
    for h in HOSTS.values():
        mem = target / h.memory if h.memory else None
        if not mem or not mem.is_file():
            continue
        text = mem.read_text(encoding="utf-8", errors="ignore")
        s, e = text.find(MODE_START), text.find(MODE_END)
        if text.count(MODE_START) > 1 or text.count(MODE_END) > 1:
            problems.append((f"{h.memory} has more than one pstack block", "Run: pstack on, which keeps one"))
        elif (s == -1) != (e == -1) or -1 < e < s:
            problems.append((f"the pstack block in {h.memory} is half deleted",
                             "Run: pstack on, or delete the leftover marker"))
        elif -1 < s < e:
            for ref in re.findall(r"`([^`\s]+/host-binding\.md)`", text[s:e]):
                if not (target / ref).is_file():
                    problems.append((f"the pstack block in {h.memory} points at {ref}, which is not installed",
                                     f"Delete the block from {h.memory}, or run: pstack init --host {h.key}"))

    warnings = []
    if r and r.host in HOSTS:
        rep = check_profile(target, r.host)
        fix = f"Correct the file, or rerun {HOSTS[r.host].invoke}setup-pstack in a {HOSTS[r.host].label} session"
        problems += [(e, fix) for e in rep.errors]
        warnings = rep.warnings
    if warnings:
        print(f"{len(warnings)} warning(s):")
        for w in warnings:
            print(f"  - {w}")
        print()

    if not problems:
        print("No problems found.")
        return 0
    print(f"{len(problems)} problem(s):\n")
    for what, fix in problems:
        print(f"  - {what}\n    {fix}")
    return 1


def cmd_serve(args) -> int:
    if args.port is not None and not (0 <= args.port <= 65535):
        print("pstack serve: --port must be between 0 and 65535", file=sys.stderr)
        return 2
    if args.action == "stop":
        from .observe.lifecycle import stop_servers
        return stop_servers(port=args.port)
    from .observe.server import is_loopback, serve
    if not is_loopback(args.bind) and not args.expose:
        print(f"pstack: refusing to bind {args.bind}. The page shows your prompts, code and session "
              "history, so it listens on 127.0.0.1 only. Pass --expose to bind another address anyway.")
        return 2
    return serve(port=7777 if args.port is None else args.port, bind=args.bind, days=args.days, open_browser=args.open)


def cmd_hosts(args) -> int:
    print(f"{'host':<10} {'tier':<5} {'invoke':<8} skills go to")
    for h in HOSTS.values():
        shipped = "  " if h.key in available() else "  (no build shipped)"
        print(f"{h.key:<10} {h.tier:<5} {h.invoke + 'name':<8} {h.skill_dir}{shipped}")
    return 0


def cmd_list(args) -> int:
    m = manifest()
    if not m:
        sys.exit("pstack: no manifest shipped with this package")
    kind = args.kind
    if kind in ("skills", "all"):
        wf = [s for s in m["skills"] if s["kind"] != "principle"]
        print(f"SKILLS ({len(wf)})")
        for s in sorted(wf, key=lambda x: x["dir"]):
            gate = f"  [{', '.join(s['requires'])}]" if s["requires"] else ""
            print(f"  {s['dir']:<30}{gate}")
    if kind in ("playbooks", "all"):
        print(f"\nPLAYBOOKS ({len(m['playbooks'])})")
        for p in m["playbooks"]:
            print(f"  {p['name']:<24} {p['summary'][:60]}")
    if kind in ("principles", "all"):
        pr = [s for s in m["skills"] if s["kind"] == "principle"]
        print(f"\nPRINCIPLES ({len(pr)})")
        print("  " + ", ".join(sorted(s["dir"].replace("principle-", "") for s in pr)))
    if kind in ("agents", "all"):
        print(f"\nDELEGATES ({len(m['agents'])})")
        for a in m["agents"]:
            print(f"  {a['name']:<18} access={a['access']:<6} class={a['class']}")
    return 0


def cmd_show(args) -> int:
    target = Path(args.target).expanduser().resolve()
    r = Receipt.load(target)
    host = HOSTS[r.host] if r and r.host in HOSTS else HOSTS["generic"]
    name = args.name.lstrip("/$")
    cands = [f"{host.skill_dir}/{name}/SKILL.md",
             f"{host.skill_dir}/poteto-mode/playbooks/{name}.md",
             f"{host.skill_dir}/principle-{name}/SKILL.md",
             f"{host.agent_dir}/{name}.md"]

    if r:
        for c in cands:
            p = target / c
            if p.is_file():
                print(p.read_text(encoding="utf-8"))
                return 0
    build = get_build(host.key)
    for c in cands:
        if c in build:
            print(build.read(c).decode("utf-8"))
            return 0
    sys.exit(f"pstack: no skill, playbook, principle or delegate named '{name}'")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        prog="pstack",
        description="Install pstack, a rigor-first agent workflow, into any project.")
    ap.add_argument("--version", action="version", version=f"pstack {__version__}")
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p, target=True):
        if target:
            p.add_argument("--target", default=".", metavar="DIR", help="project directory (default: .)")
        return p

    p = common(sub.add_parser("init", help="install pstack into a project"))
    p.add_argument("--host", help="force a host instead of detecting one")
    p.add_argument("--user", action="store_true", help="install user-wide instead of per project")
    p.add_argument("--force", action="store_true",
                   help="no effect: init always replaces files you edited, after saving a copy under .pstack/backup-*")
    p.add_argument("--dry-run", action="store_true", help="show what would happen, change nothing")
    p.set_defaults(fn=cmd_init)

    p = common(sub.add_parser("status", help="what is installed here"))
    p.set_defaults(fn=cmd_status)

    p = common(sub.add_parser("update", help="refresh to this package's version",
                              description="Refresh this project's workflow files from the build this CLI carries. "
                                          "pstack serve's page ships with the CLI itself: reinstall the CLI to update it."))
    p.add_argument("--host", help="switch host while updating")
    p.add_argument("--force", action="store_true",
                   help="overwrite files you have edited, after saving a copy under .pstack/backup-*")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(fn=cmd_update)

    p = common(sub.add_parser("uninstall", help="remove what pstack installed"))
    p.add_argument("--yes", "-y", action="store_true", help="do not ask")
    p.add_argument("--purge", action="store_true",
                   help="also remove .pstack/: config, mode state, saved host profiles. Run records in .pstack/runs/ "
                        "and any backup that could not go back stay")
    p.add_argument("--delete-runs", action="store_true", help="with --purge, also delete the run records in .pstack/runs/")
    p.set_defaults(fn=cmd_uninstall)

    p = common(sub.add_parser("on", help="turn pstack mode on for this project"))
    p.set_defaults(fn=cmd_on)

    p = common(sub.add_parser("off", help="turn pstack mode off, keeping it installed"))
    p.set_defaults(fn=cmd_off)

    p = common(sub.add_parser("doctor", help="diagnose a broken or partial install"))
    p.set_defaults(fn=cmd_doctor)

    p = sub.add_parser("serve", help="live local view of agent sessions and pstack runs")
    p.add_argument("action", nargs="?", choices=["start", "stop"], default="start",
                   help="start a server (default), or stop this user's running pstack servers")
    p.add_argument("--port", type=int,
                   help="listen port (default 7777; 0 picks a free one); with stop, limit to this port")
    p.add_argument("--bind", default="127.0.0.1", help="address to listen on (default 127.0.0.1)")
    p.add_argument("--expose", action="store_true", help="allow a non-loopback --bind")
    p.add_argument("--days", type=float, default=14, help="show sessions active in the last N days")
    p.add_argument("--open", action="store_true", help="open the page in a browser")
    p.set_defaults(fn=cmd_serve)

    p = sub.add_parser("hosts", help="list supported hosts")
    p.set_defaults(fn=cmd_hosts)

    p = sub.add_parser("list", help="list skills, playbooks, principles, delegates")
    p.add_argument("kind", nargs="?", default="all",
                   choices=["all", "skills", "playbooks", "principles", "agents"])
    p.set_defaults(fn=cmd_list)

    p = common(sub.add_parser("show", help="print a skill, playbook or principle"))
    p.add_argument("name")
    p.set_defaults(fn=cmd_show)

    args = ap.parse_args(argv)
    try:
        return args.fn(args)
    except ReceiptError as e:
        print(f"pstack: {e}.")
        print("  It records what pstack installed, so nothing was changed. Move it aside, then run")
        print("  pstack init to start a fresh record; files you had are backed up before replacement.")
        return 1
    except KeyboardInterrupt:
        print("\nCancelled.")
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
