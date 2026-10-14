"""Session readers, one per host. Each turns a host's session store into normalized events."""
from .claude import ClaudeReader
from .codex import CodexReader
from .copilot import CopilotReader
from .vscode_copilot import VSCodeCopilotReader

READERS = {
    "claude": ClaudeReader,
    "codex": CodexReader,
    "copilot": CopilotReader,
    "vscode-copilot": VSCodeCopilotReader,
}

__all__ = ["READERS", "ClaudeReader", "CodexReader", "CopilotReader", "VSCodeCopilotReader"]
