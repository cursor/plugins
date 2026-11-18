#!/usr/bin/env python3
"""check-quota-action.py — enforce rate/quota limit rules and prevent model drift.

Rules:
1. When an agent hits a quota or rate limit, NEVER close or terminate the agent directly.
   Direct closure on quota exhaustion loses session continuity and causes workflow drift.
2. Default agents do not self-wake: they require setting a timer and waking up the agent
   once the reset window has elapsed.
3. The `claude` agent is an exception: it wakes itself up automatically upon quota reset,
   so no external timer is needed.
4. Orchestrators must mechanically validate quota-handling actions with this script
   before executing any action on a rate-limited agent.

Usage:
  check-quota-action.py --agent <agent> --action <action> [--seconds <N>] [--reset-at <ts>] [--log <path>]
  check-quota-action.py "agent=<agent> action=<action> [seconds=<N>] [reset_at=<ts>]" [--log <path>]
  check-quota-action.py --agent <agent> --detect [--log <path>]

Exit codes:
  0 = QUOTA_ACTION_OK
  1 = QUOTA_ACTION_REFUSED
  64 = usage error
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Action classifications
CLOSE_ACTIONS = {"close", "kill", "stop", "clear", "terminate", "abort", "exit", "discard", "finish"}
TIMER_ACTIONS = {"timer", "schedule-wake", "wake-timer", "schedule_wake", "wake_timer"}
WAIT_ACTIONS = {"wait", "await", "keep-alive", "keep_alive", "hold"}
RESUME_ACTIONS = {"wake", "resume"}

ALL_VALID_ACTIONS = CLOSE_ACTIONS | TIMER_ACTIONS | WAIT_ACTIONS | RESUME_ACTIONS

# Rate limit detection patterns
RATE_LIMIT_PATTERNS = [
    re.compile(r"\b429\b"),
    re.compile(r"too\s+many\s+requests", re.I),
    re.compile(r"rate\s*limit", re.I),
    re.compile(r"quota\s*(?:exceeded|exhausted|limit)", re.I),
    re.compile(r"usage\s*(?:limit|cap)", re.I),
    re.compile(r"tokens\s+per\s+minute", re.I),
    re.compile(r"requests\s+per\s+minute", re.I),
    re.compile(r"resource_exhausted", re.I),
    re.compile(r"insufficient_quota", re.I),
    re.compile(r"overloaded", re.I),
]

RESET_SECONDS_PATTERNS = [
    re.compile(r"(?:try\s+again|resets?|retry\s+after|wait)\s+(?:in\s+)?(\d+)\s*(s|sec|seconds?)\b", re.I),
    re.compile(r"(?:try\s+again|resets?|retry\s+after|wait)\s+(?:in\s+)?(\d+)\s*(m|min|minutes?)\b", re.I),
    re.compile(r"retry-after:\s*(\d+)", re.I),
]


def is_claude_agent(agent_name: str) -> bool:
    """Return True if the agent is claude or an Anthropic/claude CLI."""
    norm = agent_name.lower().strip()
    return "claude" in norm or norm.startswith("anthropic")


def parse_tuple(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for tok in text.split():
        if "=" not in tok:
            raise ValueError(f"not key=value: {tok!r}")
        k, v = tok.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def detect_rate_limit(text: str) -> tuple[bool, int | None]:
    """Detect whether text contains rate limit indicators, and optional reset seconds."""
    hit = any(p.search(text) for p in RATE_LIMIT_PATTERNS)
    seconds: int | None = None
    for p in RESET_SECONDS_PATTERNS:
        m = p.search(text)
        if m:
            val = int(m.group(1))
            unit = m.group(2).lower() if len(m.groups()) >= 2 and m.group(2) else "s"
            if unit.startswith("m"):
                seconds = val * 60
            else:
                seconds = val
            break
    return hit, seconds


def check_action(agent: str, action: str, seconds: int | None = None, reset_at: str | None = None) -> list[str]:
    """Validate action under quota limit rules. Return list of error/refusal reasons."""
    reasons: list[str] = []
    act = action.lower().strip()
    is_claude = is_claude_agent(agent)

    # Rule 1: Never close on quota limit
    if act in CLOSE_ACTIONS:
        reasons.append(
            f"agent {agent!r} is under quota limit; closing or killing it directly is FORBIDDEN. "
            f"Quota exhaustion is temporary; closing the agent causes prompt drift and lost progress."
        )
        return reasons

    if act not in ALL_VALID_ACTIONS:
        reasons.append(
            f"unknown action {action!r}; expected one of: "
            f"{sorted(WAIT_ACTIONS | TIMER_ACTIONS | RESUME_ACTIONS)}"
        )
        return reasons

    # Rule 2 & 3: Claude vs Default agents
    if is_claude:
        # Claude self-wakes; action=wait / await is standard.
        # action=timer is unnecessary (will produce note) but not strictly an error unless invalid args.
        pass
    else:
        # Default agents cannot self-wake: setting a timer to wake up is mandatory.
        if act in WAIT_ACTIONS:
            reasons.append(
                f"agent {agent!r} does not self-wake. Blind waiting without a timer is forbidden. "
                f"You must set a timer (action=timer with --seconds <N> or --reset-at <ts>) "
                f"to wake the agent when the quota resets."
            )
        elif act in TIMER_ACTIONS:
            if not seconds and not reset_at:
                reasons.append(
                    f"action={act} requires a duration (--seconds <N>) or deadline (--reset-at <ts>) "
                    f"to schedule the wake-up timer."
                )

    return reasons


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Check quota-limit actions and prevent agent shutdown.")
    ap.add_argument("tuple", nargs="?", help='"agent=… action=… [seconds=…] [reset_at=…]"')
    ap.add_argument("--agent", help="agent name (e.g. claude, codex, pi)")
    ap.add_argument("--action", help="action to take (e.g. timer, wait, wake, close)")
    ap.add_argument("--seconds", type=int, help="timer duration in seconds")
    ap.add_argument("--reset-at", help="timestamp / ISO time when quota resets")
    ap.add_argument("--log", help="path to agent output log to inspect for rate-limit evidence")
    ap.add_argument("--detect", action="store_true", help="detect rate-limit in log and advise recommended action")

    args = ap.parse_args(argv)

    agent = args.agent
    action = args.action
    seconds = args.seconds
    reset_at = args.reset_at

    if args.tuple:
        try:
            t = parse_tuple(args.tuple)
            agent = t.get("agent", agent)
            action = t.get("action", action)
            if "seconds" in t and seconds is None:
                seconds = int(t["seconds"])
            if "reset_at" in t and reset_at is None:
                reset_at = t["reset_at"]
        except ValueError as exc:
            print(f"usage error: {exc}", file=sys.stderr)
            return 64

    log_text = ""
    if args.log:
        try:
            log_text = Path(args.log).read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            print(f"usage error: cannot read log file: {exc}", file=sys.stderr)
            return 64

    is_limited = False
    detected_sec = None
    if log_text:
        is_limited, detected_sec = detect_rate_limit(log_text)
        if detected_sec and seconds is None:
            seconds = detected_sec

    if args.detect:
        if not agent:
            print("usage error: --detect requires --agent", file=sys.stderr)
            return 64
        is_claude = is_claude_agent(agent)
        if is_limited:
            sec_str = f" reset_in={detected_sec}s" if detected_sec else ""
            print(f"DETECTED_RATE_LIMIT agent={agent}{sec_str}")
            if is_claude:
                print("RECOMMENDED: action=wait (claude self-wakes when quota resets; DO NOT close)")
            else:
                sec_rec = detected_sec or 300
                print(f"RECOMMENDED: action=timer seconds={sec_rec} (set timer to wake agent; DO NOT close)")
            return 0
        else:
            print(f"NO_RATE_LIMIT_DETECTED agent={agent}")
            return 0

    if not agent or not action:
        print("usage error: both agent and action must be specified via arguments or tuple", file=sys.stderr)
        return 64

    problems = check_action(agent, action, seconds, reset_at)
    if problems:
        print(f"QUOTA_ACTION_REFUSED agent={agent} action={action}")
        for p in problems:
            print(f"  - {p}")
        return 1

    # Valid
    is_claude = is_claude_agent(agent)
    details = []
    if seconds:
        details.append(f"seconds={seconds}")
    if reset_at:
        details.append(f"reset_at={reset_at}")
    det_str = (" " + " ".join(details)) if details else ""

    print(f"QUOTA_ACTION_OK agent={agent} action={action}{det_str}")
    if is_claude:
        if action in TIMER_ACTIONS:
            print("  - NOTE: claude self-wakes automatically upon quota reset; external timer is redundant but harmless.")
        else:
            print("  - NOTE: claude self-wakes automatically upon quota reset. Keep session alive; DO NOT close.")
    else:
        print(f"  - NOTE: default agent will be woken after timer expires. Session preserved; DO NOT close.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
