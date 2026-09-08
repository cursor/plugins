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

The upstream skills use several environment-variable prefixes. Configure the exact variables listed for the selected skill:

| Skills | Environment variables |
|:-------|:----------------------|
| Hyper TTS, speed transcription | `XFEI_APP_ID`, `XFEI_API_KEY`, `XFEI_API_SECRET` |
| Image understanding, PDF/image OCR, text proofread | `IFLY_APP_ID`, `IFLY_API_KEY`, `IFLY_API_SECRET` (PDF OCR does not require `IFLY_API_KEY`) |
| Invoice OCR, machine translation | `XFYUN_APP_ID`, `XFYUN_API_KEY`, `XFYUN_API_SECRET` |
| Video translation | `XFYUN_API_KEY`, `XFYUN_API_SECRET` |

Create and manage credentials at the [iFLYTEK Open Platform console](https://console.xfyun.cn/). Do not commit credentials to a repository or paste them into prompts.

## Data and cost boundary

Each skill runs a local Python script only when invoked. The script sends the requested text, image, PDF, audio, or video URL to the iFLYTEK endpoint documented by that skill. There are no hooks, background processes, MCP servers, or bundled credentials.

Before sending confidential, personal, regulated, or proprietary content, confirm that your use complies with your organization's policies and the applicable iFLYTEK service terms. Services may require separate enablement, quota, or payment.

## Provenance

The skill packages are based on [`iflytek/iFly-Skills` at `062da188ac91ef11047e430d4ab90bbed296b97c`](https://github.com/iflytek/iFly-Skills/tree/062da188ac91ef11047e430d4ab90bbed296b97c) and remain available under Apache-2.0. Modified files carry a Cursor marketplace packaging notice.

This package applies targeted correctness fixes for image OCR host signing, proofreading Host headers, transcription request digests and aligned multipart uploads, URL-only PDF OCR, and transcription task lookup. Regression tests cover all marketplace packaging fixes.

This initial package intentionally excludes the upstream contract-review workflow because its service clients still require injected implementations, voice cloning because its training flow currently uses plain-HTTP endpoints, and the animated diagram skill because it is outside this API-integration scope.

## License

Apache-2.0. See [LICENSE](LICENSE).
