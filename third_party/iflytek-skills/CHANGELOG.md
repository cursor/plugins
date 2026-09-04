# Changelog

## 1.0.0 - 2026-08-30

- Add eight official iFLYTEK API skills for speech, OCR, translation, proofreading, transcription, and multimodal workflows.
- Document runtime dependencies, credential names, data egress, service enablement, and upstream provenance.
- Correct image OCR HMAC host parsing and proofreading Host headers.
- Correct transcription request digests, aligned multipart uploads, and task lookup after `--no-poll`.
- Align completed task-query JSON and output-file behavior with the initial transcription flow.
- Support URL-only PDF OCR calls and add regression coverage for all packaging fixes.
