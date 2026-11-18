#!/usr/bin/env bash
# await.sh — harness-neutral async wait for long-running background agents.
#
# Runs a blocking wait command (e.g. the control plane's `agent wait`) as a
# detached process and records its completion as a sentinel file. The
# orchestrator gets its turn back immediately instead of being pinned inside a
# blocking call.
#
# This script knows nothing about any specific agent CLI, control plane, or
# harness. The wait command is passed after `--` and never inspected. The
# sentinel-file contract it produces is documented in adapters/README.md;
# harness adapters consume that contract to turn polling into a push.
#
# Usage:
#   await.sh arm   --dir <abs task-dir> --slot <name> [--timeout-s N] [--force]
#                  [--meta key=value ...] [--artifact <path>]
#                  [--fresh <path> [--stamp <path>] [--grace-s N] [--grace-checks N]]
#                  -- <wait cmd...>
#   await.sh poll  --dir <task-dir> [--slot <name>] [--stall-s N]
#   await.sh join  --dir <task-dir> [--all] [--timeout-s N] [--interval-s N]
#   await.sh clear --dir <task-dir> [--slot <name>]
#
# arm is idempotent per slot: a live slot prints ALREADY_ARMED, a settled one
# prints ALREADY_SETTLED, and neither starts the wait command again (the wait
# command may submit the prompt, so running it twice would dispatch twice).
# --force, or `clear` first, re-arms a slot; a new round should use a new slot.
#
# Exit codes: 0 ok / hit, 1 nothing settled, 2 join timed out, 64 usage error.
# Sentinel rc: 0 settled, 124 the deadline hit (timeout(1)'s code — "the wait
# failed", never "the agent succeeded"), 3 the wait command said settled but
# --fresh did not advance (the dispatch is incomplete), other = the wait
# command's own failure.
#
# Every arm has a deadline: --timeout-s defaults to 1800. An unbounded wait is
# a wait nobody is monitoring.
#
# --meta key=value lines are copied verbatim into .armed and .settled, so a
# sentinel says what it was for (slot/agent/model/cwd/purpose) without the
# orchestrator having to remember. --artifact names the file or directory the
# agent is expected to write; `poll` reports its age and prints STALLED when
# nothing has changed for --stall-s (default 180). STALLED means "check the
# agent's live state now", not "the agent is dead".
#
# --fresh is an optional diagnostic, not the completion criterion: the wait
# command's settled state is (human decision 2026-09-22). With --fresh the
# sentinel says rc=0 only if <path> is also newer than the stamp; otherwise,
# after --grace-checks re-checks --grace-s apart (defaults 3 x 120s), rc=3.
# It answers "the state says stopped, but was the promised file written?"
# (observed 2026-09-21: a writer parked on someone else's `brew upgrade` read
# as idle). It is not the default because an rc=3 ends the wait: an agent that
# was still working then finishes with nobody watching. Without --stamp the
# stamp is the moment of arming.

set -uo pipefail

SELF_NAME=await.sh

die() { printf '%s: %s\n' "$SELF_NAME" "$*" >&2; exit 64; }
now() { date +%s; }
iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }

waits_dir() { printf '%s/waits' "$1"; }

# `--dir "$TASK"` arrives with the variable unexpanded only when the caller's
# shell did not have it (or the value was single-quoted). This script would then
# happily create `<cwd>/$TASK/waits` and write sentinels there while the pi
# adapter watched a path derived from the same literal text — or the reverse —
# and the settle was never announced (observed 2026-09-28 in
# tasks/2026-09-28-android-keyboard-list-diagnosis). Refuse the guess. A real
# directory whose name contains `$` still works: the check only fires when the
# path does not exist.
guard_dir() { # guard_dir <command> <dir>
  case "$2" in
    *'$'*|*'`'*)
      [ -d "$2" ] || die "$1: --dir '$2' still contains shell syntax and does not exist - pass a literal absolute path; the push adapter and this script must name the same directory" ;;
  esac
  return 0
}

