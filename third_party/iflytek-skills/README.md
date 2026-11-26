# iFLYTEK Skills

Official iFLYTEK agent skills for speech, OCR, translation, proofreading, and multimodal workflows.

## Installation

```text
/add-plugin iflytek-skills
```

## Skills

| Skill | Capability |
|:------|:-----------|
| `iflytek-hyper-tts` | Synthesize natural speech with configurable voices, speed, volume, and pitch. |
| `iflytek-image-understanding` | Describe images and answer questions about their contents. |
| `iflytek-ocr-invoice` | Extract structured data from invoices, receipts, tickets, and bills. |
| `iflytek-pdf-image-ocr` | Extract text and layout from PDFs and images. |
| `iflytek-speed-transcription` | Transcribe long audio files with the Speed Transcription API. |
| `iflytek-text-proofread` | Detect and correct errors in Chinese documents. |
| `iflytek-translate` | Translate text across supported languages. |
| `iflytek-video-translate` | Create and inspect video translation and dubbing tasks. |

## Requirements

- Python 3
- An iFLYTEK Open Platform account with each service you intend to use enabled
- `websocket-client` for `iflytek-hyper-tts`
- `requests` for PDF/image OCR, speed transcription, and video translation
- `urllib3` for speed transcription

Install only the dependencies needed for the skill you plan to run. The plugin does not install packages or services automatically.

## Credentials

All skills read one set of credentials:

```bash
export IFLY_APP_ID="your_app_id"
export IFLY_API_KEY="your_api_key"
export IFLY_API_SECRET="your_api_secret"
```

PDF OCR does not need `IFLY_API_KEY`, and video translation does not need `IFLY_APP_ID`.

Hyper TTS, speed transcription, invoice OCR, machine translation, and video translation still accept the older `XFEI_*` and `XFYUN_*` names when no `IFLY_*` variable is set. They use one prefix as a complete set and never mix values from different prefixes.

Create and manage credentials at the [iFLYTEK Open Platform console](https://console.xfyun.cn/). Do not commit credentials to a repository or paste them into prompts.

## Data and cost boundary

Each skill runs a local Python script only when invoked. The script sends the requested text, image, PDF, audio, or video URL to the iFLYTEK endpoint documented by that skill. There are no hooks, background processes, MCP servers, or bundled credentials.

Before sending confidential, personal, regulated, or proprietary content, confirm that your use complies with your organization's policies and the applicable iFLYTEK service terms. Services may require separate enablement, quota, or payment.

## Provenance

The skill packages are based on [`iflytek/iFly-Skills` at `beb3ae3a16d9ba952303acac1eb801f234d9c348`](https://github.com/iflytek/iFly-Skills/tree/beb3ae3a16d9ba952303acac1eb801f234d9c348) and remain available under Apache-2.0. Modified files carry a Cursor marketplace packaging notice.

This package applies targeted correctness fixes for image OCR host signing, proofreading Host headers, and URL-only PDF OCR. It also exposes the speed transcription task options that the upstream skill documents but its CLI does not accept; that change is submitted upstream as [iflytek/iFly-Skills#106](https://github.com/iflytek/iFly-Skills/pull/106). Regression tests cover all marketplace packaging fixes.

This initial package intentionally excludes the upstream contract-review workflow because its service clients still require injected implementations, voice cloning because its training flow currently uses plain-HTTP endpoints, and the animated diagram skill because it is outside this API-integration scope.

## License

Apache-2.0. See [LICENSE](LICENSE).
