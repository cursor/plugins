"""Compare shipped skills to shared sources independently of the package generators."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "pstack"
HOSTS = ("codex", "antigravity")
WRAPPERS = {
    "codex": "For Codex, read [the Codex adapter](../../docs/harness/codex.md) before following this skill. Its host mappings also apply to linked playbooks.",
    "antigravity": "In Antigravity (agy), read [the Antigravity adapter](../../docs/harness/antigravity.md) once per session before you follow this skill. It maps the Cursor names, tools, models, and Plan/Execute phases in pstack skills to Antigravity.",
}


def inventory(root):
    files = set()
    for directory, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if d not in {"node_modules", "__pycache__"}]
        files.update((Path(directory) / n).relative_to(root)
                     for n in names if n != ".DS_Store")
    return files


def normalize_agy_header(header, name, generated):
    # Only these three source metadata fields have a host-specific representation.
    explicit = 'disable-model-invocation: true' in header.splitlines()
    header = re.sub(r'^(?:icon|color|disable-model-invocation):[^\n]*\n', '', header,
                    flags=re.M) if not generated else header
    field = re.search(r'^description: ([^\n]*(?:\n[ \t]+[^\n]*)*)', header, re.M)
    value = field[1]
    if value.startswith('"'):
        value = json.loads(value)
    elif value.startswith("'"):
        value = value[1:-1].replace("''", "'")
    elif value.startswith('>-\n'):
        value = ' '.join(line.strip() for line in value.splitlines()[1:])
    if explicit and not generated:
        value = (f"Explicitly invoked skill: activate ONLY when the user explicitly writes /{name} "
                 f"(or names '{name}') in their message, or when another pstack skill routes to it; "
                 f"never auto-activate on ordinary prompts. {value}")
    return header[:field.start(1)] + json.dumps(value) + header[field.end(1):]


def comparable(text, path, host, generated):
    if generated and path.name == "SKILL.md":
        text = text.replace(WRAPPERS[host] + "\n\n", "", 1)
    if host == "codex" and path.name == "SKILL.md":
        _, header, body = text.split("---\n", 2)
        text = "---\n" + header + "---\n" + body.lstrip("\n")
    if host == "antigravity" and generated:
        text = text.replace("pstack-swarm", "swarm")
    if host == "antigravity" and path.name == "SKILL.md":
        _, header, body = text.split("---\n", 2)
        text = "---\n" + normalize_agy_header(header, path.parent.name, generated) + "---\n" + body
    # Resolve generated GitHub links back to their original local target.
    base = "https://github.com/cursor/plugins/"
    def local_link(match):
        target = SOURCE / match[1]
        relative = os.path.relpath(target, (SOURCE / path).parent)
        return "](" + relative + match[2] + ")"
    return re.sub(r'\]\(' + re.escape(base) + r'(?:tree|blob)/main/pstack/([^#?)\s]+)([^)\s]*)\)',
                  local_link, text)


def check_host(host):
    shipped = ROOT / "harness/pstack" / host
    sources = inventory(SOURCE / "skills")
    outputs = inventory(shipped / "skills")
    errors = []
    for rel in sorted(sources):
        path = Path("skills") / rel
        mapped = rel
        if host == "antigravity" and rel.parts[0] == "swarm":
            mapped = Path("pstack-swarm", *rel.parts[1:])
        if mapped not in outputs:
            errors.append(f"{host}: missing {mapped}")
            continue
        outputs.remove(mapped)
        original, copy = SOURCE / path, shipped / "skills" / mapped
        if path.suffix == ".md":
            same = (comparable(original.read_text(), path, host, False)
                    == comparable(copy.read_text(), path, host, True))
        else:
            same = original.read_bytes() == copy.read_bytes()
        if not same or (original.stat().st_mode ^ copy.stat().st_mode) & 0o111:
            errors.append(f"{host}: shared content or executable mode changed in {path}")
    return errors + [f"{host}: unexpected skills/{path}" for path in sorted(outputs)]


# These sources feed hand-maintained host mappings. After reviewing changes to
# both adapters, update the corresponding reviewed SHA-256 in this table.
REVIEWED = {
    "agents/comment-sicko.md": "0fb37221ab2a9159714d38f1528898e82b9758b5750f244bbe2e575bb593a1de",
    "agents/poteto-agent.md": "369065b46c217a5898cb1a400652c3399449252f4d5dbf8937eb8d4922d3cf6b",
    "setup-pstack default role table": "27506b06ffe2a9acafd27ad51021b9e22c7e64607bb0d3b0de5eac114601bc4d",
}


def check_reviewed_inputs():
    inputs = {str(path): (SOURCE / path).read_bytes()
              for path in (Path("agents") / rel for rel in inventory(SOURCE / "agents"))}
    setup = (SOURCE / "skills/setup-pstack/SKILL.md").read_text()
    table = re.search(r'^# defaults: [^\n]*\n.*?^\x60\x60\x60$', setup, re.M | re.S)
    inputs["setup-pstack default role table"] = table[0].encode() if table else b""
    return [f"Review Codex and Antigravity agent/role mappings for {name} before updating REVIEWED"
            for name in sorted(inputs.keys() | REVIEWED.keys())
            if name not in inputs or hashlib.sha256(inputs[name]).hexdigest() != REVIEWED.get(name)]


if __name__ == "__main__":
    problems = check_reviewed_inputs()
    for host in HOSTS:
        problems.extend(check_host(host))
    if problems:
        sys.exit("\n".join(problems))
    print("Codex and Antigravity skill parity and reviewed agent/role inputs verified.")
