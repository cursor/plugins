"""Install, update and remove a pstack build.

Three properties this must hold, because the bash installer it replaces did not:
never lose a file the user wrote, never lose the user's pstack state, and be able
to remove exactly what it added.
"""
from __future__ import annotations

import os
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Container, Iterable, List, Optional, Tuple

from . import __version__
from .hosts import HOSTS, Host
from .receipt import Receipt, digest
from .store import Build

MODE_START = "<!-- pstack:mode:start -->"
MODE_END = "<!-- pstack:mode:end -->"
STATE_FILES = ("mode.md", "host.json", "models.md")
EDITS = ("append", "repair", "replace")  # merge actions that change a file you wrote

MODE_TEMPLATE = """active: false
entered: never
playbook: none
tier: unresolved
opt_out_phrase: "pstack off"
"""


@dataclass
class Plan:
    write: List[str] = field(default_factory=list)
    skip_modified: List[str] = field(default_factory=list)
    backup: List[str] = field(default_factory=list)
    same: List[str] = field(default_factory=list)  # already identical on disk, not yet recorded
    modes: List[str] = field(default_factory=list)  # identical, but missing the exec bit it ships with
    merge: Optional[str] = None
    merge_action: str = ""
    state_kept: List[str] = field(default_factory=list)

    @property
    def total(self) -> int:
        return len(self.write)


def payload_files(build: Build, host: Host, skip_shared: bool) -> Iterable[str]:
    """Every file to install, as paths relative to the build root."""
    for rel in build.paths():
        top = rel.split("/", 1)[0]
        if rel == "INSTALL.md":
            continue
        if host.memory and rel == host.memory:
            continue  # merged separately, never overwritten
        # A home directory is no place for a project's docs, guide, or a plugin manifest.
        if skip_shared and (top in host.shared_dirs or rel in ("USAGE.md", "REFERENCE.md") or top == ".claude-plugin"):
            continue
        yield rel


def make_executable(p: Path) -> None:
    m = p.stat().st_mode
    p.chmod(m | ((m & 0o444) >> 2))  # execute wherever it can already be read


def through_link(target: Path, rel: str) -> bool:
    """True when a path runs through a symlink, so deleting it would reach outside the project."""
    p = target
    for part in Path(rel).parts:
        p = p / part
        if p.is_symlink():
            return True
    return False


def inside(target: Path, rel: str) -> bool:
    """True when a path resolves inside the project, following any symlink on the way."""
    try:
        return (target / rel).resolve().is_relative_to(target.resolve())
    except OSError:
        return False


def atomic_write(p: Path, data: bytes, keep_mode: bool = False) -> None:
    """Replace a file whole, through a temp file beside its real path, so a crash leaves the old
    one. A symlink stays a symlink: its target is what gets replaced."""
    real = p.resolve()
    real.parent.mkdir(parents=True, exist_ok=True)
    tmp = real.with_name(f".{real.name}.pstack-{os.getpid()}.tmp")
    try:
        try:
            tmp.write_bytes(data)
        except PermissionError:
            # A folder you may not write in can hold a file you may. Write that file in place; a
            # file of yours was backed up before pstack got here.
            if not (real.is_file() and os.access(real, os.W_OK)):
                raise
            real.write_bytes(data)
            return
        if keep_mode and real.exists():
            shutil.copymode(real, tmp)
        os.replace(tmp, real)
    finally:
        tmp.unlink(missing_ok=True)


# Your instructions file is read and written as it stands: newline="" keeps CRLF, and
# surrogateescape round-trips bytes that are not UTF-8.
def read_memory(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="surrogateescape", newline="")


def write_memory(p: Path, text: str) -> None:
    atomic_write(p, text.encode("utf-8", "surrogateescape"), keep_mode=True)


def newline(text: str) -> str:
    return "\r\n" if "\r\n" in text else "\n"


def mode_block(text: str) -> str:
    return text[text.index(MODE_START):text.index(MODE_END) + len(MODE_END)]


