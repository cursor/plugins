# Changelog

## 1.0.0 - 2026-10-01

- Add eight official iFLYTEK API skills for speech, OCR, translation, proofreading, transcription, and multimodal workflows.
- Base the skill packages on upstream `iflytek/iFly-Skills` at `beb3ae3`, which unifies credentials under `IFLY_*` with legacy-prefix fallback and fixes transcription digests, multipart uploads, and task queries.
- Document runtime dependencies, credential names, data egress, service enablement, and upstream provenance.
- Correct image OCR HMAC host parsing and proofreading Host headers.
- Support URL-only PDF OCR calls.
- Expose the speed transcription task options documented in its skill (submitted upstream as iflytek/iFly-Skills#106).
- Add regression coverage for all packaging fixes.