# mtime of a file, or of the newest file under a directory; empty if absent.
newest_mtime() {
  local p="$1" f m best=""
  [ -e "$p" ] || return 1
  if [ -d "$p" ]; then
    while IFS= read -r f; do
      m="$(file_mtime "$f")" || continue
      [ -z "$best" ] || [ "$m" -gt "$best" ] && best="$m"
    done < <(find "$p" -type f -not -name '.*' 2>/dev/null)
    [ -n "$best" ] || return 1
    printf '%s' "$best"
  else
    file_mtime "$p"
  fi
}
# True only when the process does not exist (ESRCH). A sandboxed caller gets
# EPERM from kill -0 for a live process outside its sandbox (live 2026-11-10:
# a non-escalated Codex join printed LOST for a live runner); that is alive.
pid_gone() { # pid_gone <pid>
  local err
  err="$(LC_ALL=C kill -0 "$1" 2>&1)" && return 1
  case "$err" in *"No such process"*) return 0 ;; esac
  return 1
}

file_mtime() {
  stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null
}

# ---------------------------------------------------------------- arm

cmd_arm() {
  local dir="" slot="" timeout_s=1800 force=0 artifact=""
  local fresh="" stamp="" grace_s=120 grace_checks=3
  local -a metas=()
  while [ $# -gt 0 ]; do
    case "$1" in
      --dir) dir="${2:-}"; shift 2 ;;
      --slot) slot="${2:-}"; shift 2 ;;
      --timeout-s) timeout_s="${2:-}"; shift 2 ;;
      --force) force=1; shift ;;
      --artifact) artifact="${2:-}"; shift 2 ;;
      --fresh) fresh="${2:-}"; shift 2 ;;
      --stamp) stamp="${2:-}"; shift 2 ;;
      --grace-s) grace_s="${2:-}"; shift 2 ;;
      --grace-checks) grace_checks="${2:-}"; shift 2 ;;
      --meta)
        case "${2:-}" in
          *=*) metas+=("$2") ;;
          *) die "arm: --meta expects key=value" ;;
        esac
        case "${2%%=*}" in *[!A-Za-z0-9_.-]*|"") die "arm: --meta key must match [A-Za-z0-9_.-]+" ;; esac
        shift 2 ;;
      --) shift; break ;;
      *) die "arm: unexpected argument '$1'" ;;
    esac
  done
  [ -n "$dir" ] || die "arm: --dir is required"
  # The push adapter reads --dir from the command text before the shell runs
  # it, so the text must already be the path: a relative path resolves against
  # whatever directory each side happens to be in.
  case "$dir" in /*) ;; *) die "arm: --dir '$dir' must be a literal absolute path" ;; esac
  guard_dir arm "$dir"
  [ -n "$slot" ] || die "arm: --slot is required"
  [ $# -gt 0 ] || die "arm: a wait command is required after --"
  # An await.sh option written after `--` is silently handed to the wait
  # command, and the arm runs without it (observed 2026-09-27: `--timeout-s
  # 3600` inside the `sh -c` string of a wait command). Checked inside every
  # argument, because a shell-string wait command carries it as a substring.
  local a opt
  for a in "$@"; do
    for opt in --timeout-s --fresh --stamp --meta --artifact --grace-s --grace-checks; do
      case " $a " in
        *[[:space:]]"$opt"[[:space:]=]*) die "arm: '$opt' appears after -- inside the wait command; await.sh options go before --" ;;
      esac
    done
  done
  case "$slot" in *[!A-Za-z0-9_.-]*) die "arm: --slot must match [A-Za-z0-9_.-]+" ;; esac
  case "$grace_s" in ''|*[!0-9]*) die "arm: --grace-s must be a non-negative integer" ;; esac
  case "$grace_checks" in ''|*[!0-9]*) die "arm: --grace-checks must be a non-negative integer" ;; esac
  if [ -n "$stamp" ] && [ ! -e "$stamp" ]; then die "arm: --stamp '$stamp' does not exist"; fi
  if [ -n "$fresh" ] && [ -d "$fresh" ]; then die "arm: --fresh must name a file, not a directory"; fi

  local wd; wd="$(waits_dir "$dir")"
  mkdir -p "$wd" || die "arm: cannot create $wd"

  local settled="$wd/$slot.settled"
  local armed="$wd/$slot.armed"
  if [ "$force" -eq 0 ]; then
    # Re-running the same arm must never run the wait command again: when it
    # submits the prompt, a second run dispatches the same work twice. It is
    # also how a session re-establishes a lost watch, so it reports instead.
    if [ -f "$settled" ]; then
      printf 'ALREADY_SETTLED %s rc=%s sentinel=%s output=%s\n' "$slot" \
        "$(sed -n 's/^rc=//p' "$settled")" "$settled" "$wd/$slot.out"
      printf '  read the output now; a new round needs a new --slot (or clear first)\n'
      return 0
    fi
    if [ -f "$armed" ]; then
      local prev_pid; prev_pid="$(sed -n 's/^pid=//p' "$armed" 2>/dev/null)"
      if [ -n "$prev_pid" ] && ! pid_gone "$prev_pid"; then
        printf 'ALREADY_ARMED %s pid=%s sentinel=%s\n' "$slot" "$prev_pid" "$settled"
        return 0
      fi
    fi
  fi
  rm -f "$settled" "$wd/$slot.out" "$wd/.$slot.cancelled" "$wd/.$slot.child"

  local started; started="$(now)"
  local child_file="$wd/.$slot.child"

  # The composite gate needs a stamp to compare against; without --stamp the
  # moment of arming is the stamp (an empty file whose mtime is now).
  local stamp_path=""
  if [ -n "$fresh" ]; then
    if [ -n "$stamp" ]; then
      stamp_path="$stamp"
    else
      stamp_path="$wd/.$slot.stamp"
      : > "$stamp_path"
    fi
  fi

  # The command the runner actually watches: the caller's wait command, or —
  # with --fresh — a small gate that requires the artifact to advance as well.
  local -a wait_cmd=("$@")
  local -a child_cmd=("$@")
  if [ -n "$fresh" ]; then
    local gate="$wd/.$slot.gate.sh"
    {
      printf '#!/bin/sh\n'
      printf '# generated by %s: settle = wait command settled AND --fresh advanced\n' "$SELF_NAME"
      printf 'ART=%s\n' "$(printf '%q' "$fresh")"
      printf 'STAMP=%s\n' "$(printf '%q' "$stamp_path")"
      printf 'GRACE_S=%s\n' "$grace_s"
      printf 'GRACE_CHECKS=%s\n' "$grace_checks"
      printf 'cpid=\n'
      # The runner's watchdog kills this gate at the deadline; without the trap
      # the gate's own child (the wait command) would be left behind.
      printf 'trap '\''kill "${cpid:-}" 2>/dev/null'\'' TERM INT\n'
      printf 'fresh() { [ -f "$ART" ] && [ "$ART" -nt "$STAMP" ]; }\n'
      printf 'run_wait() {\n'
      printf '  %q' "${wait_cmd[0]}"
      local i
      for ((i = 1; i < ${#wait_cmd[@]}; i++)); do printf ' %q' "${wait_cmd[i]}"; done
      printf ' &\n'
      printf '  cpid=$!\n'
      printf '  wait "$cpid"\n'
      printf '  return $?\n'
      printf '}\n'
      printf 'while :; do\n'
      printf '  run_wait\n'
      printf '  rc=$?\n'
      printf '  [ "$rc" -ne 0 ] && exit "$rc"\n'
      printf '  fresh && exit 0\n'
      printf '  i=1\n'
      printf '  while [ "$i" -le "$GRACE_CHECKS" ]; do\n'
      printf '    sleep "$GRACE_S"\n'
      printf '    fresh && exit 0\n'
      printf '    i=$((i + 1))\n'
      printf '  done\n'
      printf '  exit 3\n'
      printf 'done\n'
    } > "$gate" || die "arm: cannot write gate"
    chmod +x "$gate"
    child_cmd=(/bin/sh "$gate")
  fi

  # Serialize the command into a runner script rather than re-quoting it through
  # `sh -c`. Hand-written nohup one-liners are where the quoting bugs live.
  local runner="$wd/.$slot.runner.sh"
  {
    printf '#!/bin/sh\n'
    printf 'started=%s\n' "$started"
    printf 'out=%s\n' "$(printf '%q' "$wd/$slot.out")"
    # $$ expands in the runner, not here: two runners on the same slot must
    # never share a temp path, or one renames the other's half-written file.
    printf 'tmp=%s.$$.settled.tmp\n' "$(printf '%q' "$wd/.$slot")"
    printf 'final=%s\n' "$(printf '%q' "$settled")"
    printf 'child=%s\n' "$(printf '%q' "$child_file")"
    printf 'exec >"$out" 2>&1\n'
    printf 'set +e\n'
    # Tells herdr-agent.py run/start they were launched by an arm, so a
    # sentinel will record the agent's completion; outside an arm they refuse.
    printf 'SOP_AWAIT_SLOT=%s SOP_AWAIT_DIR=%s; export SOP_AWAIT_SLOT SOP_AWAIT_DIR\n' "$slot" "$(printf '%q' "$dir")"
    # The wait command runs as a child; a watchdog kills it at the deadline.
    # Done here rather than via timeout(1) so the deadline exists on every
    # host (stock macOS has no timeout/gtimeout). rc=124 mirrors timeout(1).
    printf '%q' "${child_cmd[0]}"
    local i
    for ((i = 1; i < ${#child_cmd[@]}; i++)); do printf ' %q' "${child_cmd[i]}"; done
    printf ' &\n'
    printf 'cpid=$!\n'
    # Recorded so `clear` can cancel the wait instead of orphaning it: a runner
    # that outlives its slot writes a sentinel nobody asked for, and the push
    # adapter surfaces it as a fresh event (observed 2026-09-21).
    printf 'printf "%%s\\n" "$cpid" > "$child"\n'
    if [ "${timeout_s:-0}" -gt 0 ] 2>/dev/null; then
      # Forked inside a command substitution so the runner shell never owns
      # the watchdog as a job: killing an owned job makes sh print
      # "Terminated" into .out, which corrupts the captured output.
      printf 'wpid=$( ( sleep %s; kill "$cpid" 2>/dev/null ) >/dev/null 2>&1 & echo $! )\n' "$timeout_s"
    else
      printf 'wpid=\n'
    fi
    printf 'wait "$cpid"\n'
    printf 'rc=$?\n'
    printf 'if [ -n "$wpid" ]; then\n'
    printf '  if kill -0 "$wpid" 2>/dev/null; then kill "$wpid" 2>/dev/null; else rc=124; fi\n'
    printf 'fi\n'
    printf 'case "$rc" in\n'
    printf '  0) reason=wait-exit ;;\n'
    printf '  3) reason=artifact-not-fresh ;;\n'
    printf '  124) reason=timeout ;;\n'
    printf '  *) reason=wait-failed ;;\n'
    printf 'esac\n'
    printf 'settled=$(date +%%s)\n'
    # Written to a temp file then renamed: a watcher never observes a partial
    # sentinel, which matters for the fs.watch-based adapters.
    printf '{\n'
    printf '  echo "slot=%s"\n' "$slot"
    printf '  echo "rc=$rc"\n'
    printf '  echo "reason=$reason"\n'
    printf '  echo "started=%s"\n' "$started"
    printf '  echo "settled=$settled"\n'
    printf '  echo "duration_s=$((settled-started))"\n'
    printf '  echo "output=%s"\n' "$wd/$slot.out"
    [ -z "$fresh" ] || printf '  echo "fresh=%s"\n' "$fresh"
    [ -z "$stamp_path" ] || printf '  echo "stamp=%s"\n' "$stamp_path"
    for kv in "${metas[@]+"${metas[@]}"}"; do
      printf '  echo %s\n' "$(printf '%q' "meta.$kv")"
    done
    printf '} > "$tmp"\n'
    printf 'mv -f "$tmp" "$final"\n'
  } > "$runner" || die "arm: cannot write runner"
  chmod +x "$runner"

  # The runner must not die with its caller. nohup + & + disown only ignore
  # SIGHUP: the runner stays in the caller's process group, and a harness that
  # cleans up a finished tool call by killing that group kills the runner too
  # (live 2026-11-10, Codex: ARMED printed, the runner died before writing
  # .out, so no window, no agent, no sentinel). setsid() gives it its own
  # session and group. Stock macOS has no setsid(1); python3 is already a
  # dependency of the skill, and exec keeps the pid that .armed records.
  local detached=1
  if command -v python3 >/dev/null 2>&1; then
    nohup python3 -I -c 'import os, sys
try:
    os.setsid()
except OSError:
    pass
os.execv(sys.argv[1], sys.argv[1:])' "$runner" </dev/null >/dev/null 2>&1 &
  else
    detached=0
    nohup "$runner" </dev/null >/dev/null 2>&1 &
  fi
  local pid=$!
  disown "$pid" 2>/dev/null || true
  # Return only once the runner leads its own group: the harness may kill the
  # caller's group the moment this command exits, before python3 has started.
  if [ "$detached" -eq 1 ]; then
    detached=0
    local n=0
    while [ "$n" -lt 100 ] && ! pid_gone "$pid"; do
      # os.getpgid, not ps(1): setuid /bin/ps cannot run in some sandboxes.
      [ "$(python3 -I -c 'import os, sys; print(os.getpgid(int(sys.argv[1])))' "$pid" 2>/dev/null)" = "$pid" ] && { detached=1; break; }
      sleep 0.05; n=$((n+1))
    done
  fi

  {
    printf 'slot=%s\n' "$slot"
    printf 'pid=%s\n' "$pid"
    printf 'started=%s\n' "$started"
    printf 'started_iso=%s\n' "$(iso)"
    # Keep argument boundaries for watching_arm, including shared session names with spaces.
    printf 'cmd=%s\n' "$(python3 -c 'import shlex, sys; print(shlex.join(sys.argv[1:]))' "$@")"
    printf 'timeout_s=%s\n' "$timeout_s"
    [ -z "$artifact" ] || printf 'artifact=%s\n' "$artifact"
    [ -z "$fresh" ] || printf 'fresh=%s\n' "$fresh"
    [ -z "$stamp_path" ] || printf 'stamp=%s\n' "$stamp_path"
    for kv in "${metas[@]+"${metas[@]}"}"; do printf 'meta.%s\n' "$kv"; done
  } > "$armed"

  printf 'ARMED %s pid=%s sentinel=%s timeout_s=%s\n' "$slot" "$pid" "$settled" "$timeout_s"
  [ "$detached" -eq 1 ] || printf 'WARN runner not confirmed outside the caller'"'"'s process group (no python3 for setsid, or it exited at once): a harness that kills that group when this command returns kills the wait too\n'

  # Self-describing sentinels need these four; missing ones are a dispatch-
  # contract slip (SKILL.md §0.4 step 6), surfaced here so the task record
  # shows it. Non-fatal: the wait is already running.
  local missing="" k kv have
  for k in agent model cwd purpose; do
    have=0
    for kv in "${metas[@]+"${metas[@]}"}"; do [ "${kv%%=*}" = "$k" ] && have=1; done
    [ "$have" -eq 1 ] || missing="$missing $k"
  done
  [ -z "$missing" ] || printf 'WARN missing meta:%s (external-orchestration §0.4 step 6 requires agent model cwd purpose)\n' "$missing"
}

# ---------------------------------------------------------------- poll

# A slot is LOST when its runner is gone and left no sentinel: nothing is
# watching it and no push will come. Checked again after the pid test, because
# a runner renames its sentinel into place just before it exits.
slot_lost() { # slot_lost <waits-dir> <slot>
  local pid
  [ -f "$1/$2.settled" ] && return 1
  pid="$(sed -n 's/^pid=//p' "$1/$2.armed" 2>/dev/null)"
  [ -n "$pid" ] || return 1
  pid_gone "$pid" || return 1
  [ ! -f "$1/$2.settled" ]
}

cmd_poll() {
  local dir="" slot="" stall_s=180
  while [ $# -gt 0 ]; do
    case "$1" in
      --dir) dir="${2:-}"; shift 2 ;;
      --slot) slot="${2:-}"; shift 2 ;;
      --stall-s) stall_s="${2:-}"; shift 2 ;;
      *) die "poll: unexpected argument '$1'" ;;
    esac
  done
  [ -n "$dir" ] || die "poll: --dir is required"
  guard_dir poll "$dir"
  local wd; wd="$(waits_dir "$dir")"
  [ -d "$wd" ] || { printf 'NONE (no waits armed)\n'; return 1; }

  local any_settled=1 f name
  for f in "$wd"/*.armed; do
    [ -e "$f" ] || continue
    name="$(basename "$f" .armed)"
    [ -z "$slot" ] || [ "$slot" = "$name" ] || continue
    if [ -f "$wd/$name.settled" ]; then
      local rc dur reason
      rc="$(sed -n 's/^rc=//p' "$wd/$name.settled")"
      dur="$(sed -n 's/^duration_s=//p' "$wd/$name.settled")"
      reason="$(sed -n 's/^reason=//p' "$wd/$name.settled")"
      printf 'SETTLED %s rc=%s after=%ss output=%s\n' "$name" "$rc" "$dur" "$wd/$name.out"
      case "$reason" in
        artifact-not-fresh)
          printf '  rc=3 = the wait command settled but the --fresh artifact did not advance:\n'
          printf '  the dispatch is incomplete. Read the output, then send the agent back for its\n'
          printf '  artifact instead of treating the round as done.\n' ;;
        timeout)
          printf '  rc=124 = the deadline hit; the wait failed, it did not succeed.\n' ;;
      esac
      any_settled=0
    elif slot_lost "$wd" "$name"; then
      printf 'LOST %s runner=%s gone without a sentinel\n' "$name" "$(sed -n 's/^pid=//p' "$f")"
      printf '  LOST = the wait is not running and nothing will settle this slot. Check the\n'
      printf '  agent'"'"'s live state (herdr-agent.py status), then:\n'
      printf '  1. %s clear --dir %s --slot %s (it stops only the wait, not the agent;\n' "$SELF_NAME" "$dir" "$name"
      printf '     while this slot stays, every join --any returns at once);\n'
      printf '  2. arm a NEW --slot: a continued wait (herdr-agent.py wait) if the agent is\n'
      printf '     running, the original run if it never started.\n'
      any_settled=0
    else
      local st elapsed art age state=PENDING detail=""
      st="$(sed -n 's/^started=//p' "$f")"
      elapsed=$(( $(now) - ${st:-$(now)} ))
      art="$(sed -n 's/^artifact=//p' "$f")"
      if [ -n "$art" ]; then
        if m="$(newest_mtime "$art")"; then
          age=$(( $(now) - m ))
          detail=" artifact_age=${age}s"
          [ "$age" -le "$stall_s" ] || state=STALLED
        else
          detail=" artifact=missing"
          [ "$elapsed" -le "$stall_s" ] || state=STALLED
        fi
      fi
      printf '%s %s elapsed=%ss%s\n' "$state" "$name" "$elapsed" "$detail"
      [ "$state" != STALLED ] || printf '  STALLED = nothing written for >%ss. Check the agent'"'"'s live state and its\n  output now; two consecutive STALLED with no change is a stall (SKILL.md §5.1).\n' "$stall_s"
    fi
  done
  return $any_settled
}

# ---------------------------------------------------------------- join

cmd_join() {
  local dir="" mode=any timeout_s=540 interval_s=5
  while [ $# -gt 0 ]; do
    case "$1" in
      --dir) dir="${2:-}"; shift 2 ;;
      --any) mode=any; shift ;;
      --all) mode=all; shift ;;
      --timeout-s) timeout_s="${2:-}"; shift 2 ;;
      --interval-s) interval_s="${2:-}"; shift 2 ;;
      *) die "join: unexpected argument '$1'" ;;
    esac
  done
  [ -n "$dir" ] || die "join: --dir is required"
  guard_dir join "$dir"
  local wd; wd="$(waits_dir "$dir")"
  [ -d "$wd" ] || die "join: no waits directory at $wd"

  local deadline=$(( $(now) + timeout_s ))
  while :; do
    local armed=0 settled=0 f name
    for f in "$wd"/*.armed; do
      [ -e "$f" ] || continue
      name="$(basename "$f" .armed)"
      armed=$((armed+1))
      # LOST ends the wait like a settle: waiting on it only runs out the deadline.
      if [ -f "$wd/$name.settled" ] || slot_lost "$wd" "$name"; then settled=$((settled+1)); fi
    done
    if [ "$armed" -gt 0 ]; then
      if [ "$mode" = any ] && [ "$settled" -gt 0 ]; then cmd_poll --dir "$dir"; return 0; fi
      if [ "$mode" = all ] && [ "$settled" -eq "$armed" ]; then cmd_poll --dir "$dir"; return 0; fi
    fi
    if [ "$(now)" -ge "$deadline" ]; then
      printf 'TIMEOUT after %ss (%s/%s settled)\n' "$timeout_s" "$settled" "$armed"
      cmd_poll --dir "$dir" >/dev/null 2>&1 || true
      for f in "$wd"/*.armed; do
        [ -e "$f" ] || continue
        name="$(basename "$f" .armed)"
        if [ -f "$wd/$name.settled" ]; then :
        elif slot_lost "$wd" "$name"; then printf 'LOST %s (clear it: no sentinel will come)\n' "$name"
        else printf 'STILL_PENDING %s\n' "$name"; fi
      done
      # An orchestrator's reflex on TIMEOUT is to run join again. That is a sleep
      # loop wearing a different hat, and it is what this whole mechanism exists
      # to remove.
      printf '%s\n' \
        'TIMEOUT is not a signal to re-run join. Before waiting again:' \
        '  1. If a push adapter is watching this directory, do not join at all —' \
        '     end the turn and let the sentinel wake you.' \
        '  2. Otherwise confirm the agent is still alive (control-plane status)' \
        '     and that its artifacts are still growing, then report progress to' \
        '     the human before deciding to keep waiting.' \
        '  3. Two consecutive timeouts with no artifact change is a stall — stop' \
        '     waiting and handle it as one.'
      return 2
    fi
    sleep "$interval_s"
  done
}

# ---------------------------------------------------------------- clear

cmd_clear() {
  local dir="" slot=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --dir) dir="${2:-}"; shift 2 ;;
      --slot) slot="${2:-}"; shift 2 ;;
      *) die "clear: unexpected argument '$1'" ;;
    esac
  done
  [ -n "$dir" ] || die "clear: --dir is required"
  guard_dir clear "$dir"
  local wd; wd="$(waits_dir "$dir")"
  [ -d "$wd" ] || return 0

  # Cancelling means cancelling the runner, not just deleting its files. A
  # runner left alive writes its sentinel minutes later, and the push adapter
  # surfaces that as a fresh event for a slot the orchestrator already
  # consumed (observed 2026-09-21: two spurious settles after a clear).
  cancel_slot() {
    local name="$1" killed="" pid
    pid="$(sed -n 's/^pid=//p' "$wd/$name.armed" 2>/dev/null)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && killed="$killed runner=$pid"
    fi
    pid="$(sed -n '1p' "$wd/.$name.child" 2>/dev/null)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && killed="$killed child=$pid"
    fi
    {
      printf 'slot=%s\n' "$name"
      printf 'cancelled=1\n'
      printf 'cancelled_at=%s\n' "$(iso)"
      printf 'cancelled_by=clear\n'
      [ -z "$killed" ] || printf 'killed=%s\n' "${killed# }"
    } > "$wd/.$name.cancelled"
    rm -f "$wd/$name.armed" "$wd/$name.settled" "$wd/$name.out" "$wd/.$name.runner.sh"
    rm -f "$wd/.$name.gate.sh" "$wd/.$name.child" "$wd/.$name.stamp"
    rm -f "$wd/.$name".*.settled.tmp
    printf 'CLEARED %s%s\n' "$name" "${killed:+ killed:${killed}}"
  }

  if [ -n "$slot" ]; then
    cancel_slot "$slot"
  else
    local f name
    for f in "$wd"/*.armed; do
      [ -e "$f" ] || continue
      name="$(basename "$f" .armed)"
      cancel_slot "$name"
    done
    printf 'CLEARED all\n'
  fi
}

# ---------------------------------------------------------------- main

[ $# -gt 0 ] || die "usage: $SELF_NAME arm|poll|join|clear ..."
sub="$1"; shift
case "$sub" in
  arm) cmd_arm "$@" ;;
  poll) cmd_poll "$@" ;;
  join) cmd_join "$@" ;;
  clear) cmd_clear "$@" ;;
  -h|--help|help) sed -n '2,53p' "$0" | sed 's/^# \{0,1\}//' ;;
  *) die "unknown subcommand '$sub'" ;;
esac