def merge_action(target: Path, host: Host) -> str:
    dst = target / host.memory
    if not inside(target, host.memory):
        return "outside"  # a link out of the project: pstack writes nothing there
    if not dst.exists():
        return "create"
    text = read_memory(dst)
    starts, ends = text.count(MODE_START), text.count(MODE_END)
    if not starts and not ends:
        return "append"
    if starts != 1 or ends != 1 or text.find(MODE_END) < text.find(MODE_START):
        return "repair"
    # A block written for another host, say through CLAUDE.md linked to AGENTS.md, would send this
    # host's sessions to the other host's runtime. The path is matched whole: Cursor's is a tail of
    # Claude Code's.
    return "keep" if f"`{host.runtime_dir}/host-binding.md`" in mode_block(text) else "replace"


def cut(text: str, piece: str, *, legacy: bool = False) -> Optional[str]:
    """`text` without one copy of pstack's inserted `piece`, byte for byte. A piece an older CLI
    inserted was never recorded, so `legacy` also takes the blank line it put before it."""
    lf = piece.replace("\r\n", "\n")
    # Line endings can change after the fact, say under git's autocrlf.
    for p in dict.fromkeys((piece, lf, lf.replace("\n", "\r\n"))):
        nl = "\r\n" if "\r\n" in p else "\n"
        for sep in ((nl + nl, nl, "") if legacy else ("",)):
            i = text.find(sep + p)
            if i == -1:
                continue
            left = text[:i] + text[i + len(sep + p):]
            # The older CLI also stripped your trailing newlines; give the last line one back.
            return left + nl if legacy and left and not left.endswith("\n") else left
    return None


def unbreak(text: str, block: str) -> str:
    """Drop every pstack block, and what is left of a broken one: the canonical text beside a
    surviving marker, stray markers, and an orphaned copy of the body."""
    block = block.replace("\n", newline(text))
    inner = block[len(MODE_START):-len(MODE_END)]
    for piece in (block, MODE_START + inner, inner + MODE_END, MODE_START, MODE_END, inner.strip("\r\n")):
        text = text.replace(piece, "")
    return text


def merge_memory(build: Build, target: Path, host: Host, action: str, block_only: bool = False) -> str:
    """Write pstack's text into the instructions file, and return exactly what it inserted."""
    d = target / host.memory
    text = build.read(host.memory).decode("utf-8")
    if action == "create":
        write_memory(d, text)
        return text
    mine = read_memory(d)
    nl = newline(mine)
    block = mode_block(text).replace("\n", nl)
    if action == "replace":
        write_memory(d, mine.replace(mode_block(mine), block, 1))
        return block
    if action == "repair":
        mine, block_only = unbreak(mine, mode_block(text)), True
    add = block + nl if block_only else text.replace("\n", nl)
    # Append after your content as it stands, with one blank line between.
    sep = "" if not mine or mine.endswith(nl + nl) else nl if mine.endswith(nl) else nl + nl
    write_memory(d, mine + sep + add)
    return sep + add


def backup_dirs(target: Path, receipt: Receipt) -> List[Path]:
    """pstack's backup directories, newest first. Only direct children of .pstack/ named backup-*
    count, so a doctored receipt cannot point this at the project or outside it."""
    base = target / ".pstack"
    if not base.is_dir() or base.is_symlink():
        return []
    named = {base / Path(b).name for b in receipt.backups} | set(base.glob("backup-*"))
    found = [d for d in named if d.name.startswith("backup-") and d.is_dir() and not d.is_symlink()]
    return sorted(found, key=lambda d: d.name, reverse=True)


def backup(target: Path, receipt: Receipt, keys: Iterable[str]) -> Optional[str]:
    """Copy files into a new .pstack/backup-* directory before pstack replaces or edits them."""
    dirs = backup_dirs(target, receipt)

    def saved(key: str) -> bool:
        # Its latest backup already holds it as it stands, and another copy would only pile up.
        last = next((d / key for d in dirs if (d / key).is_file()), None)
        return last is not None and digest(last) == digest(target / key)

    keys = [k for k in keys if (target / k).is_file() and not saved(k)]
    if not keys:
        return None
    base = target / ".pstack"
    base.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    n = 1
    while True:
        # Never reuse a directory: an earlier backup in the same second would be overwritten.
        root = base / (f"backup-{stamp}" if n == 1 else f"backup-{stamp}-{n:03d}")
        try:
            root.mkdir()
            break
        except FileExistsError:
            n += 1
    for key in keys:
        b = root / key
        b.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target / key, b)
    rel = root.relative_to(target).as_posix()
    receipt.backups.append(rel)
    return rel


