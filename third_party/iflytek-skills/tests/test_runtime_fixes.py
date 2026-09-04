import base64
import contextlib
import hashlib
import importlib.util
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock
from urllib.parse import parse_qs, urlparse


PLUGIN_ROOT = Path(__file__).resolve().parents[1]


def load_module(name, relative_path):
    spec = importlib.util.spec_from_file_location(name, PLUGIN_ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


IMAGE_OCR = load_module(
    "iflytek_image_ocr",
    "skills/iflytek-pdf-image-ocr/scripts/image_ocr.py",
)
PDF_OCR = load_module(
    "iflytek_pdf_ocr",
    "skills/iflytek-pdf-image-ocr/scripts/pdf_ocr.py",
)
PROOFREAD = load_module(
    "iflytek_text_proofread",
    "skills/iflytek-text-proofread/scripts/text_proofread.py",
)
TRANSCRIBE = load_module(
    "iflytek_speed_transcription",
    "skills/iflytek-speed-transcription/scripts/transcribe.py",
)


class RuntimeFixesTest(unittest.TestCase):
    def test_image_ocr_signs_hostname_without_path(self):
        client = IMAGE_OCR.IflyImageOCRClient("app", "key", "secret")

        auth_url = urlparse(client._generate_auth_url())
        query = parse_qs(auth_url.query)

        self.assertEqual(auth_url.netloc, "cbm01.cn-huabei-1.xf-yun.com")
        self.assertEqual(query["host"], ["cbm01.cn-huabei-1.xf-yun.com"])

    def test_proofread_uses_signed_endpoint_as_host_header(self):
        captured = {}

        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return b"{}"

        def fake_urlopen(request, timeout):
            captured["request"] = request
            return Response()

        with mock.patch.object(
            PROOFREAD.urllib.request,
            "urlopen",
            side_effect=fake_urlopen,
        ):
            PROOFREAD._http_post(PROOFREAD.API_URL, {}, "app")

        self.assertEqual(
            captured["request"].get_header("Host"),
            "cn-huadong-1.xf-yun.com",
        )

    def test_transcription_digest_hashes_body_once(self):
        client = TRANSCRIBE.XfeiSpeedTranscription("app", "key", "secret")
        body = '{"hello":"world"}'

        headers = client._assemble_auth_header(
            "https://ost-api.xfyun.cn/v2/ost/pro_create",
            "application/json",
            body=body,
        )

        expected = "SHA-256=" + base64.b64encode(
            hashlib.sha256(body.encode("utf-8")).digest()
        ).decode("utf-8")
        self.assertEqual(headers["digest"], expected)

    def test_aligned_multipart_upload_keeps_final_chunk(self):
        client = TRANSCRIBE.XfeiSpeedTranscription("app", "key", "secret")
        client.chunk_size = 4
        chunks = []

        def fake_encode(fields):
            chunk = fields["data"][1]
            chunks.append(chunk)
            return b"multipart:" + chunk, "multipart/form-data"

        def fake_call(url, data, content_type):
            if url.endswith(client.mpupload_init):
                return {"code": 0, "data": {"upload_id": "upload"}}
            if url.endswith(client.mpupload_complete):
                return {"code": 0, "data": {"url": "https://example.test/audio"}}
            return {"code": 0}

        with tempfile.TemporaryDirectory() as temp_dir:
            audio_path = Path(temp_dir) / "audio.mp3"
            audio_path.write_bytes(b"abcdefgh")
            with mock.patch.object(
                TRANSCRIBE,
                "encode_multipart_formdata",
                side_effect=fake_encode,
            ), mock.patch.object(client, "_call_api", side_effect=fake_call):
                result = client.upload_large_file(audio_path)

        self.assertEqual(result, "https://example.test/audio")
        self.assertEqual(chunks, [b"abcd", b"efgh"])

    def test_pdf_ocr_accepts_url_without_local_path(self):
        client = mock.Mock()
        client.ocr.return_value = {"data": {"taskNo": "task", "status": "queued"}}
        output = io.StringIO()

        with mock.patch.object(sys, "argv", ["pdf_ocr.py", "--pdf-url", "https://example.test/doc.pdf", "--no-poll"]), mock.patch.object(
            PDF_OCR, "load_config", return_value=("app", "secret")
        ), mock.patch.object(
            PDF_OCR, "IflyPdfOCRClient", return_value=client
        ), contextlib.redirect_stdout(output):
            PDF_OCR.main()

        self.assertIsNone(client.ocr.call_args.kwargs["pdf_path"])
        self.assertEqual(
            client.ocr.call_args.kwargs["pdf_url"],
            "https://example.test/doc.pdf",
        )
        self.assertIn("python3 scripts/pdf_ocr.py --task-no task", output.getvalue())

    def test_pdf_ocr_queries_existing_task(self):
        client = mock.Mock()
        client.query_status.return_value = {
            "data": {
                "taskNo": "task-1",
                "status": "FINISH",
                "exportFormat": "word",
                "downUrl": "https://example.test/result.docx",
            }
        }
        output = io.StringIO()

        with mock.patch.object(sys, "argv", ["pdf_ocr.py", "--task-no", "task-1"]), mock.patch.object(
            PDF_OCR, "load_config", return_value=("app", "secret")
        ), mock.patch.object(
            PDF_OCR, "IflyPdfOCRClient", return_value=client
        ), contextlib.redirect_stdout(output):
            PDF_OCR.main()

        client.query_status.assert_called_once_with("task-1")
        client.ocr.assert_not_called()
        self.assertIn("Task No: task-1", output.getvalue())
        self.assertIn("https://example.test/result.docx", output.getvalue())

    def test_transcription_cli_queries_existing_task(self):
        client = mock.Mock()
        client.query_task.return_value = {"data": {"task_status": "2"}}
        output = io.StringIO()

        with mock.patch.object(sys, "argv", ["transcribe.py", "--task-id", "task-1"]), mock.patch.object(
            TRANSCRIBE, "load_config", return_value=("app", "key", "secret")
        ), mock.patch.object(
            TRANSCRIBE, "XfeiSpeedTranscription", return_value=client
        ), contextlib.redirect_stdout(output):
            TRANSCRIBE.main()

        client.query_task.assert_called_once_with("task-1")
        self.assertIn("Task task-1 status: 2", output.getvalue())

    def test_completed_transcription_query_uses_parsed_json(self):
        client = mock.Mock()
        client.query_task.return_value = {"data": {"task_status": "3"}}
        client._parse_result.return_value = {
            "task_id": "task-1",
            "text": "transcribed",
            "segments": [{"text": "transcribed"}],
        }
        output = io.StringIO()

        with mock.patch.object(
            sys,
            "argv",
            ["transcribe.py", "--task-id", "task-1", "--output-format", "json"],
        ), mock.patch.object(
            TRANSCRIBE, "load_config", return_value=("app", "key", "secret")
        ), mock.patch.object(
            TRANSCRIBE, "XfeiSpeedTranscription", return_value=client
        ), contextlib.redirect_stdout(output):
            TRANSCRIBE.main()

        rendered = output.getvalue()
        self.assertIn('"text": "transcribed"', rendered)
        self.assertIn('"segments"', rendered)
        client._parse_result.assert_called_once_with(client.query_task.return_value)

    def test_transcription_query_writes_output_file(self):
        client = mock.Mock()
        client.query_task.return_value = {"data": {"task_status": "2"}}

        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "status.txt"
            with mock.patch.object(
                sys,
                "argv",
                ["transcribe.py", "--task-id", "task-1", "--output", str(output_path)],
            ), mock.patch.object(
                TRANSCRIBE, "load_config", return_value=("app", "key", "secret")
            ), mock.patch.object(
                TRANSCRIBE, "XfeiSpeedTranscription", return_value=client
            ), contextlib.redirect_stdout(io.StringIO()):
                TRANSCRIBE.main()

            self.assertEqual(
                output_path.read_text(encoding="utf-8"),
                "Task task-1 status: 2",
            )


if __name__ == "__main__":
    unittest.main()
