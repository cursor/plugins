#!/usr/bin/env python3
"""Independent cross-vendor audit controller with receipt/tree verification, exit-75 failover, T1 shadow calibration, and readonly snapshots."""

from __future__ import annotations

import argparse
import hashlib
import hmac
import importlib.util
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

_SDIR = str(Path(__file__).resolve().parent)
if _SDIR not in sys.path:
    sys.path.insert(0, _SDIR)

import sop_common as SC

_RM_SPEC = importlib.util.spec_from_file_location("rm_mod", SC.SCRIPT_DIR / "record-metrics.py")
assert _RM_SPEC and _RM_SPEC.loader
RM = importlib.util.module_from_spec(_RM_SPEC)
_RM_SPEC.loader.exec_module(RM)

_VGR_SPEC = importlib.util.spec_from_file_location("vgr_mod", SC.SCRIPT_DIR / "verify-gates-registry.py")
assert _VGR_SPEC and _VGR_SPEC.loader
VGR = importlib.util.module_from_spec(_VGR_SPEC)
_VGR_SPEC.loader.exec_module(VGR)

_SG_SPEC = importlib.util.spec_from_file_location("sg_mod", SC.SCRIPT_DIR / "sop-gate.py")
assert _SG_SPEC and _SG_SPEC.loader
SG = importlib.util.module_from_spec(_SG_SPEC)
_SG_SPEC.loader.exec_module(SG)

REVIEW_NUM_RE = re.compile(r"^review-(\d+)\.md$")
GRADUATION_THRESHOLD = 15

EXIT_QUOTA = 75
EXIT_READONLY_VIOLATION = 76
EXIT_TIMEOUT = 124
MAX_SNAP_FILE_BYTES = 20 * 1024 * 1024
HC_STATE_FILENAME = "audit-hc-state.json"

SNAPSHOT_SKIP_ROOTS = (
    ".git",
    "node_modules",
    ".venv",
    "ios/Pods",
    "ios/build",
    "android/build",
    "android/.gradle",
)
TRANSIENT_CACHE_SEGMENTS = {".pytest_cache", "__pycache__", ".vite", ".cache"}
STRICT_QUOTA_SCREEN_RE = re.compile(
    r"""(?ix)
    \b(?:
        HTTP\s*429 |
        status(?:\s*code)?\s*[:=]\s*429 |
        "type"\s*:\s*"rate_limit_error" |
        rate_limit_error |
        quota[\s_]+exceeded |
        insufficient_quota |
        too\s+many\s+requests |
        overloaded_error |
        usage[\s_]+limit(?:\s+reached|\s+exceeded)?
    )\b
    | you(?:'ve|\s+have)\s+hit\s+your\s+(?:usage\s+)?limit
    """
)


def vendor_of_agent(agent: str) -> str:
    a = agent.strip().lower()
    if a in ("agy", "gemini"):
        return "gemini"
    if a.startswith("claude"):
        return "claude"
    if a.startswith("codex"):
        return "codex"
    return a


def resolve_reviewer_specs(policy: Dict[str, object]) -> List[str]:
    agents = policy.get("slot_agents") or {}
    models = policy.get("slot_models") or {}
    efforts = policy.get("slot_effort") or {}

    writer_agent = str(agents.get("writer") or "agy").strip().lower()
    writer_vendor = vendor_of_agent(writer_agent)
    if writer_agent == "pi":
        pi_model = str((models.get("pi") or {}).get("writer") or "").lower()
        if "claude" in pi_model or "anthropic" in pi_model:
            writer_vendor = "claude"
        elif "gpt" in pi_model or "codex" in pi_model or "openai" in pi_model:
            writer_vendor = "codex"

    preferred = str(agents.get("reviewer") or "claude").strip().lower()
    if preferred not in ("claude", "codex"):
        raise ValueError(
            f"Unsupported headless external reviewer {preferred!r} in policy; expected 'claude' or 'codex'"
        )

    def build_spec(cli: str) -> str:
        m = (models.get(cli) or {}).get("reviewer")
        e = (efforts.get(cli) or {}).get("reviewer")
        if cli == "claude":
            if m and e:
                return f"cli:claude:{m}:{e}"
            if m:
                return f"cli:claude:{m}"
            return "cli:claude"
        if cli == "codex":
            return f"cli:codex:{m}" if m else "cli:codex"
        return f"cli:{cli}"

    order: List[str] = []
    for candidate in (preferred, "claude", "codex"):
        if candidate in ("claude", "codex") and vendor_of_agent(candidate) != writer_vendor:
            spec = build_spec(candidate)
            if spec not in order:
                order.append(spec)

    if not order:
        raise ValueError(f"No cross-vendor reviewer available when writer vendor is {writer_vendor!r}")
    return order