def plan(build: Build, target: Path, host: Host, *, skip_shared: bool = False,
         force: bool = False, update: bool = False, memory: bool = True) -> Plan:
    prior = Receipt.load(target)
    out = Plan()

    for key in payload_files(build, host, skip_shared):
        dst = target / key
        if not dst.exists():
            out.write.append(key)
            continue
        if dst.is_file() and digest(dst) == build.sha(key):
            if not prior or prior.files.get(key) != build.sha(key):
                out.same.append(key)
            if build.executable(key) and not os.access(dst, os.X_OK):
                out.modes.append(key)  # an older CLI installed it without one
            continue

        state = prior.classify(target, key) if prior else "foreign"
        if state == "modified" and update and not force:
            out.skip_modified.append(key)
            continue
        # A file you wrote or edited is never replaced without a copy.
        if state in ("foreign", "modified"):
            out.backup.append(key)
        out.write.append(key)

    if memory and host.memory and host.memory in build:
        out.merge, out.merge_action = host.memory, merge_action(target, host)

    for name in STATE_FILES:
        if (target / ".pstack" / name).is_file():
            out.state_kept.append(f".pstack/{name}")
    return out


def record_merge(receipt: Receipt, memory: str, action: str, piece: str, block: Optional[str] = None) -> None:
    receipt.merged[memory] = "create" if action == "create" else receipt.merged.get(memory, "append")
    earlier = [] if action == "create" else receipt.inserted.get(memory, [])
    # Repair took the broken block out of what pstack had written, so the record loses it too.
    if action == "repair" and block:
        earlier = [q for q in (unbreak(p, block) for p in earlier) if q]
    receipt.inserted[memory] = earlier + [piece]


def ours_only(target: Path, receipt: Receipt, memory: str, block: Optional[str] = None) -> bool:
    """The file holds nothing but text pstack inserted, so a copy of it would save nothing of yours.
    With `block`, a broken copy of that block counts as pstack's text too."""
    mem = target / memory
    if not mem.is_file():
        return False
    real, left = mem.resolve(), read_memory(mem)
    if block:
        left = unbreak(left, block)
    for key, pieces in receipt.inserted.items():
        if (target / key).resolve() == real:
            for piece in reversed([unbreak(p, block) for p in pieces] if block else pieces):
                rest = cut(left, piece)
                left = left if rest is None else rest  # "" is a whole file cut, not a miss
    return not left.strip()


def apply(build: Build, target: Path, host: Host, p: Plan, scope: Optional[str] = None) -> Receipt:
    """Carry out a plan. The receipt is saved even when a write fails, with every file written so
    far, so a retry and uninstall both know them."""
    receipt = Receipt.load(target) or Receipt()
    receipt.scope = scope or receipt.scope
    written = set()
    try:
        block = mode_block(build.read(host.memory).decode("utf-8")) if p.merge else None
        broken = block if p.merge_action == "repair" else None
        edit = p.merge_action in EDITS and not ours_only(target, receipt, host.memory, broken)
        backup(target, receipt, list(p.backup) + ([host.memory] if edit else []))
        yours = set(p.backup)
        for key in p.same:
            receipt.files[key] = build.sha(key)
        for key in p.modes:
            make_executable(target / key)
        for key in p.write:
            # A file of yours that this replaces keeps its permissions, 0600 say. pstack's own get
            # the exec bit they ship with, which the store records apart from the bytes.
            atomic_write(target / key, build.read(key), keep_mode=key in yours)
            if build.executable(key) and key not in yours:
                make_executable(target / key)
            receipt.files[key] = build.sha(key)
            written.add(key)
        if p.merge and p.merge_action in ("create",) + EDITS:
            record_merge(receipt, host.memory, p.merge_action,
                         merge_memory(build, target, host, p.merge_action), block)
        mode = target / ".pstack" / "mode.md"
        if not mode.is_file():
            mode.parent.mkdir(parents=True, exist_ok=True)
            mode.write_text(MODE_TEMPLATE, encoding="utf-8")
        receipt.version, receipt.host = __version__, host.key
        receipt.content = build.content_id()
        receipt.installed = datetime.now().astimezone().isoformat(timespec="seconds")
    finally:
        receipt.host = receipt.host or host.key
        receipt.reported = [k for k in receipt.reported if k not in written]
        receipt.save(target)
    return receipt


