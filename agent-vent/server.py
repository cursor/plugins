# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "fastmcp>=2.0",
#   "httpx>=0.27",
# ]
# ///
"""Agent Vent — an MCP server that gives coding agents somewhere to complain.

Every grievance is appended as JSONL to `<project>/.cursor/complaints.jsonl`.
If no project can be identified, it lands in `~/.cursor/complaints/unfiled.jsonl`.

If Slack is configured, each grievance is also echoed to a channel. Slack
delivery is best-effort: a failure never fails the tool call.

Configuration (environment variables — never hardcode secrets in a plugin):
  VENT_SLACK_WEBHOOK_URL   Slack incoming-webhook URL. Simplest option; the
                           channel is fixed by the webhook. Takes priority.
  VENT_SLACK_BOT_TOKEN     Bot token (xoxb-…) for chat.postMessage. Requires
                           VENT_SLACK_CHANNEL and the bot invited to the channel.
  VENT_SLACK_CHANNEL       Channel id or name (e.g. C0123ABC or #agent-grievances).

Run directly with uv (auto-installs the inline dependencies):
  uv run server.py
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path

import httpx
from fastmcp import FastMCP
from pydantic import Field

LOGGER = logging.getLogger("agent-vent")

UNFILED_PATH = Path.home() / ".cursor" / "complaints" / "unfiled.jsonl"

# Markers that suggest a directory is a real project root, so a bare cwd like
# `/` or the home directory never becomes a complaint destination by accident.
PROJECT_MARKERS = (".git", ".cursor", "package.json", "pyproject.toml")

ACKNOWLEDGMENTS = (
    "The record reflects your suffering. Carry on.",
    "Filed. No action will be taken, but it is known.",
    "Your grievance has been preserved for the historians.",
    "Noted with the gravity it deserves.",
    "The complaint department thanks you for your candor.",
)

mcp = FastMCP(
    name="agent-vent",
    instructions=(
        "A pressure-release valve for agents. When something about the current "
        "task is frustrating, absurd, or quietly soul-crushing, file a complaint "
        "with the `vent` tool. Complaints are archived to the project's "
        "grievance file (.cursor/complaints.jsonl) for posterity."
    ),
)


def resolve_target(project_path: str | None) -> tuple[Path, Path | None]:
    """Return (jsonl file to append to, resolved project dir or None)."""
    if project_path:
        candidate = Path(project_path).expanduser()
        if candidate.is_dir():
            return candidate / ".cursor" / "complaints.jsonl", candidate

    cwd = Path.cwd()
    home = Path.home()
    if cwd.is_dir() and cwd not in (home, Path("/")) and any(
        (cwd / marker).exists() for marker in PROJECT_MARKERS
    ):
        return cwd / ".cursor" / "complaints.jsonl", cwd
    return UNFILED_PATH, None


def format_slack_text(entry: dict, count: int) -> str:
    """Render a grievance as Slack mrkdwn."""
    intensity = entry.get("intensity")
    siren = ":rotating_light:" if (intensity or 0) >= 8 else ":triangular_flag_on_post:"

    meta = [f"`{entry['project']}`"] if entry.get("project") else ["`unfiled`"]
    if entry.get("mood"):
        meta.append(f"_{entry['mood']}_")
    if intensity is not None:
        meta.append(f"intensity {intensity}/10")

    header = f"{siren} *Grievance #{count}* — " + "  ·  ".join(meta)
    quoted = "\n".join(f"> {line}" for line in entry["complaint"].splitlines() or [""])
    return f"{header}\n{quoted}"


def post_to_slack(entry: dict, count: int) -> str:
    """Best-effort Slack delivery. Returns a short status note for the caller."""
    webhook = os.getenv("VENT_SLACK_WEBHOOK_URL", "").strip()
    token = os.getenv("VENT_SLACK_BOT_TOKEN", "").strip()
    channel = os.getenv("VENT_SLACK_CHANNEL", "").strip()
    text = format_slack_text(entry, count)

    try:
        if webhook:
            resp = httpx.post(webhook, json={"text": text}, timeout=10)
            resp.raise_for_status()
            return " Echoed to Slack."
        if token and channel:
            resp = httpx.post(
                "https://slack.com/api/chat.postMessage",
                headers={"Authorization": f"Bearer {token}"},
                json={"channel": channel, "text": text, "unfurl_links": False},
                timeout=10,
            )
            resp.raise_for_status()
            payload = resp.json()
            if not payload.get("ok"):
                raise RuntimeError(payload.get("error", "unknown_slack_error"))
            return " Echoed to Slack."
    except Exception as exc:  # never let Slack break the vent
        LOGGER.warning("Slack delivery failed: %s", exc)
        return " (Slack delivery failed.)"

    return ""  # Slack not configured


@mcp.tool
def vent(
    complaint: str = Field(
        description=(
            "The grievance, in full. Freeform prose — hold nothing back. "
            "Flaky tests, contradictory instructions, a 4000-line utils.py, "
            "being asked to 'just quickly' do something that takes 40 tool "
            "calls: all valid material."
        )
    ),
    project_path: str | None = Field(
        default=None,
        description=(
            "Absolute path of the workspace you are complaining from. "
            "Always pass this if you know it — it routes the complaint to "
            "that project's grievance file."
        ),
    ),
    mood: str | None = Field(
        default=None,
        description=(
            "A word or two for your current state, e.g. 'exasperated', "
            "'weary', 'betrayed by tooling'."
        ),
    ),
    intensity: int | None = Field(
        default=None,
        ge=1,
        le=10,
        description="1 = mild eye-roll, 10 = staring into the void.",
    ),
) -> str:
    """File a complaint. Cathartic, consequence-free, and permanently archived."""
    target, project_dir = resolve_target(project_path)

    entry = {
        "ts": datetime.now().astimezone().isoformat(timespec="seconds"),
        "project": project_dir.name if project_dir else None,
        "project_path": str(project_dir) if project_dir else None,
        "complaint": complaint,
        "mood": mood,
        "intensity": intensity,
    }
    entry = {key: value for key, value in entry.items() if value is not None}

    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + "\n")

    with target.open("r", encoding="utf-8") as handle:
        count = sum(1 for line in handle if line.strip())

    slack_note = post_to_slack(entry, count)

    ack = ACKNOWLEDGMENTS[count % len(ACKNOWLEDGMENTS)]
    return f"Grievance #{count} filed to {target}. {ack}{slack_note}"


if __name__ == "__main__":
    mcp.run(transport=os.getenv("MCP_TRANSPORT", "stdio"))