def verify_receipt_and_trees(
    task_dir: Path,
    expected_lock_file: Optional[Path] = None,
    allow_custom_repos: bool = False,
    sop_root: Optional[Path] = None,
) -> Tuple[Optional[Dict[str, object]], List[str]]:
    latest = task_dir / "evidence" / "gate-latest.json"
    if not latest.is_file():
        return None, [f"Missing gate receipt: {latest} (run sop-gate.py first)"]

    try:
        receipt = json.loads(latest.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return None, [f"Unreadable gate receipt {latest}: {exc}"]

    if not isinstance(receipt, dict):
        return None, [f"Invalid gate receipt structure in {latest}"]

    eff_root = SC.find_sop_root(
        explicit_root=sop_root or (Path(str(receipt["sop_root"])) if receipt.get("sop_root") else None),
        task_dir=task_dir,
    )
    workspace = SC.load_workspace(eff_root)
    eff_lock = (expected_lock_file or Path(str(workspace["lock_file"]))).expanduser().resolve()
    allowed_defaults: Dict[str, Path] = {
        k: v.resolve() for k, v in (workspace.get("repos") or {}).items()  # type: ignore[union-attr]
    }
    cp_repo = workspace.get("control_plane_repo")

    problems: List[str] = []
    given_digest = receipt.get("receipt_digest")
    if not isinstance(given_digest, str) or len(given_digest) != 64:
        problems.append("Missing or malformed receipt_digest")
    else:
        body = {k: v for k, v in receipt.items() if k != "receipt_digest"}
        expected_digest = SG.canonical_receipt_digest(body)
        if not hmac.compare_digest(given_digest, expected_digest):
            problems.append("receipt_digest mismatch — gate receipt altered outside sop-gate.py")

    if receipt.get("status") != "PASS":
        problems.append(f"Gate receipt status is {receipt.get('status')!r}, expected 'PASS'")

    rec_lock = Path(str(receipt.get("lock_file") or "")).expanduser()
    if not rec_lock.is_file() or rec_lock.resolve() != eff_lock:
        problems.append(f"Gate receipt lock_file mismatch: got {str(rec_lock)!r}, expected {str(eff_lock)!r}")

    repo_paths = receipt.get("repo_paths")
    repo_trees = receipt.get("repo_trees")
    if not isinstance(repo_paths, dict) or not isinstance(repo_trees, dict):
        problems.append("Gate receipt missing repo_paths or repo_trees mappings")
        return receipt, problems

    if not allow_custom_repos:
        expected_keys = {k for k, p in allowed_defaults.items() if p.is_dir()}
        if set(repo_paths.keys()) != expected_keys:
            problems.append(
                f"Receipt repo_paths keys {sorted(repo_paths.keys())} omit workspace repos {sorted(expected_keys)}"
            )

    locked_names = SG._locked_repo_names(eff_lock)
    registry_to_verify: Dict[str, Path] = {}
    verified_repo_map: Dict[str, Path] = {}
    live_trees: Dict[str, str] = {}
    for rname, raw_path in sorted(repo_paths.items()):
        rpath = Path(str(raw_path)).expanduser().resolve()
        if not allow_custom_repos:
            expected_default = allowed_defaults.get(rname)
            if expected_default is None or rpath != expected_default:
                problems.append(f"Non-default repo path rejected for {rname!r}: {rpath}")
        if not rpath.is_dir():
            problems.append(f"Repo directory missing: {rpath}")
            continue
        verified_repo_map[rname] = rpath
        if (rpath / ".sop" / "gates.json").is_file() or (rname in locked_names and rname != cp_repo):
            registry_to_verify[rname] = rpath
        try:
            live = SC.tree_stamp_for_repo(rpath, rname, workspace)
            live_trees[rname] = live
            recorded = repo_trees.get(rname)
            if live != recorded:
                problems.append(f"E-tree-receipt drift on {rname}: receipt had {recorded!r}, live repo is {live!r}")
        except RuntimeError as exc:
            problems.append(str(exc))

    if registry_to_verify:
        problems.extend(VGR.verify_lock(registry_to_verify, eff_lock))
    elif locked_names:
        problems.extend(VGR.verify_lock({k: v for k, v in allowed_defaults.items() if (v / ".sop" / "gates.json").is_file()}, eff_lock))

    if len(live_trees) == 1:
        recomputed = next(iter(live_trees.values()))
    elif len(live_trees) > 1:
        joined = "\n".join(f"{k}={live_trees[k]}" for k in sorted(live_trees)).encode("utf-8")
        recomputed = "tree=" + hashlib.sha256(joined).hexdigest()[:12]
    else:
        recomputed = "tree=000000000000"

    if recomputed != receipt.get("combined_tree"):
        problems.append(f"Combined tree mismatch: receipt={receipt.get('combined_tree')!r}, live={recomputed!r}")

    baselines = receipt.get("baselines") or {}
    handoffs = sorted(task_dir.glob("handoff-*.md"))
    oldest_handoff_ns = min((p.stat().st_mtime_ns for p in handoffs), default=None)
    if receipt.get("risk_tier") in ("T0_READONLY", "T1_STANDARD"):
        baseline_files = sorted((task_dir / "evidence").glob("baseline-*.json"))
        if not baseline_files:
            problems.append("Missing evidence/baseline-<repo>.json; T0/T1 requires sop-open.py baseline")
        required_baseline_repos = sorted(set(receipt.get("target_repos") or []) | set(repo_paths.keys()))
        for rname in required_baseline_repos:
            bmeta = baselines.get(rname) or {}
            if not bmeta.get("present"):
                problems.append(f"Missing baseline for repo {rname!r}; T0/T1 requires baseline snapshot")

    for rname, bmeta in sorted(baselines.items()):
        if not bmeta.get("present"):
            continue
        bfile = Path(str(bmeta.get("path") or ""))
        if not bfile.is_file():
            problems.append(f"Recorded baseline file missing: {bfile}")
            continue
        actual_sha = hashlib.sha256(bfile.read_bytes()).hexdigest()
        if actual_sha != bmeta.get("sha256"):
            problems.append(f"Baseline file tampered for {rname}: {bfile}")
        if oldest_handoff_ns is not None and bfile.stat().st_mtime_ns > oldest_handoff_ns:
            problems.append(f"Baseline {bfile.name} mtime is newer than {handoffs[0].name} (late reset disallowed)")

    try:
        ops_plan_raw = receipt.get("ops_plan")
        live_assessed = SG.assess_task_deterministically(
            task_dir=task_dir,
            repos_arg=str(receipt.get("repos_arg") or "auto"),
            repo_map_overrides=verified_repo_map if allow_custom_repos else None,
            base_overrides=receipt.get("diff_bases") or None,
            ops_plan=Path(str(ops_plan_raw)) if ops_plan_raw else None,
            lock_file=eff_lock,
            sop_root=eff_root,
        )
        if live_assessed["lock_errors"]:
            problems.extend([f"Live lock re-check: {e}" for e in live_assessed["lock_errors"]])
        if live_assessed["static_errors"]:
            problems.append(f"Live 0-token static re-check failed with {len(live_assessed['static_errors'])} error(s)")
        recomputed_changed = {k: live_assessed["changed_by_repo"][k] for k in live_assessed["changed_repos"]}
        if recomputed_changed != receipt.get("changed_files"):
            problems.append("Receipt changed_files mismatch under live deterministic re-derivation")
        if live_assessed["risk_tier"] != receipt.get("risk_tier"):
            problems.append(
                f"Receipt risk_tier mismatch: receipt={receipt.get('risk_tier')!r}, live={live_assessed['risk_tier']!r}"
            )
        if live_assessed.get("runtime_verification") != receipt.get("runtime_verification"):
            problems.append("Receipt runtime_verification mismatch under live deterministic re-derivation")
    except (ValueError, RuntimeError, FileNotFoundError) as exc:
        problems.append(f"Live re-derivation error: {exc}")

    return receipt, problems


def verify_graduated_from_metrics(
    clean_slugs: List[str],
    clean_fps: List[str],
    metrics_root: Path,
) -> Tuple[List[str], List[str]]:
    valid_slugs: List[str] = []
    valid_fps: List[str] = []
    seen_slugs: set[str] = set()
    seen_fps: set[str] = set()
    for slug, fp in zip(clean_slugs, clean_fps):
        if not slug or not fp or slug in seen_slugs or fp in seen_fps:
            continue
        mfile = metrics_root / RM.month_bucket(slug) / f"{slug}.json"
        if not mfile.is_file():
            continue
        try:
            mdata = json.loads(mfile.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if (
            mdata.get("tier") == "T1_STANDARD"
            and mdata.get("verdict") == "PASS"
            and mdata.get("active_blockers_count") == 0
            and mdata.get("audit_mode") == "shadow_calibration"
            and mdata.get("calibration_fingerprint") == fp
        ):
            seen_slugs.add(slug)
            seen_fps.add(fp)
            valid_slugs.append(slug)
            valid_fps.append(fp)
    return valid_slugs, valid_fps


def load_calibration(cal_path: Path, metrics_root: Optional[Path] = None) -> Dict[str, object]:
    if not cal_path.is_file():
        return {
            "schema_version": 2,
            "graduation_threshold": GRADUATION_THRESHOLD,
            "consecutive_clean_t1": 0,
            "graduated": False,
            "clean_task_slugs": [],
            "clean_fingerprints": [],
            "history": [],
        }
    data = json.loads(cal_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Invalid calibration JSON in {cal_path}")
    data["schema_version"] = 2
    data["graduation_threshold"] = GRADUATION_THRESHOLD
    raw_slugs = list(data.get("clean_task_slugs") or [])
    raw_fps = list(data.get("clean_fingerprints") or [])
    if metrics_root is not None:
        raw_slugs, raw_fps = verify_graduated_from_metrics(raw_slugs, raw_fps, metrics_root)
    data["clean_task_slugs"] = raw_slugs
    data["clean_fingerprints"] = raw_fps
    data.setdefault("history", [])
    data["consecutive_clean_t1"] = len(raw_fps)
    data["graduated"] = len(raw_fps) >= GRADUATION_THRESHOLD
    return data


def save_calibration(cal_path: Path, cal: Dict[str, object]) -> None:
    cal_path.parent.mkdir(parents=True, exist_ok=True)
    cal["updated_at_utc"] = SC.utc_now_iso()
    cal_path.write_text(json.dumps(cal, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_fastpath_metrics(
    task_dir: Path,
    risk_tier: str,
    combined_tree: str,
    metrics_root: Path,
    audit_mode: str,
) -> Path:
    out_dir = metrics_root / RM.month_bucket(task_dir.name)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{task_dir.name}.json"
    payload = {
        "schema_version": 1,
        "task_slug": task_dir.name,
        "tier": risk_tier,
        "source_review": None,
        "verdict": "PASS",
        "tree": combined_tree.removeprefix("tree="),
        "gate_combined_tree": combined_tree,
        "audit_mode": audit_mode,
        "reviewer_spec": None,
        "failover_used": False,
        "health_scores": [],
        "active_blockers_count": 0,
        "suggestions_or_notes_count": 0,
        "counts": {
            "briefs": len(list(task_dir.glob("brief-*.md"))),
            "handoffs": len(list(task_dir.glob("handoff-*.md"))),
            "reviews": len(list(task_dir.glob("review*.md"))),
            "dispositions": len(list(task_dir.glob("disposition-*.md"))),
        },
        "recorded_at_utc": SC.utc_now_iso(),
    }
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out_path


def next_review_index(task_dir: Path) -> int:
    highest = 0
    for p in task_dir.iterdir():
        m = REVIEW_NUM_RE.match(p.name)
        if m:
            highest = max(highest, int(m.group(1)))
    return highest + 1


def _reject_duplicate_json_keys(pairs: List[Tuple[str, object]]) -> Dict[str, object]:
    obj: Dict[str, object] = {}
    for key, val in pairs:
        if key in obj:
            raise ValueError(f"Duplicate JSON key: {key}")
        obj[key] = val
    return obj


def _reject_json_constant(token: str) -> object:
    raise ValueError(f"Non-standard JSON constant: {token}")


def _load_strict_json_dict(json_path: Path) -> Optional[Dict[str, object]]:
    try:
        raw = json_path.read_text(encoding="utf-8")
        obj = json.loads(raw, object_pairs_hook=_reject_duplicate_json_keys, parse_constant=_reject_json_constant)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError, RecursionError):
        return None
    return obj if isinstance(obj, dict) else None


def _json_matches_runtime_tree(json_path: Path, expected_tree: str) -> bool:
    if not expected_tree or not json_path.is_file():
        return False
    obj = _load_strict_json_dict(json_path)
    if obj is None:
        return False
    raw_tree = obj.get("combined_tree")
    if not isinstance(raw_tree, str) or raw_tree.strip() != expected_tree:
        return False
    raw_status = obj.get("status")
    if not isinstance(raw_status, str):
        return False
    return raw_status.strip().lower() in ("pass", "passed", "ok", "verified")


def _has_runtime_artifact(ev_dir: Path, expected_tree: str) -> bool:
    if not ev_dir.is_dir():
        return False
    for cand in ev_dir.glob("runtime-*"):
        if cand.name == "runtime-skip.json":
            continue
        if cand.is_file():
            if cand.suffix == ".json" and _json_matches_runtime_tree(cand, expected_tree):
                return True
        elif cand.is_dir():
            has_nonempty = any(
                child.is_file() and child.stat().st_size > 0
                for child in cand.rglob("*")
            )
            if has_nonempty and (
                _json_matches_runtime_tree(cand / "proof.json", expected_tree)
                or _json_matches_runtime_tree(cand / "report.json", expected_tree)
            ):
                return True
    return False


def check_runtime_evidence_for_fastpath(
    task_dir: Path,
    receipt: Dict[str, object],
) -> Optional[Dict[str, object]]:
    rt = receipt.get("runtime_verification")
    if not isinstance(rt, dict) or not rt.get("required"):
        return None
    ev_dir = task_dir / "evidence"
    expected_tree = str(receipt.get("combined_tree") or "")
    if _has_runtime_artifact(ev_dir, expected_tree):
        return None
    skip_path = ev_dir / "runtime-skip.json"
    if skip_path.is_file():
        skip_obj = _load_strict_json_dict(skip_path)
        if (
            skip_obj is not None
            and bool(expected_tree)
            and isinstance(skip_obj.get("combined_tree"), str)
            and skip_obj["combined_tree"].strip() == expected_tree
            and isinstance(skip_obj.get("reason"), str)
            and skip_obj["reason"].strip()
        ):
            return None
    return {
        "schema_version": 1,
        "status": "AUDIT_MISSING_RUNTIME_EVIDENCE",
        "risk_tier": receipt.get("risk_tier"),
        "combined_tree": expected_tree,
        "required_targets": rt.get("required_targets") or [],
        "runtime_verification": rt,
        "reasons": [
            "runtime_verification required for UI changes, but neither tree-bound "
            "evidence/runtime-* artifact nor matching evidence/runtime-skip.json was found"
        ],
        "checked_at_utc": SC.utc_now_iso(),
    }


def build_audit_prompt(
    task_dir: Path,
    receipt: Dict[str, object],
    primary_repo: str,
    primary_tree: str,
    review_round: int,
    *,
    workspace: Optional[Dict[str, object]] = None,
    snapshots: Optional[Dict[str, Dict[str, object]]] = None,
    raw_out_path: Optional[Path] = None,
    hc_mode: bool = False,
) -> str:
    parts: List[str] = [
        f"# Independent Cross-Vendor Audit Request — {task_dir.name} (review-{review_round})",
        "",
        "You are an adversarial READ-ONLY cross-vendor reviewer. Do NOT modify any repository files.",
        "Every blocking finding must cite verified code/runtime evidence (`path:line` or reproduced check) using Symptom -> Source -> Consequence -> Remedy.",
        "Only report blockers that this task introduced, worsened, or failed to satisfy relative to intent/Invariants (`B-n`).",
        "Put non-blocking suggestions or pre-existing technical debt strictly under `NOTES:` as `N-n` (never `B-n`, never `S-n` as blockers).",
        "",
        f"- Primary Repo: `{primary_repo}`",
        f"- Verified Tree Stamp (copy verbatim to header): `{primary_tree}`",
        f"- Gate Risk Tier: `{receipt['risk_tier']}` ({'; '.join(receipt.get('tier_reasons') or [])})",
    ]
    if hc_mode:
        parts.extend(
            [
                "",
                "## Isolated Readonly Snapshots & Delivery Contract (MANDATORY)",
                "1. Inspect code and run read-only checks ONLY inside the isolated snapshot directory/directories below; DO NOT edit any file inside the snapshot or source repositories (mutating the snapshot fails immediately with exit 76):",
            ]
        )
        for rname in sorted((snapshots or {}).keys()):
            snap_repo = str((snapshots or {})[rname].get("snap_repo") or "")
            if snap_repo:
                parts.append(f"   - Isolated Readonly Snapshot ({rname}): `{snap_repo}`")
        if raw_out_path is not None:
            parts.append(
                f"2. Write the complete review Markdown (starting with `VERDICT: PASS` or `VERDICT: NEEDS_CHANGES`) directly to this exact file path: `{raw_out_path}` (do NOT write `review-{review_round}.md` yourself)."
            )
        parts.append("3. Once that file is written, end your turn and stand by idle inside the terminal; DO NOT exit your CLI.")
    parts.append("")

    intent_path = task_dir / "intent.md"
    if intent_path.is_file():
        parts.extend(["## Verbatim User Intent (intent.md)", "", intent_path.read_text(encoding="utf-8").strip(), ""])

    plan_path = task_dir / "plan.md"
    if plan_path.is_file():
        plan_txt = plan_path.read_text(encoding="utf-8").strip()
        if len(plan_txt) > 6000:
            plan_txt = plan_txt[:6000] + "\n...[truncated]..."
        parts.extend(["## Task Plan & Acceptance Criteria (plan.md)", "", plan_txt, ""])

    repo_roots = {k: Path(v).resolve() for k, v in (receipt.get("repo_paths") or {}).items()}
    invariants = SC.collect_project_invariants(repo_roots, workspace)
    if invariants:
        parts.append("## Mandatory Project Invariants")
        for idx, inv in enumerate(invariants, start=1):
            parts.append(f"{idx}. {inv}")
        parts.append("")

    parts.extend(
        [
            "## Gate Evidence & Static Leads",
            f"- Changed files: `{json.dumps(receipt.get('changed_files') or {}, ensure_ascii=False)}`",
        ]
    )

    ev_dir = task_dir / "evidence"
    for rname in receipt.get("changed_repos") or []:
        pfile = ev_dir / f"diff-{rname}.patch"
        if pfile.is_file():
            parts.append(f"- Patch file ({rname}): `{pfile}`")

    ws_signals = receipt.get("workaround_signals") or []
    if ws_signals:
        parts.append("- **A-symptom-guard Workaround Signals (MUST verify root cause vs symptom masking)**:")
        for ws in ws_signals[:20]:
            parts.append(f"  - `{ws['file']}:{ws['line']}` [{ws['kind']}] `{ws['snippet']}`")

    drift_leads = receipt.get("comment_drift_leads") or []
    if drift_leads:
        parts.append("- **A-comment-drift Leads (verify stale comments/docs)**:")
        for dl in drift_leads[:20]:
            parts.append(f"  - `{dl['file']}:{dl['line']}` token=`{dl['token']}` `{dl['comment']}`")

    excuse_leads = receipt.get("excuse_comment_leads") or []
    if excuse_leads:
        parts.append("- **A-excuse-comment Leads (non-escalating; verify temporary/hack comments)**:")
        for ec in excuse_leads[:20]:
            parts.append(f"  - `{ec['file']}:{ec['line']}` `{ec['comment']}`")

    rt = receipt.get("runtime_verification")
    if isinstance(rt, dict):
        targets_str = json.dumps(rt.get("targets") or {}, ensure_ascii=False)
        parts.append(f"- **Runtime Verification Policy**: required=`{bool(rt.get('required'))}` targets=`{targets_str}`")
    if ev_dir.is_dir():
        rt_refs = sorted(ev_dir.glob("runtime-*"))
        if rt_refs:
            parts.append(f"- **Runtime Evidence Artifacts**: `{', '.join(p.name for p in rt_refs[:10])}`")

    if review_round > 1:
        prev_rev = task_dir / f"review-{review_round - 1}.md"
        prev_disp = task_dir / f"disposition-{review_round - 1}.md"
        if prev_rev.is_file():
            parts.extend(["", f"## Prior Review ({prev_rev.name})", "", prev_rev.read_text(encoding="utf-8")[:4000]])
        if prev_disp.is_file():
            parts.extend(["", f"## Writer Disposition ({prev_disp.name})", "", prev_disp.read_text(encoding="utf-8")[:3000]])

    for rname in receipt.get("changed_repos") or []:
        pfile = ev_dir / f"diff-{rname}.patch"
        if pfile.is_file():
            ptxt = pfile.read_text(encoding="utf-8", errors="ignore")
            if ptxt.strip():
                snippet = ptxt if len(ptxt) <= 8000 else ptxt[:8000] + f"\n...[truncated; inspect {pfile}]..."
                parts.extend(["", f"## Diff ({rname})", "```diff", snippet.rstrip(), "```"])

    parts.extend(
        [
            "",
            "## Required Output Format (EXACT top lines required)",
            "Start your final response with:",
            "```markdown",
            "VERDICT: PASS   (or NEEDS_CHANGES)",
            f"TREE: {primary_tree}",
            f"Health Score: {primary_repo} <0-100>/100",
            "",
            "BLOCKING:",
            "none",
            "(OR `- B-1: [Symptom -> Source -> Consequence -> Remedy] ...` if VERDICT is NEEDS_CHANGES)",
            "",
            "NOTES:",
            "none",
            "(OR `- N-1: ...` for non-blocking observations — do NOT use B-n for non-blockers)",
            "",
            "EVIDENCE:",
            "- `path:line` — verified fact",
            "```",
        ]
    )
    return "\n".join(parts) + "\n"


def normalize_review_markdown(
    raw_text: str,
    primary_tree: str,
    repo_trees: Optional[Dict[str, str]] = None,
) -> Tuple[str, str, int, int, List[Dict[str, object]]]:
    parsed_verdict, _, health_scores, active_b, _ = RM.parse_review_summary(raw_text)
    if parsed_verdict == "PASS" and active_b > 0:
        raise ValueError(
            f"Contradictory review output: VERDICT={parsed_verdict} with {active_b} active blocking finding(s)"
        )
    effective = "NEEDS_CHANGES" if (parsed_verdict != "PASS" or active_b > 0) else "PASS"

    body = raw_text.strip()
    if effective == "PASS":
        body = re.sub(r"(?m)^([`*\s]*)SUGGESTED\s*:", r"\1NOTES:", body)
        body = re.sub(r"(?m)^(\s*(?:[-*]\s*|\*\*)*)S-(\d+)\b", r"\1N-\2", body)

    lines = [
        ln
        for ln in body.splitlines()
        if not re.match(r"^\s*`?(?:VERDICT|TREE|REPO_TREES)\s*:", ln)
    ]
    header = [f"VERDICT: {effective}", f"TREE: {primary_tree}"]
    if repo_trees and len(repo_trees) > 1:
        summary = ", ".join(f"{k}={v}" for k, v in sorted(repo_trees.items()))
        header.append(f"REPO_TREES: {summary}")

    normalized = "\n".join(header + [""] + lines).rstrip() + "\n"
    _, _, hs_final, b_final, n_final = RM.parse_review_summary(normalized)
    if effective == "PASS" and b_final > 0:
        raise ValueError(f"Contradictory normalized review output: PASS with {b_final} blocker(s)")
    return normalized, effective, b_final, n_final, hs_final


def invoke_runner(
    *,
    runner_script: Path,
    spec: str,
    cwd: Path,
    prompt_file: Path,
    out_file: Path,
    timeout_ms: int,
    idle_timeout_ms: int,
) -> Tuple[int, str, str]:
    if not runner_script.is_file():
        raise FileNotFoundError(f"Runner script not found: {runner_script}")
    cmd_head = [sys.executable, str(runner_script)] if runner_script.suffix == ".py" else ["node", str(runner_script)]
    cmd = [
        *cmd_head,
        "--spec",
        spec,
        "--mode",
        "readonly-bash",
        "--cwd",
        str(cwd),
        "--prompt-file",
        str(prompt_file),
        "--out",
        str(out_file),
        "--timeout-ms",
        str(timeout_ms),
        "--idle-timeout-ms",
        str(idle_timeout_ms),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    return proc.returncode, proc.stdout, proc.stderr


def _parse_git_status_z(raw_bytes: bytes) -> List[Tuple[str, str, Optional[str]]]:
    tokens = raw_bytes.decode("utf-8", errors="surrogateescape").split("\0")
    entries: List[Tuple[str, str, Optional[str]]] = []
    i = 0
    while i < len(tokens):
        tok = tokens[i]
        if not tok or len(tok) < 4:
            i += 1
            continue
        xy = tok[:2]
        rel = tok[3:]
        orig: Optional[str] = None
        if xy[0] in ("R", "C") and i + 1 < len(tokens):
            orig = tokens[i + 1]
            i += 2
        else:
            i += 1
        entries.append((xy, rel, orig))
    return entries


def _should_skip_snapshot_sync(
    rel_path: str,
    repo_root: Path,
    repo_name: str,
    workspace: Optional[Dict[str, object]],
) -> bool:
    norm = SC.normalize_rel_path(rel_path).rstrip("/")
    if not norm:
        return True
    for root in SNAPSHOT_SKIP_ROOTS:
        if norm == root or norm.startswith(root + "/"):
            return True
    return SC.is_ignored_control_plane_path(repo_root, norm, repo_name, workspace)


def _is_ignored_snapshot_rel(
    rel_path: str,
    ignored_rel_paths: Set[str],
    repo_root: Path,
    repo_name: str,
    workspace: Optional[Dict[str, object]],
) -> bool:
    norm = SC.normalize_rel_path(rel_path).rstrip("/")
    if SC.is_ignored_control_plane_path(repo_root, norm, repo_name, workspace):
        return True
    for ign in ignored_rel_paths:
        ign_n = ign.rstrip("/")
        if norm == ign_n or norm.startswith(ign_n + "/"):
            return True
    if any(seg in TRANSIENT_CACHE_SEGMENTS for seg in norm.split("/")):
        return True
    if norm.endswith((".pyc", ".pyo", ".tsbuildinfo")):
        return True
    return False


def _resolve_overlay_target(src_entry: Path, repo_root: Path, snap_repo: Path) -> Path:
    try:
        if src_entry.is_symlink():
            raw_link = os.readlink(src_entry)
            target_abs = (
                Path(raw_link).resolve()
                if os.path.isabs(raw_link)
                else (src_entry.parent / raw_link).resolve()
            )
        else:
            target_abs = src_entry.resolve()
    except OSError:
        return src_entry
    try:
        rel = target_abs.relative_to(repo_root.resolve())
        if not rel.is_absolute():
            return snap_repo / rel
    except ValueError:
        pass
    return target_abs


def _mount_node_modules_overlay(
    src_nm: Path,
    dst_nm: Path,
    repo_root: Path,
    snap_repo: Path,
    ignored_rel_paths: Set[str],
    prefix: str,
) -> None:
    if not src_nm.exists() or dst_nm.exists() or dst_nm.is_symlink():
        return
    if src_nm.is_symlink():
        os.symlink(_resolve_overlay_target(src_nm, repo_root, snap_repo), dst_nm)
        ignored_rel_paths.add(prefix)
        return
    if not src_nm.is_dir():
        return

    dst_nm.mkdir(parents=True, exist_ok=True)
    (dst_nm / ".vite").mkdir(parents=True, exist_ok=True)
    (dst_nm / ".cache").mkdir(parents=True, exist_ok=True)
    ignored_rel_paths.add(f"{prefix}/.vite")
    ignored_rel_paths.add(f"{prefix}/.cache")

    for entry in src_nm.iterdir():
        if entry.name in (".vite", ".cache"):
            continue
        dst_child = dst_nm / entry.name
        child_rel = f"{prefix}/{entry.name}"
        try:
            is_real_dir = entry.is_dir() and not entry.is_symlink()
        except OSError:
            continue

        if entry.name.startswith("@") and is_real_dir:
            dst_child.mkdir(parents=True, exist_ok=True)
            for sub in entry.iterdir():
                dst_sub = dst_child / sub.name
                if not dst_sub.exists() and not dst_sub.is_symlink():
                    os.symlink(_resolve_overlay_target(sub, repo_root, snap_repo), dst_sub)
                    ignored_rel_paths.add(f"{child_rel}/{sub.name}")
            continue

        if not dst_child.exists() and not dst_child.is_symlink():
            os.symlink(_resolve_overlay_target(entry, repo_root, snap_repo), dst_child)
            ignored_rel_paths.add(child_rel)


def digest_worktree_snapshot(
    snap_repo: Path,
    ignored_rel_paths: Set[str],
    repo_root: Path,
    repo_name: str,
    workspace: Optional[Dict[str, object]],
) -> str:
    res = subprocess.run(
        ["git", "-C", str(snap_repo), "status", "--porcelain=v1", "-z", "-uall"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if res.returncode != 0:
        raise RuntimeError(
            f"git status failed in snapshot {snap_repo}: {res.stderr.decode('utf-8', errors='replace')}"
        )
    records: List[str] = []
    for xy, rel, orig in _parse_git_status_z(res.stdout):
        if _is_ignored_snapshot_rel(rel, ignored_rel_paths, repo_root, repo_name, workspace):
            continue
        full = snap_repo / rel
        if full.is_symlink():
            sig = f"symlink:{os.readlink(full)}"
        elif not full.exists():
            sig = "missing"
        elif full.is_dir():
            sig = "dir"
        else:
            st = full.stat()
            if st.st_size <= MAX_SNAP_FILE_BYTES:
                sig = hashlib.sha256(full.read_bytes()).hexdigest()
            else:
                sig = f"size:{st.st_size}:mtime_ns:{st.st_mtime_ns}"
        orig_tag = f"\t{orig}" if orig else ""
        records.append(f"{xy}\t{rel}{orig_tag}\t{sig}")
    records.sort()
    return hashlib.sha256("\n".join(records).encode("utf-8")).hexdigest()


def create_readonly_git_snapshot(
    repo_root: Path,
    repo_name: str,
    workspace: Optional[Dict[str, object]],
) -> Optional[Dict[str, object]]:
    repo_root = repo_root.resolve()
    head_chk = subprocess.run(
        ["git", "-C", str(repo_root), "rev-parse", "--verify", "HEAD"],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    if head_chk.returncode != 0:
        return None

    snap_parent = Path(tempfile.mkdtemp(prefix=f"sop-audit-ro-{repo_root.name}-"))
    snap_repo = snap_parent / "repo"
    snap_tmp = snap_parent / "tmp"
    snap_tmp.mkdir(parents=True, exist_ok=True)

    try:
        subprocess.run(
            ["git", "-C", str(repo_root), "worktree", "add", "--detach", "--quiet", str(snap_repo), "HEAD"],
            check=True,
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,
        )

        st_res = subprocess.run(
            ["git", "-C", str(repo_root), "status", "--porcelain=v1", "-z", "-uall"],
            check=True,
            capture_output=True,
            stdin=subprocess.DEVNULL,
        )
        for xy, rel, orig in _parse_git_status_z(st_res.stdout):
            if orig and not _should_skip_snapshot_sync(orig, repo_root, repo_name, workspace):
                old_dst = snap_repo / orig
                if old_dst.is_symlink() or old_dst.is_file():
                    old_dst.unlink(missing_ok=True)
            if _should_skip_snapshot_sync(rel, repo_root, repo_name, workspace):
                continue
            src = repo_root / rel
            dst = snap_repo / rel
            if "D" in xy and not src.exists() and not src.is_symlink():
                if dst.is_symlink() or dst.is_file():
                    dst.unlink(missing_ok=True)
                continue
            if src.is_symlink():
                dst.parent.mkdir(parents=True, exist_ok=True)
                if dst.is_symlink() or dst.is_file():
                    dst.unlink(missing_ok=True)
                os.symlink(os.readlink(src), dst)
            elif src.is_file():
                dst.parent.mkdir(parents=True, exist_ok=True)
                if dst.is_symlink() or dst.is_file():
                    dst.unlink(missing_ok=True)
                shutil.copy2(src, dst)

        ignored: Set[str] = set()
        _mount_node_modules_overlay(
            repo_root / "node_modules", snap_repo / "node_modules", repo_root, snap_repo, ignored, "node_modules"
        )
        pkg_dir = repo_root / "packages"
        if pkg_dir.is_dir():
            for child in pkg_dir.iterdir():
                if child.is_dir() and (child / "node_modules").exists():
                    _mount_node_modules_overlay(
                        child / "node_modules",
                        snap_repo / "packages" / child.name / "node_modules",
                        repo_root,
                        snap_repo,
                        ignored,
                        f"packages/{child.name}/node_modules",
                    )

        src_venv = repo_root / ".venv"
        dst_venv = snap_repo / ".venv"
        if src_venv.exists() and not dst_venv.exists() and not dst_venv.is_symlink():
            os.symlink(src_venv.resolve(), dst_venv)
            ignored.add(".venv")

        initial_digest = digest_worktree_snapshot(snap_repo, ignored, repo_root, repo_name, workspace)
        return {
            "repo": repo_name,
            "source_repo": str(repo_root),
            "snap_parent": str(snap_parent),
            "snap_repo": str(snap_repo),
            "snap_tmp": str(snap_tmp),
            "ignored_rel_paths": sorted(ignored),
            "initial_digest": initial_digest,
        }
    except Exception:
        cleanup_readonly_git_snapshot({"source_repo": str(repo_root), "snap_parent": str(snap_parent), "snap_repo": str(snap_repo)})
        raise


def cleanup_readonly_git_snapshot(snap_meta: Dict[str, object]) -> None:
    source_repo = Path(str(snap_meta.get("source_repo") or ""))
    snap_repo = Path(str(snap_meta.get("snap_repo") or ""))
    snap_parent = Path(str(snap_meta.get("snap_parent") or ""))
    if source_repo.is_dir() and str(snap_repo):
        subprocess.run(
            ["git", "-C", str(source_repo), "worktree", "remove", "--force", str(snap_repo)],
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,
        )
        subprocess.run(
            ["git", "-C", str(source_repo), "worktree", "prune"],
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,
        )
    if str(snap_parent) and snap_parent.exists() and snap_parent.name.startswith("sop-audit-ro-"):
        shutil.rmtree(snap_parent, ignore_errors=True)


def check_snapshots_integrity(
    snapshots: Dict[str, Dict[str, object]],
    workspace: Optional[Dict[str, object]],
) -> List[str]:
    violations: List[str] = []
    for rname, sm in sorted((snapshots or {}).items()):
        snap_repo = Path(str(sm.get("snap_repo") or ""))
        source_repo = Path(str(sm.get("source_repo") or ""))
        if not snap_repo.is_dir():
            violations.append(f"Snapshot missing for {rname}: {snap_repo}")
            continue
        cur = digest_worktree_snapshot(
            snap_repo, set(sm.get("ignored_rel_paths") or []), source_repo, rname, workspace
        )
        if cur != sm.get("initial_digest"):
            violations.append(
                f"Readonly snapshot tampered for {rname}: initial={sm.get('initial_digest')}, current={cur}"
            )
    return violations


def parse_cli_spec(spec: str) -> Tuple[str, Optional[str], Optional[str]]:
    parts = spec.split(":")
    if len(parts) < 2 or parts[0] != "cli" or parts[1] not in ("claude", "codex"):
        raise ValueError(f"Unsupported spec for hc backend: {spec!r}")
    cli = parts[1]
    if cli == "codex":
        model = ":".join(parts[2:]) or None
        return cli, model, None
    model = parts[2] if len(parts) >= 3 and parts[2] else None
    effort = parts[3] if len(parts) >= 4 and parts[3] else None
    return cli, model, effort


def build_hc_agent_argv(spec: str, pointer_prompt: str) -> List[str]:
    cli, model, effort = parse_cli_spec(spec)
    if cli == "claude":
        cmd = ["claude"]
        if model:
            cmd.extend(["--model", model])
        if effort:
            cmd.extend(["--effort", effort])
        cmd.append("--dangerously-skip-permissions")
        cmd.append(pointer_prompt)
        return cmd
    cmd = ["codex", "--no-daemon", "--dangerously-bypass-approvals-and-sandbox"]
    if model:
        cmd.extend(["-m", model])
    cmd.append(pointer_prompt)
    return cmd


def check_hc_daemon_available() -> bool:
    if not shutil.which("hc") or SC.resolve_herdr_scripts_dir() is None:
        return False
    res = subprocess.run(["hc", "ls", "--json"], capture_output=True, text=True, stdin=subprocess.DEVNULL)
    return res.returncode == 0


def resolve_backend(backend_arg: str, runner_script: Path, hc_available: Optional[bool] = None) -> str:
    if backend_arg == "runner":
        return "runner"
    if backend_arg == "hc":
        return "hc"
    if runner_script.resolve() != SC.resolve_runner_script().resolve():
        return "runner"
    if hc_available is None:
        hc_available = check_hc_daemon_available()
    return "hc" if hc_available else "runner"


def _herdr_cmd(herdr_agent_py: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(herdr_agent_py), *args],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )


def _herdr_status(herdr_agent_py: Path, task_dir: Path, slot: str) -> Dict[str, object]:
    res = _herdr_cmd(herdr_agent_py, "status", "--task-dir", str(task_dir), "--slot", slot)
    if not res.stdout.strip():
        return {"slot": slot, "state": "absent", "running": False}
    try:
        return json.loads(res.stdout)
    except ValueError:
        return {"slot": slot, "state": "absent", "running": False}


def _herdr_read(herdr_agent_py: Path, task_dir: Path, slot: str, lines: int = 120) -> str:
    res = _herdr_cmd(herdr_agent_py, "read", "--task-dir", str(task_dir), "--slot", slot, "--lines", str(lines), "--clean")
    return res.stdout if res.returncode == 0 else ""


def _herdr_close_idle(herdr_agent_py: Path, task_dir: Path, slot: Optional[str] = None) -> None:
    cmd = ["close", "--task-dir", str(task_dir)]
    if slot:
        cmd.extend(["--slot", slot])
    cmd.append("--idle")
    _herdr_cmd(herdr_agent_py, *cmd)


def is_quota_screen(text: str) -> bool:
    tail = "\n".join(text.splitlines()[-80:])
    return bool(STRICT_QUOTA_SCREEN_RE.search(tail))


def _armed_pid_alive(armed_path: Path) -> bool:
    if not armed_path.is_file():
        return False
    for ln in armed_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if ln.startswith("pid="):
            raw = ln[4:].strip()
            if raw.isdigit():
                try:
                    os.kill(int(raw), 0)
                    return True
                except ProcessLookupError:
                    return False
                except PermissionError:
                    return True
    return False


def _next_free_arm_slot(waits_dir: Path, hc_slot: str, review_round: int, start_idx: int = 1) -> Tuple[str, int]:
    idx = max(1, start_idx)
    while True:
        cand = f"{hc_slot}-r{review_round}-w{idx}"
        if not any((waits_dir / f"{cand}{ext}").exists() for ext in (".armed", ".settled", ".out")):
            return cand, idx
        idx += 1


def _build_hc_arm_argv(
    *,
    await_sh: Path,
    task_dir: Path,
    arm_slot: str,
    timeout_s: int,
    spec: str,
    exec_cwd: Path,
    purpose: str,
    raw_out_path: Path,
    wait_cmd: List[str],
) -> Tuple[List[str], str]:
    cli, model, effort = parse_cli_spec(spec)
    argv = [
        str(await_sh.resolve()),
        "arm",
        "--dir",
        str(task_dir.resolve()),
        "--slot",
        arm_slot,
        "--timeout-s",
        str(timeout_s),
        "--meta",
        f"agent={cli}",
        "--meta",
        f"model={model or 'default'}",
        "--meta",
        f"effort={effort or 'default'}",
        "--meta",
        f"cwd={exec_cwd}",
        "--meta",
        f"purpose={purpose}",
        "--artifact",
        str(raw_out_path.resolve()),
        "--",
        *wait_cmd,
    ]
    return argv, " ".join(shlex.quote(a) for a in argv)


def _read_settled_file(settled_path: Path) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not settled_path.is_file():
        return out
    for ln in settled_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if "=" in ln:
            k, v = ln.split("=", 1)
            out[k.strip()] = v.strip()
    return out


def _wait_for_sentinel(settled_path: Path, poll_s: float = 0.2, max_wait_s: Optional[float] = None) -> bool:
    deadline = time.monotonic() + max_wait_s if max_wait_s is not None else None
    while not settled_path.is_file():
        if deadline is not None and time.monotonic() >= deadline:
            return False
        time.sleep(poll_s)
    return True


def _save_hc_partial_output(raw_out_path: Path, screen_text: str) -> Optional[Path]:
    partial_path = Path(f"{raw_out_path}.partial")
    if raw_out_path.is_file() and raw_out_path.read_text(encoding="utf-8", errors="ignore").strip():
        partial_path.write_text(raw_out_path.read_text(encoding="utf-8", errors="ignore"), encoding="utf-8")
        return partial_path
    if screen_text.strip():
        partial_path.write_text(screen_text.strip() + "\n", encoding="utf-8")
        return partial_path
    return partial_path if partial_path.is_file() else None


def _select_primary_repo(
    receipt: Dict[str, object],
    repo_paths: Dict[str, str],
    repo_trees: Dict[str, str],
    sop_root: Path,
    workspace: Dict[str, object],
) -> Tuple[str, str, Path]:
    changed_repos = list(receipt.get("changed_repos") or [])
    if changed_repos:
        primary_repo = changed_repos[0]
    elif repo_paths:
        primary_repo = sorted(repo_paths.keys())[0]
    else:
        primary_repo = sop_root.name
        repo_paths[primary_repo] = str(sop_root.resolve())
        repo_trees[primary_repo] = SC.tree_stamp_for_repo(sop_root.resolve(), primary_repo, workspace)
    return primary_repo, repo_trees[primary_repo], Path(repo_paths[primary_repo]).resolve()


def _finalize_valid_review_output(
    *,
    task_dir: Path,
    ev_dir: Path,
    audit_result_path: Path,
    receipt: Dict[str, object],
    raw_text: str,
    raw_out_path: Path,
    primary_repo: str,
    primary_tree: str,
    repo_trees: Dict[str, str],
    repo_paths: Dict[str, str],
    combined_tree: str,
    risk_tier: str,
    audit_mode: str,
    chosen_spec: str,
    failover_log: List[Dict[str, object]],
    review_round: int,
    cal: Dict[str, object],
    calibration_file: Path,
    metrics_root: Path,
) -> Tuple[int, Dict[str, object]]:
    try:
        norm_md, effective_verdict, active_b, notes_cnt, health_scores = normalize_review_markdown(
            raw_text, primary_tree, repo_trees=repo_trees
        )
    except ValueError as exc:
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_MALFORMED_VERDICT",
            "error": str(exc),
            "reviewer_spec": chosen_spec,
            "raw_output_path": str(raw_out_path),
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 2, res_payload

    changed_repos = list(receipt.get("changed_repos") or [])
    bheads = {
        r: ((receipt.get("baselines") or {}).get(r) or {}).get("head")
        for r in sorted(changed_repos or repo_paths.keys())
    }
    fp = hashlib.sha256(
        json.dumps({"heads": bheads, "combined_tree": combined_tree}, sort_keys=True).encode("utf-8")
    ).hexdigest()[:16]

    review_path = task_dir / f"review-{review_round}.md"
    review_path.write_text(norm_md, encoding="utf-8")

    metrics_path = RM.write_metrics(task_dir, review_path, risk_tier, metrics_root.resolve())
    mdata = json.loads(metrics_path.read_text(encoding="utf-8"))
    mdata["audit_mode"] = audit_mode
    mdata["reviewer_spec"] = chosen_spec
    mdata["failover_used"] = len(failover_log) > 0
    mdata["gate_combined_tree"] = combined_tree
    mdata["calibration_fingerprint"] = fp
    metrics_path.write_text(json.dumps(mdata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    if risk_tier == "T1_STANDARD":
        clean_slugs: List[str] = list(cal.get("clean_task_slugs") or [])
        clean_fps: List[str] = list(cal.get("clean_fingerprints") or [])
        prior_history: List[Dict[str, object]] = list(cal.get("history") or [])
        has_handoff = any(
            p.is_file() and bool(p.read_text(encoding="utf-8", errors="ignore").strip())
            for p in task_dir.glob("handoff-*.md")
        )

        if effective_verdict != "PASS":
            clean_slugs = []
            clean_fps = []
            cal["clean_task_slugs"] = clean_slugs
            cal["clean_fingerprints"] = clean_fps
            cal["consecutive_clean_t1"] = 0
            cal["graduated"] = False
        elif audit_mode == "shadow_calibration":
            had_prior_fail = any(
                h.get("task_slug") == task_dir.name and h.get("verdict") != "PASS"
                for h in prior_history
            )
            if (
                review_round == 1
                and not had_prior_fail
                and has_handoff
                and task_dir.name not in clean_slugs
                and fp not in clean_fps
            ):
                clean_slugs.append(task_dir.name)
                clean_fps.append(fp)
            cal["clean_task_slugs"] = clean_slugs
            cal["clean_fingerprints"] = clean_fps
            cal["consecutive_clean_t1"] = len(clean_fps)
            cal["graduated"] = len(clean_fps) >= GRADUATION_THRESHOLD

        prior_history.append(
            {
                "task_slug": task_dir.name,
                "review_round": review_round,
                "audit_mode": audit_mode,
                "verdict": effective_verdict,
                "active_blockers_count": active_b,
                "reviewer_spec": chosen_spec,
                "fingerprint": fp,
                "tree": primary_tree,
                "at_utc": SC.utc_now_iso(),
            }
        )
        cal["history"] = prior_history[-50:]
        save_calibration(calibration_file, cal)

    final_status = (
        "AUDIT_PASS"
        if effective_verdict == "PASS"
        else ("SHADOW_BLOCKER_CAUGHT" if audit_mode == "shadow_calibration" else "AUDIT_NEEDS_CHANGES")
    )
    res_payload = {
        "schema_version": 1,
        "status": final_status,
        "verdict": effective_verdict,
        "risk_tier": risk_tier,
        "audit_mode": audit_mode,
        "reviewer_spec": chosen_spec,
        "failover_used": len(failover_log) > 0,
        "failover_log": failover_log,
        "review_path": str(review_path),
        "metrics_path": str(metrics_path),
        "primary_tree": primary_tree,
        "combined_tree": combined_tree,
        "active_blockers_count": active_b,
        "notes_count": notes_cnt,
        "health_scores": health_scores,
        "calibration": {
            "consecutive_clean_t1": cal.get("consecutive_clean_t1"),
            "graduation_threshold": GRADUATION_THRESHOLD,
            "graduated": cal.get("graduated"),
        },
        "checked_at_utc": SC.utc_now_iso(),
    }
    audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return (0 if effective_verdict == "PASS" else 1), res_payload


def _cleanup_hc_state(
    ev_dir: Path,
    state: Optional[Dict[str, object]],
    herdr_agent_py: Path,
    task_dir: Path,
    *,
    close_terminal: bool = True,
) -> None:
    if state:
        hc_slot = state.get("hc_slot")
        if close_terminal and isinstance(hc_slot, str) and hc_slot:
            _herdr_close_idle(herdr_agent_py, task_dir, hc_slot)
        for snap_meta in (state.get("snapshots") or {}).values():
            if isinstance(snap_meta, dict):
                cleanup_readonly_git_snapshot(snap_meta)
    state_path = ev_dir / HC_STATE_FILENAME
    if state_path.is_file():
        state_path.unlink(missing_ok=True)


def _save_hc_state(state_path: Path, state: Dict[str, object]) -> None:
    state["updated_at_utc"] = SC.utc_now_iso()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _build_launch_or_resume_arm(
    *,
    spec: str,
    hc_slot: str,
    exec_cwd: Path,
    prompt_path: Path,
    raw_out_path: Path,
    task_dir: Path,
    waits_dir: Path,
    review_round: int,
    arm_index: int,
    timeout_s: int,
    reuse_session: bool,
    cur_info: Dict[str, object],
    herdr_agent_py: Path,
    await_sh: Path,
) -> Tuple[List[str], str, str, int, int]:
    arm_slot, new_idx = _next_free_arm_slot(waits_dir, hc_slot, review_round, arm_index)
    pointer = (
        f"Read {prompt_path} and follow it using readonly snapshot {exec_cwd} "
        f"(write output to {raw_out_path})."
    )
    can_reuse = (
        reuse_session
        and bool(cur_info.get("running"))
        and str(cur_info.get("status") or "") in ("idle", "done")
        and not is_quota_screen(_herdr_read(herdr_agent_py, task_dir, hc_slot, lines=80))
    )
    if can_reuse:
        baseline_turn = int(cur_info.get("turn") or 0)
        wait_cmd = [
            sys.executable,
            str(herdr_agent_py.resolve()),
            "resume",
            "--task-dir",
            str(task_dir.resolve()),
            "--slot",
            hc_slot,
            "--",
            pointer,
        ]
        purpose = f"resume audit review-{review_round}"
    else:
        baseline_turn = 0
        cli_argv = build_hc_agent_argv(spec, pointer)
        wait_cmd = [
            sys.executable,
            str(herdr_agent_py.resolve()),
            "run",
            "--task-dir",
            str(task_dir.resolve()),
            "--slot",
            hc_slot,
            "--cwd",
            str(exec_cwd),
            "--fresh-reason",
            f"audit_r{review_round}",
        ]
        if str(cur_info.get("state") or "") == "live":
            wait_cmd.append("--force")
        wait_cmd.extend(["--", *cli_argv])
        purpose = f"independent audit review-{review_round}"

    arm_argv, arm_command = _build_hc_arm_argv(
        await_sh=await_sh,
        task_dir=task_dir,
        arm_slot=arm_slot,
        timeout_s=timeout_s,
        spec=spec,
        exec_cwd=exec_cwd,
        purpose=purpose,
        raw_out_path=raw_out_path,
        wait_cmd=wait_cmd,
    )
    return arm_argv, arm_command, arm_slot, new_idx, baseline_turn


def prepare_hc_audit(
    *,
    task_dir: Path,
    sop_root: Path,
    workspace: Dict[str, object],
    shadow_flag: bool = False,
    force_flag: bool = False,
    policy_file: Optional[Path] = None,
    calibration_file: Path,
    metrics_root: Path,
    expected_lock_file: Path,
    allow_custom_repos: bool = False,
    timeout_ms: int = 1800000,
    reuse_session: bool = False,
    await_sh: Path,
    herdr_agent_py: Path,
) -> Tuple[Optional[int], Dict[str, object]]:
    task_dir = task_dir.resolve()
    ev_dir = task_dir / "evidence"
    ev_dir.mkdir(parents=True, exist_ok=True)
    waits_dir = task_dir / "waits"
    audit_result_path = ev_dir / "audit-result.json"
    state_path = ev_dir / HC_STATE_FILENAME

    existing_state: Optional[Dict[str, object]] = None
    if state_path.is_file():
        try:
            existing_state = json.loads(state_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing_state = None

    receipt, problems = verify_receipt_and_trees(task_dir, expected_lock_file, allow_custom_repos, sop_root=sop_root)
    if problems or receipt is None:
        if existing_state is not None:
            _cleanup_hc_state(ev_dir, existing_state, herdr_agent_py, task_dir, close_terminal=True)
        res_payload = {"schema_version": 1, "status": "AUDIT_REFUSED", "reasons": problems, "checked_at_utc": SC.utc_now_iso()}
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 3, res_payload

    risk_tier = str(receipt["risk_tier"])
    combined_tree = str(receipt["combined_tree"])
    repo_paths: Dict[str, str] = dict(receipt["repo_paths"])
    repo_trees: Dict[str, str] = dict(receipt["repo_trees"])

    if risk_tier == "T0_READONLY" and not force_flag:
        if existing_state is not None:
            _cleanup_hc_state(ev_dir, existing_state, herdr_agent_py, task_dir, close_terminal=True)
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_SKIPPED_READONLY",
            "risk_tier": risk_tier,
            "combined_tree": combined_tree,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 0, res_payload

    cal = load_calibration(calibration_file, metrics_root.resolve())
    if risk_tier == "T1_STANDARD":
        if cal.get("graduated") and not shadow_flag and not force_flag:
            rt_err = check_runtime_evidence_for_fastpath(task_dir, receipt)
            if rt_err is not None:
                audit_result_path.write_text(json.dumps(rt_err, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                return 3, rt_err
            if existing_state is not None:
                _cleanup_hc_state(ev_dir, existing_state, herdr_agent_py, task_dir, close_terminal=True)
            mpath = write_fastpath_metrics(task_dir, risk_tier, combined_tree, metrics_root, "t1_fastpath")
            res_payload = {
                "schema_version": 1,
                "status": "AUDIT_FASTPATH_T1",
                "risk_tier": risk_tier,
                "combined_tree": combined_tree,
                "metrics_path": str(mpath),
                "consecutive_clean_t1": cal.get("consecutive_clean_t1"),
                "graduation_threshold": GRADUATION_THRESHOLD,
                "checked_at_utc": SC.utc_now_iso(),
            }
            audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            return 0, res_payload
        audit_mode = "forced" if force_flag else "shadow_calibration"
    else:
        audit_mode = "forced" if force_flag else "mandatory"

    primary_repo, primary_tree, primary_cwd = _select_primary_repo(receipt, repo_paths, repo_trees, sop_root, workspace)
    review_round = next_review_index(task_dir)
    timeout_s = max(1, (timeout_ms + 999) // 1000)

    if (
        existing_state is not None
        and existing_state.get("combined_tree") == combined_tree
        and int(existing_state.get("review_round") or 0) == review_round
    ):
        pending_slot = existing_state.get("pending_arm_slot")
        pending_argv = existing_state.get("pending_arm_argv")
        pending_cmd = existing_state.get("pending_arm_command")
        if (
            isinstance(pending_slot, str)
            and pending_slot
            and isinstance(pending_argv, list)
            and isinstance(pending_cmd, str)
            and not (waits_dir / f"{pending_slot}.armed").exists()
            and not (waits_dir / f"{pending_slot}.settled").exists()
        ):
            existing_state["active_arm_slot"] = pending_slot
            existing_state["arm_argv"] = pending_argv
            existing_state["arm_command"] = pending_cmd
            pending_status = str(existing_state.pop("pending_status", "AUDIT_ARM_READY"))
            existing_state.pop("pending_arm_slot", None)
            existing_state.pop("pending_arm_argv", None)
            existing_state.pop("pending_arm_command", None)
            existing_state["timeout_s"] = timeout_s
            _save_hc_state(state_path, existing_state)
            return None, {
                "schema_version": 1,
                "status": pending_status,
                "risk_tier": risk_tier,
                "audit_mode": audit_mode,
                "hc_slot": existing_state["hc_slot"],
                "active_arm_slot": pending_slot,
                "arm_argv": pending_argv,
                "arm_command": pending_cmd,
                "timeout_s": timeout_s,
                "ready_to_finalize": False,
                "checked_at_utc": SC.utc_now_iso(),
            }

        hc_slot = str(existing_state["hc_slot"])
        active_slot = str(existing_state["active_arm_slot"])
        armed_f = waits_dir / f"{active_slot}.armed"
        settled_f = waits_dir / f"{active_slot}.settled"
        if armed_f.is_file() and not settled_f.is_file() and _armed_pid_alive(armed_f):
            return None, {
                "schema_version": 1,
                "status": "AUDIT_ARM_READY",
                "already_armed": True,
                "risk_tier": risk_tier,
                "audit_mode": audit_mode,
                "hc_slot": hc_slot,
                "active_arm_slot": active_slot,
                "arm_argv": existing_state["arm_argv"],
                "arm_command": existing_state["arm_command"],
                "timeout_s": timeout_s,
                "ready_to_finalize": False,
                "checked_at_utc": SC.utc_now_iso(),
            }

        st_info = _herdr_status(herdr_agent_py, task_dir, hc_slot)
        t_running = bool(st_info.get("running"))
        t_status = str(st_info.get("status") or "")
        t_turn = int(st_info.get("turn") or 0)
        baseline_turn = int(existing_state.get("baseline_turn") or 0)
        settled_rc = _read_settled_file(settled_f).get("rc") if settled_f.is_file() else None

        if not t_running and str(st_info.get("state") or "") == "absent" and not settled_f.is_file():
            _cleanup_hc_state(ev_dir, existing_state, herdr_agent_py, task_dir, close_terminal=False)
            existing_state = None
        elif (
            (not t_running)
            or (settled_rc is not None and settled_rc != "124")
            or (t_turn > baseline_turn and t_status in ("idle", "done", "blocked", "error"))
        ):
            return None, {
                "schema_version": 1,
                "status": "AUDIT_READY_TO_FINALIZE",
                "risk_tier": risk_tier,
                "audit_mode": audit_mode,
                "hc_slot": hc_slot,
                "active_arm_slot": active_slot,
                "arm_command": existing_state.get("arm_command"),
                "timeout_s": timeout_s,
                "ready_to_finalize": True,
                "checked_at_utc": SC.utc_now_iso(),
            }
        else:
            cur_spec = list(existing_state["reviewer_specs"])[int(existing_state["spec_index"])]
            exec_cwd = Path(str(existing_state["exec_cwd"]))
            raw_out_path = Path(str(existing_state["raw_out_path"]))
            next_slot, next_idx = _next_free_arm_slot(waits_dir, hc_slot, review_round, int(existing_state.get("arm_index", 1)) + 1)
            wait_cmd = [
                sys.executable,
                str(herdr_agent_py.resolve()),
                "wait",
                "--task-dir",
                str(task_dir.resolve()),
                "--slot",
                hc_slot,
                "--since-turn",
                str(baseline_turn),
            ]
            arm_argv, arm_command = _build_hc_arm_argv(
                await_sh=await_sh,
                task_dir=task_dir,
                arm_slot=next_slot,
                timeout_s=timeout_s,
                spec=cur_spec,
                exec_cwd=exec_cwd,
                purpose=f"continue audit review-{review_round}",
                raw_out_path=raw_out_path,
                wait_cmd=wait_cmd,
            )
            existing_state["arm_index"] = next_idx
            existing_state["active_arm_slot"] = next_slot
            existing_state["arm_argv"] = arm_argv
            existing_state["arm_command"] = arm_command
            existing_state["timeout_s"] = timeout_s
            existing_state.pop("continue_arm_slot", None)
            existing_state.pop("continue_arm_command", None)
            _save_hc_state(state_path, existing_state)
            return None, {
                "schema_version": 1,
                "status": "AUDIT_CONTINUE_READY",
                "risk_tier": risk_tier,
                "audit_mode": audit_mode,
                "hc_slot": hc_slot,
                "active_arm_slot": next_slot,
                "arm_argv": arm_argv,
                "arm_command": arm_command,
                "timeout_s": timeout_s,
                "ready_to_finalize": False,
                "checked_at_utc": SC.utc_now_iso(),
            }

    if existing_state is not None:
        _cleanup_hc_state(ev_dir, existing_state, herdr_agent_py, task_dir, close_terminal=True)

    _, policy = SC.resolve_policy(policy_file, sop_root=sop_root, cwd=primary_cwd)
    reviewer_specs = resolve_reviewer_specs(policy)

    changed_repos = list(receipt.get("changed_repos") or [])
    target_repos = changed_repos if changed_repos else [primary_repo]
    snapshots: Dict[str, Dict[str, object]] = {}
    try:
        for rname in target_repos:
            rpath = Path(repo_paths.get(rname) or primary_cwd).resolve()
            snap = create_readonly_git_snapshot(rpath, rname, workspace)
            if snap is not None:
                snapshots[rname] = snap
    except Exception:
        for sm in snapshots.values():
            cleanup_readonly_git_snapshot(sm)
        raise

    failover_log: List[Dict[str, object]] = []
    chosen_idx: Optional[int] = None
    chosen_info: Dict[str, object] = {}
    for idx, cand_spec in enumerate(reviewer_specs):
        cli, _, _ = parse_cli_spec(cand_spec)
        cand_slot = f"reviewer-{cli}"
        st_cand = _herdr_status(herdr_agent_py, task_dir, cand_slot)
        if st_cand.get("running") and is_quota_screen(_herdr_read(herdr_agent_py, task_dir, cand_slot, lines=80)):
            failover_log.append({"spec": cand_spec, "returncode": EXIT_QUOTA, "stderr_tail": "Preserved quota-limited hc session"})
            continue
        chosen_idx = idx
        chosen_info = st_cand
        break

    if chosen_idx is None:
        for sm in snapshots.values():
            cleanup_readonly_git_snapshot(sm)
        res_payload = {
            "schema_version": 1,
            "status": "HOLD_QUOTA_EXHAUSTED",
            "risk_tier": risk_tier,
            "combined_tree": combined_tree,
            "failover_log": failover_log,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return EXIT_QUOTA, res_payload

    spec = reviewer_specs[chosen_idx]
    cli, _, _ = parse_cli_spec(spec)
    hc_slot = f"reviewer-{cli}"
    exec_cwd = Path(str(snapshots[primary_repo]["snap_repo"])) if primary_repo in snapshots else primary_cwd
    raw_out_path = (ev_dir / f"audit-raw-{review_round}.md").resolve()
    raw_out_path.unlink(missing_ok=True)
    Path(f"{raw_out_path}.partial").unlink(missing_ok=True)
    prompt_path = (ev_dir / f"audit-prompt-{review_round}.md").resolve()
    prompt_path.write_text(
        build_audit_prompt(
            task_dir,
            receipt,
            primary_repo,
            primary_tree,
            review_round,
            workspace=workspace,
            snapshots=snapshots,
            raw_out_path=raw_out_path,
            hc_mode=True,
        ),
        encoding="utf-8",
    )

    arm_argv, arm_command, arm_slot, new_idx, baseline_turn = _build_launch_or_resume_arm(
        spec=spec,
        hc_slot=hc_slot,
        exec_cwd=exec_cwd,
        prompt_path=prompt_path,
        raw_out_path=raw_out_path,
        task_dir=task_dir,
        waits_dir=waits_dir,
        review_round=review_round,
        arm_index=1,
        timeout_s=timeout_s,
        reuse_session=reuse_session,
        cur_info=chosen_info,
        herdr_agent_py=herdr_agent_py,
        await_sh=await_sh,
    )

    new_state: Dict[str, object] = {
        "schema_version": 1,
        "task_dir": str(task_dir),
        "sop_root": str(sop_root),
        "combined_tree": combined_tree,
        "primary_repo": primary_repo,
        "primary_tree": primary_tree,
        "repo_trees": repo_trees,
        "repo_paths": repo_paths,
        "risk_tier": risk_tier,
        "audit_mode": audit_mode,
        "review_round": review_round,
        "reuse_session": reuse_session,
        "snapshots": snapshots,
        "exec_cwd": str(exec_cwd),
        "reviewer_specs": reviewer_specs,
        "spec_index": chosen_idx,
        "hc_slot": hc_slot,
        "arm_index": new_idx,
        "active_arm_slot": arm_slot,
        "baseline_turn": baseline_turn,
        "nudge_count": 0,
        "failover_log": failover_log,
        "prompt_path": str(prompt_path),
        "raw_out_path": str(raw_out_path),
        "arm_argv": arm_argv,
        "arm_command": arm_command,
        "timeout_s": timeout_s,
        "created_at_utc": SC.utc_now_iso(),
    }
    _save_hc_state(state_path, new_state)
    return None, {
        "schema_version": 1,
        "status": "AUDIT_ARM_READY",
        "risk_tier": risk_tier,
        "audit_mode": audit_mode,
        "reviewer_spec": spec,
        "hc_slot": hc_slot,
        "active_arm_slot": arm_slot,
        "arm_argv": arm_argv,
        "arm_command": arm_command,
        "snapshots": {k: v["snap_repo"] for k, v in snapshots.items()},
        "timeout_s": timeout_s,
        "ready_to_finalize": False,
        "checked_at_utc": SC.utc_now_iso(),
    }


def finalize_hc_audit(
    *,
    task_dir: Path,
    sop_root: Path,
    workspace: Dict[str, object],
    calibration_file: Path,
    metrics_root: Path,
    expected_lock_file: Path,
    allow_custom_repos: bool = False,
    timeout_ms: int = 1800000,
    reuse_session: bool = False,
    await_sh: Path,
    herdr_agent_py: Path,
) -> Tuple[int, Dict[str, object]]:
    task_dir = task_dir.resolve()
    ev_dir = task_dir / "evidence"
    waits_dir = task_dir / "waits"
    audit_result_path = ev_dir / "audit-result.json"
    state_path = ev_dir / HC_STATE_FILENAME

    if not state_path.is_file():
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_NO_ACTIVE_HC_STATE",
            "reasons": [f"Missing {state_path}; run sop-audit.py --prepare first"],
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 2, res_payload

    state: Dict[str, object] = json.loads(state_path.read_text(encoding="utf-8"))
    hc_slot = str(state["hc_slot"])
    active_slot = str(state["active_arm_slot"])

    for candidate_key in ("pending_arm_slot", "continue_arm_slot"):
        cand_slot = state.get(candidate_key)
        if isinstance(cand_slot, str) and cand_slot and (
            (waits_dir / f"{cand_slot}.armed").exists() or (waits_dir / f"{cand_slot}.settled").exists()
        ):
            active_slot = cand_slot
            state["active_arm_slot"] = active_slot
            m = re.search(r"-w(\d+)$", active_slot)
            if m:
                state["arm_index"] = max(int(state.get("arm_index") or 1), int(m.group(1)))
            for k in ("pending_arm_slot", "pending_arm_argv", "pending_arm_command", "pending_status", "continue_arm_slot", "continue_arm_command"):
                state.pop(k, None)
            _save_hc_state(state_path, state)

    settled_path = waits_dir / f"{active_slot}.settled"
    settled_rc = _read_settled_file(settled_path).get("rc")

    st_info = _herdr_status(herdr_agent_py, task_dir, hc_slot)
    screen_text = _herdr_read(herdr_agent_py, task_dir, hc_slot, lines=120)
    raw_out_path = Path(str(state["raw_out_path"]))
    raw_text = raw_out_path.read_text(encoding="utf-8", errors="ignore") if raw_out_path.is_file() else ""
    reviewer_specs: List[str] = list(state["reviewer_specs"])
    spec_idx = int(state["spec_index"])
    chosen_spec = reviewer_specs[spec_idx]
    snapshots: Dict[str, Dict[str, object]] = dict(state.get("snapshots") or {})
    review_round = int(state["review_round"])
    timeout_s = max(1, (timeout_ms + 999) // 1000)
    exec_cwd = Path(str(state["exec_cwd"]))
    baseline_turn = int(state.get("baseline_turn") or 0)
    failover_log: List[Dict[str, object]] = list(state.get("failover_log") or [])

    t_running = bool(st_info.get("running"))
    t_status = str(st_info.get("status") or "")
    t_turn = int(st_info.get("turn") or 0)
    still_working = t_running and (t_status == "working" or (not raw_text.strip() and t_turn <= baseline_turn))

    if not raw_text.strip() and (settled_rc == "124" or still_working):
        partial_path = _save_hc_partial_output(raw_out_path, screen_text)
        cont_slot, _ = _next_free_arm_slot(waits_dir, hc_slot, review_round, int(state.get("arm_index") or 1) + 1)
        wait_cmd = [
            sys.executable,
            str(herdr_agent_py.resolve()),
            "wait",
            "--task-dir",
            str(task_dir.resolve()),
            "--slot",
            hc_slot,
            "--since-turn",
            str(baseline_turn),
        ]
        _, cont_cmd = _build_hc_arm_argv(
            await_sh=await_sh,
            task_dir=task_dir,
            arm_slot=cont_slot,
            timeout_s=timeout_s,
            spec=chosen_spec,
            exec_cwd=exec_cwd,
            purpose=f"continue audit review-{review_round}",
            raw_out_path=raw_out_path,
            wait_cmd=wait_cmd,
        )
        state["continue_arm_slot"] = cont_slot
        state["continue_arm_command"] = cont_cmd
        _save_hc_state(state_path, state)
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_TIMEOUT",
            "reviewer_spec": chosen_spec,
            "hc_slot": hc_slot,
            "agent_still_running": t_running,
            "agent_status": t_status or st_info.get("state"),
            "partial_output_path": str(partial_path) if partial_path else None,
            "continue_arm_command": cont_cmd,
            "snapshots_preserved": [str(v.get("snap_repo")) for v in snapshots.values()],
            "failover_log": failover_log,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return EXIT_TIMEOUT, res_payload

    looks_like_small_quota_raw = bool(raw_text.strip()) and len(raw_text) <= 1024 and is_quota_screen(raw_text)
    if not raw_text.strip() or looks_like_small_quota_raw:
        if is_quota_screen(screen_text) or looks_like_small_quota_raw:
            failover_log.append({"spec": chosen_spec, "returncode": EXIT_QUOTA, "stderr_tail": screen_text.strip()[-400:]})
            next_idx = spec_idx + 1
            while next_idx < len(reviewer_specs):
                nxt_spec = reviewer_specs[next_idx]
                nxt_cli, _, _ = parse_cli_spec(nxt_spec)
                nxt_slot = f"reviewer-{nxt_cli}"
                nxt_info = _herdr_status(herdr_agent_py, task_dir, nxt_slot)
                if nxt_info.get("running") and is_quota_screen(_herdr_read(herdr_agent_py, task_dir, nxt_slot, lines=80)):
                    failover_log.append({"spec": nxt_spec, "returncode": EXIT_QUOTA, "stderr_tail": "Preserved quota-limited hc session"})
                    next_idx += 1
                    continue

                raw_out_path.unlink(missing_ok=True)
                next_arm_argv, next_arm_cmd, next_arm_slot, new_arm_idx, nxt_baseline = _build_launch_or_resume_arm(
                    spec=nxt_spec,
                    hc_slot=nxt_slot,
                    exec_cwd=exec_cwd,
                    prompt_path=Path(str(state["prompt_path"])),
                    raw_out_path=raw_out_path,
                    task_dir=task_dir,
                    waits_dir=waits_dir,
                    review_round=review_round,
                    arm_index=int(state.get("arm_index") or 1) + 1,
                    timeout_s=timeout_s,
                    reuse_session=False,
                    cur_info=nxt_info,
                    herdr_agent_py=herdr_agent_py,
                    await_sh=await_sh,
                )
                state["spec_index"] = next_idx
                state["hc_slot"] = nxt_slot
                state["arm_index"] = new_arm_idx
                state["baseline_turn"] = nxt_baseline
                state["nudge_count"] = 0
                state["failover_log"] = failover_log
                state["pending_arm_slot"] = next_arm_slot
                state["pending_arm_argv"] = next_arm_argv
                state["pending_arm_command"] = next_arm_cmd
                state["pending_status"] = "AUDIT_ARM_READY"
                _save_hc_state(state_path, state)
                res_payload = {
                    "schema_version": 1,
                    "status": "AUDIT_FAILOVER_READY",
                    "from_spec": chosen_spec,
                    "next_spec": nxt_spec,
                    "hc_slot": nxt_slot,
                    "next_arm_slot": next_arm_slot,
                    "next_arm_command": next_arm_cmd,
                    "failover_log": failover_log,
                    "checked_at_utc": SC.utc_now_iso(),
                }
                audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                return EXIT_QUOTA, res_payload

            _cleanup_hc_state(ev_dir, state, herdr_agent_py, task_dir, close_terminal=False)
            res_payload = {
                "schema_version": 1,
                "status": "HOLD_QUOTA_EXHAUSTED",
                "risk_tier": state["risk_tier"],
                "combined_tree": state["combined_tree"],
                "failover_log": failover_log,
                "checked_at_utc": SC.utc_now_iso(),
            }
            audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            return EXIT_QUOTA, res_payload

        if t_running and t_status in ("idle", "done") and int(state.get("nudge_count") or 0) == 0:
            nudge_slot, new_arm_idx = _next_free_arm_slot(waits_dir, hc_slot, review_round, int(state.get("arm_index") or 1) + 1)
            nudge_prompt = f"Your turn ended without writing {raw_out_path}. Write the complete review markdown to {raw_out_path} now and stand by idle."
            wait_cmd = [
                sys.executable,
                str(herdr_agent_py.resolve()),
                "resume",
                "--task-dir",
                str(task_dir.resolve()),
                "--slot",
                hc_slot,
                "--",
                nudge_prompt,
            ]
            nudge_argv, nudge_cmd = _build_hc_arm_argv(
                await_sh=await_sh,
                task_dir=task_dir,
                arm_slot=nudge_slot,
                timeout_s=timeout_s,
                spec=chosen_spec,
                exec_cwd=exec_cwd,
                purpose=f"nudge audit output review-{review_round}",
                raw_out_path=raw_out_path,
                wait_cmd=wait_cmd,
            )
            state["nudge_count"] = 1
            state["arm_index"] = new_arm_idx
            state["baseline_turn"] = t_turn
            state["pending_arm_slot"] = nudge_slot
            state["pending_arm_argv"] = nudge_argv
            state["pending_arm_command"] = nudge_cmd
            state["pending_status"] = "AUDIT_ARM_READY"
            _save_hc_state(state_path, state)
            res_payload = {
                "schema_version": 1,
                "status": "AUDIT_NUDGE_READY",
                "reviewer_spec": chosen_spec,
                "hc_slot": hc_slot,
                "next_arm_slot": nudge_slot,
                "next_arm_command": nudge_cmd,
                "checked_at_utc": SC.utc_now_iso(),
            }
            audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            return 2, res_payload

        _cleanup_hc_state(ev_dir, state, herdr_agent_py, task_dir, close_terminal=True)
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_EMPTY_OUTPUT",
            "reviewer_spec": chosen_spec,
            "hc_slot": hc_slot,
            "settled_rc": settled_rc,
            "screen_tail": screen_text.strip()[-400:],
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 2, res_payload

    snap_violations = check_snapshots_integrity(snapshots, workspace)
    if snap_violations:
        _cleanup_hc_state(ev_dir, state, herdr_agent_py, task_dir, close_terminal=True)
        res_payload = {
            "schema_version": 1,
            "status": "REVIEWER_READONLY_VIOLATION",
            "reviewer_spec": chosen_spec,
            "reasons": snap_violations,
            "failover_log": failover_log,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return EXIT_READONLY_VIOLATION, res_payload

    post_receipt, post_problems = verify_receipt_and_trees(task_dir, expected_lock_file, allow_custom_repos, sop_root=sop_root)
    if post_problems or post_receipt is None:
        _cleanup_hc_state(ev_dir, state, herdr_agent_py, task_dir, close_terminal=True)
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_REFUSED",
            "reasons": ["Post-audit tree/lock verification failed"] + post_problems,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 3, res_payload

    cal = load_calibration(calibration_file, metrics_root.resolve())
    fin_code, fin_payload = _finalize_valid_review_output(
        task_dir=task_dir,
        ev_dir=ev_dir,
        audit_result_path=audit_result_path,
        receipt=post_receipt,
        raw_text=raw_text,
        raw_out_path=raw_out_path,
        primary_repo=str(state["primary_repo"]),
        primary_tree=str(state["primary_tree"]),
        repo_trees=dict(state["repo_trees"]),
        repo_paths=dict(state["repo_paths"]),
        combined_tree=str(state["combined_tree"]),
        risk_tier=str(state["risk_tier"]),
        audit_mode=str(state["audit_mode"]),
        chosen_spec=chosen_spec,
        failover_log=failover_log,
        review_round=review_round,
        cal=cal,
        calibration_file=calibration_file,
        metrics_root=metrics_root,
    )
    keep_live_for_recheck = bool((reuse_session or state.get("reuse_session")) and fin_payload.get("verdict") != "PASS")
    _cleanup_hc_state(ev_dir, state, herdr_agent_py, task_dir, close_terminal=not keep_live_for_recheck)
    return fin_code, fin_payload


def run_hc_audit_sync(
    *,
    task_dir: Path,
    sop_root: Path,
    workspace: Dict[str, object],
    shadow_flag: bool,
    force_flag: bool,
    policy_file: Optional[Path],
    calibration_file: Path,
    metrics_root: Path,
    expected_lock_file: Path,
    allow_custom_repos: bool,
    timeout_ms: int,
    reuse_session: bool,
    await_sh: Path,
    herdr_agent_py: Path,
) -> Tuple[int, Dict[str, object]]:
    for _attempt in range(8):
        prep_code, prep_payload = prepare_hc_audit(
            task_dir=task_dir,
            sop_root=sop_root,
            workspace=workspace,
            shadow_flag=shadow_flag,
            force_flag=force_flag,
            policy_file=policy_file,
            calibration_file=calibration_file,
            metrics_root=metrics_root,
            expected_lock_file=expected_lock_file,
            allow_custom_repos=allow_custom_repos,
            timeout_ms=timeout_ms,
            reuse_session=reuse_session,
            await_sh=await_sh,
            herdr_agent_py=herdr_agent_py,
        )
        if prep_code is not None:
            return prep_code, prep_payload

        if not prep_payload.get("ready_to_finalize"):
            arm_argv = list(prep_payload["arm_argv"])
            arm_slot = str(prep_payload["active_arm_slot"])
            timeout_s = int(prep_payload["timeout_s"])
            arm_proc = subprocess.run(arm_argv, capture_output=True, text=True, stdin=subprocess.DEVNULL)
            if arm_proc.returncode != 0:
                ev_dir = task_dir.resolve() / "evidence"
                st_path = ev_dir / HC_STATE_FILENAME
                st_data = json.loads(st_path.read_text(encoding="utf-8")) if st_path.is_file() else None
                _cleanup_hc_state(ev_dir, st_data, herdr_agent_py, task_dir.resolve(), close_terminal=True)
                err_payload = {
                    "schema_version": 1,
                    "status": "AUDIT_RUNNER_ERROR",
                    "error": f"await.sh arm failed (exit {arm_proc.returncode}): {arm_proc.stderr.strip() or arm_proc.stdout.strip()}",
                    "checked_at_utc": SC.utc_now_iso(),
                }
                (ev_dir / "audit-result.json").write_text(json.dumps(err_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                return 2, err_payload

            settled_path = task_dir.resolve() / "waits" / f"{arm_slot}.settled"
            _wait_for_sentinel(settled_path, poll_s=0.2, max_wait_s=max(5.0, float(timeout_s) + 30.0))

        fin_code, fin_payload = finalize_hc_audit(
            task_dir=task_dir,
            sop_root=sop_root,
            workspace=workspace,
            calibration_file=calibration_file,
            metrics_root=metrics_root,
            expected_lock_file=expected_lock_file,
            allow_custom_repos=allow_custom_repos,
            timeout_ms=timeout_ms,
            reuse_session=reuse_session,
            await_sh=await_sh,
            herdr_agent_py=herdr_agent_py,
        )
        if fin_payload.get("status") in ("AUDIT_FAILOVER_READY", "AUDIT_NUDGE_READY"):
            continue
        return fin_code, fin_payload

    raise RuntimeError("Exceeded maximum hc failover/nudge iterations")


def run_sop_audit(
    *,
    task_dir: Path,
    sop_root: Optional[Path] = None,
    shadow_flag: bool = False,
    force_flag: bool = False,
    policy_file: Optional[Path] = None,
    calibration_file: Optional[Path] = None,
    metrics_root: Optional[Path] = None,
    expected_lock_file: Optional[Path] = None,
    allow_custom_repos: bool = False,
    runner_script: Optional[Path] = None,
    timeout_ms: int = 1800000,
    idle_timeout_ms: int = 300000,
    backend: str = "auto",
    prepare_only: bool = False,
    finalize_only: bool = False,
    reuse_session: bool = False,
    await_sh: Optional[Path] = None,
    herdr_agent_py: Optional[Path] = None,
    hc_available: Optional[bool] = None,
) -> Tuple[int, Dict[str, object]]:
    if prepare_only and finalize_only:
        raise ValueError("Cannot pass both --prepare and --finalize")

    eff_root = SC.find_sop_root(explicit_root=sop_root, task_dir=task_dir)
    workspace = SC.load_workspace(eff_root)
    eff_metrics = (metrics_root or Path(str(workspace["metrics_dir"]))).expanduser().resolve()
    eff_cal = (calibration_file or (eff_metrics / "shadow-calibration.json")).expanduser().resolve()
    eff_lock = (expected_lock_file or Path(str(workspace["lock_file"]))).expanduser().resolve()
    eff_runner = SC.resolve_runner_script(runner_script)

    herdr_dir = SC.resolve_herdr_scripts_dir()
    eff_await = (await_sh or ((herdr_dir / "await.sh") if herdr_dir else Path("await.sh")))
    eff_herdr = (herdr_agent_py or ((herdr_dir / "herdr-agent.py") if herdr_dir else Path("herdr-agent.py")))

    resolved_backend = resolve_backend(backend, eff_runner, hc_available=hc_available)
    if finalize_only:
        return finalize_hc_audit(
            task_dir=task_dir,
            sop_root=eff_root,
            workspace=workspace,
            calibration_file=eff_cal,
            metrics_root=eff_metrics,
            expected_lock_file=eff_lock,
            allow_custom_repos=allow_custom_repos,
            timeout_ms=timeout_ms,
            reuse_session=reuse_session,
            await_sh=eff_await,
            herdr_agent_py=eff_herdr,
        )

    if prepare_only:
        if resolved_backend != "hc":
            raise ValueError("--prepare requires the 'hc' backend (or live hc daemon)")
        prep_code, prep_payload = prepare_hc_audit(
            task_dir=task_dir,
            sop_root=eff_root,
            workspace=workspace,
            shadow_flag=shadow_flag,
            force_flag=force_flag,
            policy_file=policy_file,
            calibration_file=eff_cal,
            metrics_root=eff_metrics,
            expected_lock_file=eff_lock,
            allow_custom_repos=allow_custom_repos,
            timeout_ms=timeout_ms,
            reuse_session=reuse_session,
            await_sh=eff_await,
            herdr_agent_py=eff_herdr,
        )
        return (0 if prep_code is None else prep_code), prep_payload

    if resolved_backend == "hc":
        return run_hc_audit_sync(
            task_dir=task_dir,
            sop_root=eff_root,
            workspace=workspace,
            shadow_flag=shadow_flag,
            force_flag=force_flag,
            policy_file=policy_file,
            calibration_file=eff_cal,
            metrics_root=eff_metrics,
            expected_lock_file=eff_lock,
            allow_custom_repos=allow_custom_repos,
            timeout_ms=timeout_ms,
            reuse_session=reuse_session,
            await_sh=eff_await,
            herdr_agent_py=eff_herdr,
        )

    task_dir = task_dir.resolve()
    ev_dir = task_dir / "evidence"
    ev_dir.mkdir(parents=True, exist_ok=True)
    audit_result_path = ev_dir / "audit-result.json"

    receipt, problems = verify_receipt_and_trees(task_dir, eff_lock, allow_custom_repos, sop_root=eff_root)
    if problems or receipt is None:
        res_payload = {"schema_version": 1, "status": "AUDIT_REFUSED", "reasons": problems, "checked_at_utc": SC.utc_now_iso()}
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 3, res_payload

    risk_tier = str(receipt["risk_tier"])
    combined_tree = str(receipt["combined_tree"])
    repo_paths: Dict[str, str] = dict(receipt["repo_paths"])
    repo_trees: Dict[str, str] = dict(receipt["repo_trees"])

    if risk_tier == "T0_READONLY" and not force_flag:
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_SKIPPED_READONLY",
            "risk_tier": risk_tier,
            "combined_tree": combined_tree,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 0, res_payload

    cal = load_calibration(eff_cal, eff_metrics)
    if risk_tier == "T1_STANDARD":
        if cal.get("graduated") and not shadow_flag and not force_flag:
            rt_err = check_runtime_evidence_for_fastpath(task_dir, receipt)
            if rt_err is not None:
                audit_result_path.write_text(json.dumps(rt_err, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
                return 3, rt_err
            mpath = write_fastpath_metrics(task_dir, risk_tier, combined_tree, eff_metrics, "t1_fastpath")
            res_payload = {
                "schema_version": 1,
                "status": "AUDIT_FASTPATH_T1",
                "risk_tier": risk_tier,
                "combined_tree": combined_tree,
                "metrics_path": str(mpath),
                "consecutive_clean_t1": cal.get("consecutive_clean_t1"),
                "graduation_threshold": GRADUATION_THRESHOLD,
                "checked_at_utc": SC.utc_now_iso(),
            }
            audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            return 0, res_payload
        audit_mode = "forced" if force_flag else "shadow_calibration"
    else:
        audit_mode = "forced" if force_flag else "mandatory"

    primary_repo, primary_tree, primary_cwd = _select_primary_repo(receipt, repo_paths, repo_trees, eff_root, workspace)
    _, policy = SC.resolve_policy(policy_file, sop_root=eff_root, cwd=primary_cwd)
    reviewer_specs = resolve_reviewer_specs(policy)

    review_round = next_review_index(task_dir)
    prompt_path = ev_dir / f"audit-prompt-{review_round}.md"
    prompt_path.write_text(
        build_audit_prompt(task_dir, receipt, primary_repo, primary_tree, review_round, workspace=workspace),
        encoding="utf-8",
    )

    failover_log: List[Dict[str, object]] = []
    chosen_spec: Optional[str] = None
    raw_out_path = ev_dir / f"audit-raw-{review_round}.md"

    for spec in reviewer_specs:
        rc, out_s, err_s = invoke_runner(
            runner_script=eff_runner,
            spec=spec,
            cwd=primary_cwd,
            prompt_file=prompt_path,
            out_file=raw_out_path,
            timeout_ms=timeout_ms,
            idle_timeout_ms=idle_timeout_ms,
        )
        if rc == 0:
            chosen_spec = spec
            break
        failover_log.append({"spec": spec, "returncode": rc, "stderr_tail": (err_s or out_s).strip()[-400:]})
        if rc == 75:
            continue
        if rc == 124:
            partial_path = Path(f"{raw_out_path}.partial")
            res_payload = {
                "schema_version": 1,
                "status": "AUDIT_TIMEOUT",
                "reviewer_spec": spec,
                "partial_output_path": str(partial_path) if partial_path.is_file() else None,
                "failover_log": failover_log,
                "checked_at_utc": SC.utc_now_iso(),
            }
            audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            return 124, res_payload
        if rc == 76:
            res_payload = {
                "schema_version": 1,
                "status": "REVIEWER_READONLY_VIOLATION",
                "reviewer_spec": spec,
                "failover_log": failover_log,
                "checked_at_utc": SC.utc_now_iso(),
            }
            audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            return 76, res_payload
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_RUNNER_ERROR",
            "reviewer_spec": spec,
            "failover_log": failover_log,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 2, res_payload

    if chosen_spec is None:
        res_payload = {
            "schema_version": 1,
            "status": "HOLD_QUOTA_EXHAUSTED",
            "risk_tier": risk_tier,
            "combined_tree": combined_tree,
            "failover_log": failover_log,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 75, res_payload

    _, post_problems = verify_receipt_and_trees(task_dir, eff_lock, allow_custom_repos, sop_root=eff_root)
    if post_problems:
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_REFUSED",
            "reasons": ["Post-audit tree/lock verification failed"] + post_problems,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 3, res_payload

    if not raw_out_path.is_file() or not raw_out_path.read_text(encoding="utf-8", errors="ignore").strip():
        res_payload = {
            "schema_version": 1,
            "status": "AUDIT_EMPTY_OUTPUT",
            "reviewer_spec": chosen_spec,
            "checked_at_utc": SC.utc_now_iso(),
        }
        audit_result_path.write_text(json.dumps(res_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        return 2, res_payload

    raw_text = raw_out_path.read_text(encoding="utf-8", errors="ignore")
    return _finalize_valid_review_output(
        task_dir=task_dir,
        ev_dir=ev_dir,
        audit_result_path=audit_result_path,
        receipt=receipt,
        raw_text=raw_text,
        raw_out_path=raw_out_path,
        primary_repo=primary_repo,
        primary_tree=primary_tree,
        repo_trees=repo_trees,
        repo_paths=repo_paths,
        combined_tree=combined_tree,
        risk_tier=risk_tier,
        audit_mode=audit_mode,
        chosen_spec=chosen_spec,
        failover_log=failover_log,
        review_round=review_round,
        cal=cal,
        calibration_file=eff_cal,
        metrics_root=eff_metrics,
    )


def run_self_test() -> int:
    _ospec = importlib.util.spec_from_file_location("sop_open_mod", SC.SCRIPT_DIR / "sop-open.py")
    assert _ospec and _ospec.loader
    SO = importlib.util.module_from_spec(_ospec)
    _ospec.loader.exec_module(SO)

    tmp = Path(tempfile.mkdtemp(prefix="sop-audit-self-test-"))
    try:
        repo = tmp / "svc-repo"
        (repo / ".sop").mkdir(parents=True)
        (repo / "src" / "routes").mkdir(parents=True)
        subprocess.run(["git", "-C", str(repo), "init", "-q"], check=True)
        subprocess.run(["git", "-C", str(repo), "config", "user.email", "t@example.com"], check=True)
        subprocess.run(["git", "-C", str(repo), "config", "user.name", "T"], check=True)
        (repo / "src" / "app.ts").write_text("export const x = 1;\n", encoding="utf-8")
        (repo / "src" / "routes" / "billing.ts").write_text("export const c = 1;\n", encoding="utf-8")
        enforcer = repo / "src" / "gate.test.ts"
        enforcer.write_text("export const g = 1;\n", encoding="utf-8")
        (repo / ".sop" / "gates.json").write_text(
            json.dumps(
                {
                    "version": 1,
                    "repo": "svc-repo",
                    "high_risk_globs": ["src/routes/**"],
                    "ops_globs": ["scripts/**"],
                    "enforcer_files": ["src/gate.test.ts"],
                    "project_invariants": ["Always enforce auth checks at API boundaries"],
                    "gates": [{"id": "A-ok", "description": "pass", "command": "true", "fast": True, "blocking": True}],
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        lock_file = repo / ".sop" / "gates-lock.json"
        VGR.update_lock({"svc-repo": repo}, lock_file)
        subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
        subprocess.run(["git", "-C", str(repo), "commit", "-qm", "init"], check=True)

        policy_file = repo / ".sop" / "policy.json"
        policy_file.write_text(json.dumps({"slot_agents": {"writer": "agy", "reviewer": "claude", "scout": "claude"}}), encoding="utf-8")
        cal_file = repo / ".sop" / "metrics" / "shadow-calibration.json"
        metrics_root = repo / ".sop" / "metrics"

        assert resolve_reviewer_specs(
            {"slot_agents": {"writer": "pi", "reviewer": "claude"}, "slot_models": {"pi": {"writer": "claude-opus-5-5"}}}
        ) == ["cli:codex"]

        fake_runner = tmp / "fake_runner.py"
        state_file = tmp / "runner_mode.txt"
        fake_runner.write_text(
            "import argparse, pathlib, sys\n"
            "ap = argparse.ArgumentParser()\n"
            "ap.add_argument('--spec'); ap.add_argument('--mode'); ap.add_argument('--cwd')\n"
            "ap.add_argument('--prompt-file'); ap.add_argument('--out'); ap.add_argument('--timeout-ms'); ap.add_argument('--idle-timeout-ms')\n"
            "a = ap.parse_args()\n"
            f"mode = pathlib.Path({str(state_file)!r}).read_text().strip()\n"
            "if mode == 'failover_claude_to_codex' and a.spec.startswith('cli:claude'):\n"
            "    sys.stderr.write('rate_limit_error HTTP 429\\n'); sys.exit(75)\n"
            "if mode == 'all_75':\n"
            "    sys.stderr.write('quota_exceeded\\n'); sys.exit(75)\n"
            "if mode == 'timeout_partial':\n"
            "    pathlib.Path(f'{a.out}.partial').write_text('partial investigation\\n', encoding='utf-8')\n"
            "    sys.stderr.write('Idle timeout\\n'); sys.exit(124)\n"
            "if mode == 'contradictory_pass':\n"
            "    pathlib.Path(a.out).write_text('VERDICT: PASS\\nBLOCKING:\\n1. B-1: leaked blocker\\n', encoding='utf-8')\n"
            "    sys.exit(0)\n"
            "pathlib.Path(a.out).write_text('VERDICT: PASS\\nHealth Score: svc-repo 100/100\\nBLOCKING: none\\n', encoding='utf-8')\n",
            encoding="utf-8",
        )

        ws = SC.load_workspace(repo)
        t_ro = repo / ".sop" / "tasks" / "2026-11-17-ro"
        SO.open_and_build_brief(task_dir=t_ro, slot="writer", cwd=repo, workspace=ws, policy_file=policy_file, intent_text="check readonly", native_dispatch=True)
        assert SG.run_sop_gate(task_dir=t_ro, sop_root=repo)[0] == 0
        rc_ro, res_ro = run_sop_audit(task_dir=t_ro, sop_root=repo, backend="runner", runner_script=fake_runner)
        assert rc_ro == 0 and res_ro["status"] == "AUDIT_SKIPPED_READONLY", res_ro

        t_t2 = repo / ".sop" / "tasks" / "2026-11-17-t2"
        SO.open_and_build_brief(task_dir=t_t2, slot="writer", cwd=repo, workspace=ws, policy_file=policy_file, intent_text="update billing route", native_dispatch=True)
        (t_t2 / "handoff-1.md").write_text("# writer secret handoff\n", encoding="utf-8")
        (repo / "src" / "routes" / "billing.ts").write_text("export const c = 2;\n", encoding="utf-8")
        assert SG.run_sop_gate(task_dir=t_t2, sop_root=repo)[0] == 0

        state_file.write_text("failover_claude_to_codex", encoding="utf-8")
        rc_fo, res_fo = run_sop_audit(task_dir=t_t2, sop_root=repo, policy_file=policy_file, calibration_file=cal_file, metrics_root=metrics_root, expected_lock_file=lock_file, backend="runner", runner_script=fake_runner)
        assert rc_fo == 0 and res_fo["status"] == "AUDIT_PASS" and res_fo["reviewer_spec"] == "cli:codex", res_fo
        prompt_txt = (t_t2 / "evidence" / "audit-prompt-1.md").read_text(encoding="utf-8")
        assert "Always enforce auth checks at API boundaries" in prompt_txt
        assert "handoff-1.md" not in prompt_txt and "writer secret handoff" not in prompt_txt

        state_file.write_text("contradictory_pass", encoding="utf-8")
        rc_ct, res_ct = run_sop_audit(task_dir=t_t2, sop_root=repo, policy_file=policy_file, backend="runner", runner_script=fake_runner)
        assert rc_ct == 2 and res_ct["status"] == "AUDIT_MALFORMED_VERDICT", res_ct

        state_file.write_text("all_75", encoding="utf-8")
        rc_q, res_q = run_sop_audit(task_dir=t_t2, sop_root=repo, policy_file=policy_file, backend="runner", runner_script=fake_runner)
        assert rc_q == 75 and res_q["status"] == "HOLD_QUOTA_EXHAUSTED", res_q

        (repo / "src" / "routes" / "billing.ts").write_text("export const c = 3;\n", encoding="utf-8")
        rc_dr, res_dr = run_sop_audit(task_dir=t_t2, sop_root=repo, backend="runner", runner_script=fake_runner)
        assert rc_dr == 3 and res_dr["status"] == "AUDIT_REFUSED", res_dr
    finally:
        for p in tmp.rglob("*"):
            try:
                if p.is_file():
                    os.chmod(p, 0o644)
            except OSError:
                pass
        shutil.rmtree(tmp, ignore_errors=True)

    print("ALL sop-audit.py SELF-TESTS PASSED")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic Phase 3.5 cross-vendor audit controller.")
    parser.add_argument("--task-dir", help="Task slug or path")
    parser.add_argument("--sop-root", help="SOP root directory (auto-discovered when omitted)")
    parser.add_argument("--shadow", action="store_true", help="Force T1 shadow calibration audit even after graduation")
    parser.add_argument("--force", action="store_true", help="Force cross-vendor audit regardless of tier")
    parser.add_argument("--policy-file", help="Explicit policy JSON path")
    parser.add_argument("--calibration-file", help="Explicit calibration JSON path")
    parser.add_argument("--metrics-root", help="Explicit metrics output directory")
    parser.add_argument("--expected-lock-file", help="Explicit gates-lock.json path")
    parser.add_argument("--runner-script", help="External runner script (defaults to pstack run-external-agent.mjs)")
    parser.add_argument("--backend", choices=["auto", "hc", "runner"], default="auto")
    parser.add_argument("--prepare", action="store_true", help="Stage hc audit snapshots & await.sh arm without blocking")
    parser.add_argument("--print-arm", action="store_true", help="Print staged await.sh arm command to stdout")
    parser.add_argument("--finalize", action="store_true", help="Finalize settled hc arm output & clean up")
    parser.add_argument("--reuse-session", action="store_true", help="Reuse live idle hc reviewer session when eligible")
    parser.add_argument("--timeout-ms", type=int, default=1800000)
    parser.add_argument("--idle-timeout-ms", type=int, default=300000)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()

    if not args.task_dir:
        parser.error("--task-dir is required unless --self-test is set")

    sop_root = SC.find_sop_root(
        explicit_root=Path(args.sop_root) if args.sop_root else None,
        task_dir=Path(args.task_dir) if ("/" in args.task_dir or Path(args.task_dir).is_absolute()) else None,
    )
    task_dir = SC.resolve_task_dir(args.task_dir, sop_root)

    try:
        code, result = run_sop_audit(
            task_dir=task_dir,
            sop_root=sop_root,
            shadow_flag=args.shadow,
            force_flag=args.force,
            policy_file=Path(args.policy_file).expanduser().resolve() if args.policy_file else None,
            calibration_file=Path(args.calibration_file).expanduser().resolve() if args.calibration_file else None,
            metrics_root=Path(args.metrics_root).expanduser().resolve() if args.metrics_root else None,
            expected_lock_file=Path(args.expected_lock_file).expanduser().resolve() if args.expected_lock_file else None,
            allow_custom_repos=(os.environ.get("SOP_TEST_ALLOW_CUSTOM_REPOS") == "1"),
            runner_script=Path(args.runner_script).expanduser().resolve() if args.runner_script else None,
            timeout_ms=args.timeout_ms,
            idle_timeout_ms=args.idle_timeout_ms,
            backend=args.backend,
            prepare_only=args.prepare,
            finalize_only=args.finalize,
            reuse_session=args.reuse_session,
        )
    except (FileNotFoundError, ValueError, RuntimeError) as err:
        print(f"ERROR: {err}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif args.print_arm and result.get("arm_command"):
        print(result["arm_command"])
    elif args.print_arm and result.get("next_arm_command"):
        print(result["next_arm_command"])
    elif args.print_arm and result.get("continue_arm_command"):
        print(result["continue_arm_command"])
    else:
        print(f"{result['status']} task={task_dir.name} tier={result.get('risk_tier', 'n/a')}")
        if result.get("continue_arm_command"):
            print(f"CONTINUE_ARM: {result['continue_arm_command']}")
        elif result.get("next_arm_command"):
            print(f"NEXT_ARM: {result['next_arm_command']}")
        for r in result.get("reasons") or []:
            print(f"  - {r}", file=sys.stderr)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