def read_mode(target: Path) -> Optional[bool]:
    """True, False, or None when pstack is not installed here."""
    p = target / ".pstack" / "mode.md"
    if not p.is_file():
        return None
    for line in p.read_text(encoding="utf-8").splitlines():
        if line.startswith("active:"):
            return line.split(":", 1)[1].strip().lower() == "true"
    return False


def set_mode(target: Path, on: bool, playbook: str = "none") -> bool:
    """Flip the sticky mode. Returns False when pstack is not installed here."""
    p = target / ".pstack" / "mode.md"
    if not p.is_file():
        return False
    stamp = datetime.now().astimezone().isoformat(timespec="seconds") if on else "never"
    lines = []
    for line in p.read_text(encoding="utf-8").splitlines():
        if line.startswith("active:"):
            line = f"active: {'true' if on else 'false'}"
        elif line.startswith("entered:"):
            line = f"entered: {stamp}"
        elif line.startswith("playbook:"):
            line = f"playbook: {playbook if on else 'none'}"
        lines.append(line)
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return True


def restore_mode_block(build: Build, target: Path, host: Host) -> Optional[str]:
    """Put the mode block back in the instructions file. Returns what it did, or None."""
    if not host.memory or host.memory not in build:
        return None
    action = merge_action(target, host)
    if action in ("keep", "outside"):
        return None if action == "keep" else action
    receipt = Receipt.load(target) or Receipt(host=host.key)
    block = mode_block(build.read(host.memory).decode("utf-8"))
    if action in EDITS and not ours_only(target, receipt, host.memory, block if action == "repair" else None):
        backup(target, receipt, [host.memory])
    # The rest of pstack's section may still be there, so add the block alone.
    record_merge(receipt, host.memory, action, merge_memory(build, target, host, action, block_only=True), block)
    receipt.save(target)
    return action


def prune_dirs(target: Path, removed: Iterable[str]) -> None:
    for d in sorted({Path(k).parent for k in removed}, key=lambda x: len(x.parts), reverse=True):
        cur = target / d
        while cur != target and not cur.is_symlink() and cur.is_dir() and not any(cur.iterdir()):
            cur.rmdir()
            cur = cur.parent


def legacy_pieces(host_key: str, memory: str) -> List[str]:
    """What a CLI that did not record its insertions put in: this build's text, as the best guess."""
    b = Build.load(host_key) if host_key else None
    if not b or memory not in b:
        return []
    full = b.read(memory).decode("utf-8")
    return [full, mode_block(full)]


def strip_memory(target: Path, receipt: Receipt, memory: str, host_key: str, *,
                 dry_run: bool = False) -> Optional[Tuple[str, object]]:
    """Take pstack's inserted text back out of an instructions file, byte for byte.

    Returns ("unblocked", (path, deleted)), ("memory", path) when the block was edited and stays,
    or None when there is nothing of pstack's there.
    """
    mem = target / memory
    if not mem.is_file() or not inside(target, memory):
        return None
    text = read_memory(mem)
    recorded = receipt.inserted.get(memory)
    left = text
    for piece in (list(reversed(recorded)) if recorded else legacy_pieces(host_key, memory)):
        rest = cut(left, piece, legacy=not recorded)
        if rest is not None:
            left = rest
            if not recorded:
                break  # the whole text, or else its block; never both
    # You edited pstack's section outside the block: the section is yours now, the block still ours.
    for block in {mode_block(p) for p in recorded or () if MODE_START in p and MODE_END in p}:
        if left == text:
            rest = cut(left, block)
            left = left if rest is None else rest
    if left == text:
        return ("memory", memory) if MODE_START in text or MODE_END in text else None
    gone = not left.strip() and receipt.merged.get(memory) == "create"
    real = mem.resolve()
    if not dry_run:
        # Delete the file pstack created, never a link you made to it.
        real.unlink() if gone else write_memory(mem, left)
        receipt.merged.pop(memory, None)
        receipt.inserted.pop(memory, None)
    return ("unblocked", (real.relative_to(target.resolve()).as_posix() if gone else memory, gone))


