---
name: akf-stamp
description: >-
  Stamps files with AKF trust metadata — the AI native file format.
  Use after creating or modifying any file to add trust scores, source
  provenance, and compliance metadata. Use before modifying existing files
  to check current trust context. Use when the user mentions trust,
  provenance, compliance, EU AI Act, or metadata.
---

# AKF — The AI Native File Format

Every photo has EXIF. Every song has ID3. AKF is the native metadata format for AI-generated content — ~15 tokens of JSON that embed trust scores, source provenance, and compliance data into 20+ file formats.

## After creating or modifying files

Stamp every file you create or modify with trust metadata:

```bash
akf stamp <file> --agent cursor --evidence "<what you did>"
```

Evidence should describe what you did:
- `"generated from user prompt"` — new file from scratch
- `"refactored existing code"` — modification
- `"tests pass"` — after running tests
- `"docs reviewed"` — documentation
- `"bug fix, verified manually"` — fixes

## Before modifying existing files

Always check existing trust metadata first:

```bash
akf read <file>
akf inspect <file>
```

This shows who last modified the file, their evidence, and the trust score. Preserve or update this context.

## Classification

Apply security labels based on file location:

- `--label confidential` for files in `*/finance/*`, `*/secret/*`, `*/internal/*`
- `--label public` for README, docs, examples, open-source files
- Default is `internal`

## Compliance auditing

Check if files meet regulatory requirements:

```bash
akf audit <file> --regulation eu_ai_act    # EU AI Act Article 50
akf audit <file> --regulation hipaa         # HIPAA
akf audit <file> --regulation sox           # SOX
akf audit <file> --regulation nist_ai       # NIST AI RMF
```

## Trust scoring

Trust scores range from 0 to 1, based on source tier:

| Tier | Score | Examples |
|------|-------|----------|
| T1 | 0.95 | SEC filings, court records, official APIs |
| T2 | 0.85 | Reuters, peer-reviewed journals |
| T3 | 0.70 | News articles, Wikipedia |
| T4 | 0.50 | Blog posts, forums |
| T5 | 0.30 | Unverified AI output |

Human review promotes AI content from T5 (0.30) to T3+ (0.70+).

## Install

```bash
pip install akf
```

## Links

- Website: https://akf.dev
- GitHub: https://github.com/HMAKT99/AKF
- npm: `npm install akf-format`
- Demo: https://huggingface.co/spaces/HANAKT19/akf
