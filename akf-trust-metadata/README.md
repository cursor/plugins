# AKF — The AI Native File Format

EXIF for AI. Stamps every file your agents generate with trust scores, source provenance, and compliance metadata.

## What it does

When Cursor agents create or modify files, AKF stamps them with ~15 tokens of JSON carrying:
- **Trust scores** (0–1) based on source tier
- **Source provenance** — where the information came from
- **Compliance metadata** — EU AI Act, SOX, HIPAA, NIST readiness

The metadata embeds natively into 20+ formats — DOCX, PDF, images, Markdown, YAML, JSON, Python, TypeScript, Go, Rust, HTML — no sidecars.

## Quick start

```bash
pip install akf
akf stamp report.md --agent cursor --evidence "generated from user prompt"
akf inspect report.md
```

## Why

- **47% of developers** distrust AI-generated code (Cognition/Devin, 2026)
- **EU AI Act Article 50** takes effect August 2, 2026 — AI content must carry transparency metadata
- Every file agents generate should carry provenance

## Links

- [akf.dev](https://akf.dev)
- [GitHub](https://github.com/HMAKT99/AKF)
- [Demo](https://huggingface.co/spaces/HANAKT19/akf)