def adopt(target: Path, receipt: Receipt, old_mem: str, new_mem: str, build: Build) -> None:
    """One instructions file serves both hosts through a link, and the new host's block replaced the
    old one inside the old host's section. Make that section the new host's, so the old host's prose
    does not linger and a later uninstall finds text it recorded."""
    mem, now = target / new_mem, receipt.inserted.get(new_mem, [])
    if not mem.is_file() or not now or MODE_START not in now[-1] or new_mem not in build:
        return
    block = mode_block(now[-1])
    text = read_memory(mem)
    full = build.read(new_mem).decode("utf-8").replace("\n", newline(text))
    pieces = []
    for p in receipt.inserted.pop(old_mem, []):
        q = p.replace(mode_block(p), block) if MODE_START in p and MODE_END in p else p
        if q in text and not q.lstrip("\r\n").startswith(MODE_START):
            sep = q[:len(q) - len(q.lstrip("\r\n"))]
            text = text.replace(q, sep + full, 1)
            q = sep + full
        pieces.append(q)
    receipt.inserted[new_mem] = pieces if any(block in q for q in pieces) else pieces + now
    if old_mem in receipt.merged:
        receipt.merged[new_mem] = receipt.merged.pop(old_mem)
    write_memory(mem, text)


def put_back(target: Path, dirs: List[Path], key: str) -> bool:
    """Move the newest backup of `key` back to its path, when the path is free and pstack would
    not be writing through a link to get there."""
    dst = target / key
    if dst.exists() or through_link(target, key):  # a link at the path itself counts too
        return False
    for d in dirs:
        f = d / key
        if f.is_file() and not f.is_symlink():
            try:
                dst.parent.mkdir(parents=True, exist_ok=True)
                os.replace(f, dst)
            except OSError:
                return False
            return True
    return False


def prune_backups(target: Path, receipt: Receipt, dirs: List[Path]) -> None:
    for d in (d for d in dirs if d.is_dir()):
        subs = sorted((p for p in d.rglob("*") if p.is_dir() and not p.is_symlink()),
                      key=lambda x: len(x.parts), reverse=True)
        for sub in subs:
            if not any(sub.iterdir()):
                sub.rmdir()
        if not any(d.iterdir()):
            d.rmdir()
    receipt.backups = [b for b in receipt.backups if (target / b).is_dir()]


def alias(target: Path, key: str, twin: Optional[str]) -> bool:
    """On a case-insensitive disk a case-only rename leaves both names on one file."""
    return twin is not None and (target / twin).exists() and os.path.samefile(target / key, target / twin)


def retire(target: Path, old: Optional[Host], new: Container[str], *, current: Optional[Host] = None,
           dry_run: bool = False, user: bool = False) -> dict:
    """Remove what an earlier install left that `new` does not ship: the old host's files after a
    switch, or a dropped skill's after an update. An empty `new` retires a whole install.

    Only a file the receipt recorded, that still hashes as written, and that is not reached through
    a symlink goes, and a file of yours that it had replaced comes back. A file you edited stays.
    From the old host's instructions file only the text pstack inserted goes, and the file itself
    only if pstack created it and nothing else is left.
    """
    res = {"removed": [], "kept": [], "linked": [], "missing": [], "restored": [],
           "unblocked": None, "memory": None}
    receipt = Receipt.load(target)
    if receipt is None:
        return res
    fold = {k.casefold(): k for k in getattr(new, "paths", lambda: new)()}
    dirs = backup_dirs(target, receipt)
    try:
        for key in sorted(k for k in receipt.files if k not in new):
            if through_link(target, key):
                res["linked"].append(key)
            else:
                state = receipt.classify(target, key)
                if state == "modified":
                    # Reported once. It stays recorded, so pstack still knows you edited it: update
                    # leaves it alone and init backs it up before replacing it.
                    if key not in receipt.reported:
                        res["kept"].append(key)
                        if not dry_run:
                            receipt.reported.append(key)
                    continue
                if state == "missing":
                    res["missing"].append(key)
                if state == "ours" and not alias(target, key, fold.get(key.casefold())):
                    res["removed"].append(key)
                    if dry_run:
                        if any((d / key).is_file() for d in dirs):
                            res["restored"].append(key)
                    else:
                        (target / key).unlink()
                        # What pstack replaced here goes back, as uninstall would put it back.
                        if put_back(target, dirs, key):
                            res["restored"].append(key)
            if not dry_run:
                del receipt.files[key]
                if key in receipt.reported:
                    receipt.reported.remove(key)

        # A user-level install never wrote the home directory's instructions file, so it takes
        # nothing out of it: a block there is one you put there.
        if old and old.memory and old.memory not in new and not user:
            # One instructions file linked to the other now carries the current host's block.
            shared = bool(current and current.memory
                          and (target / old.memory).resolve() == (target / current.memory).resolve())
            if shared:
                if not dry_run and isinstance(new, Build):
                    adopt(target, receipt, old.memory, current.memory, new)
            else:
                hit = strip_memory(target, receipt, old.memory, old.key, dry_run=dry_run)
                if hit:
                    res[hit[0]] = hit[1]
    finally:
        if not dry_run:
            prune_dirs(target, res["removed"])
            prune_backups(target, receipt, dirs)
            receipt.save(target)
    return res


def pstack_free(text: str) -> str:
    """`text` without any host's pstack section: what a copy made before a host switch looks like
    once the section it held for the old host is set aside."""
    for h in HOSTS.values():
        for piece in legacy_pieces(h.key, h.memory or ""):
            rest = cut(text, piece, legacy=True)
            if rest is not None:
                text = rest
                break
    return text


def settle_backups(target: Path, receipt: Receipt) -> Tuple[List[str], List[Path]]:
    """Put back what pstack's backups hold, newest first, wherever the path is free again. A copy
    identical to what is there now is redundant and goes. Anything else stays, to be reported."""
    dirs = backup_dirs(target, receipt)
    restored, left = [], []
    for d in dirs:
        for f in sorted(p for p in d.rglob("*") if p.is_file() and not p.is_symlink()):
            key = f.relative_to(d).as_posix()
            dst = target / key
            # through_link checks the file itself too, so a dangling link you put there stays.
            if not dst.exists() and not through_link(target, key):
                try:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    os.replace(f, dst)
                    restored.append(key)
                except OSError:
                    left.append(f)  # a parent path became a file, say
            elif dst.is_file() and (digest(dst) == digest(f) or (
                    key in {h.memory for h in HOSTS.values()} and pstack_free(read_memory(f)) == read_memory(dst))):
                f.unlink()  # redundant: what is there now, give or take a section pstack wrote
            else:
                left.append(f)
    prune_backups(target, receipt, dirs)
    return restored, left


def remove(target: Path, *, keep_config: bool = True, keep_runs: bool = True) -> dict:
    """Remove exactly what we installed, and put back what it replaced. A file you edited stays."""
    receipt = Receipt.load(target)
    if receipt is None:
        return {"error": "no receipt: nothing here was installed by pstack"}

    removed, kept, absent, linked = [], [], [], []
    for key in sorted(receipt.files):
        if through_link(target, key):
            linked.append(key)
            continue
        state = receipt.classify(target, key)
        if state == "missing":
            absent.append(key)
        elif state == "modified":
            kept.append(key)
        else:
            (target / key).unlink()
            removed.append(key)

    prune_dirs(target, removed)

    unblocked, notes = [], []
    for mem in sorted(set(receipt.merged) | set(receipt.inserted)):
        hit = strip_memory(target, receipt, mem, receipt.host)
        if hit:
            (unblocked if hit[0] == "unblocked" else notes).append(hit[1])

    restored, left = settle_backups(target, receipt)
    pst = target / ".pstack"
    if not keep_config and pst.is_dir():
        # A backup that could not go back is the only copy of something you had. It stays.
        keep = {f.relative_to(pst).parts[0] for f in left} | ({"runs"} if keep_runs else set())
        for child in pst.iterdir():
            if child.name in keep:
                continue
            shutil.rmtree(child) if child.is_dir() and not child.is_symlink() else child.unlink()
        if not any(pst.iterdir()):
            pst.rmdir()
    else:
        (pst / "receipt.json").unlink(missing_ok=True)

    return {"removed": removed, "kept": kept, "absent": absent, "linked": linked, "unblocked": unblocked,
            "memory": notes, "restored": restored, "backups_left": left}
