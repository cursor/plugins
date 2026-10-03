import contextlib
import importlib.util
import io
import sys
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

    def test_transcription_cli_accepts_documented_task_options(self):
        client = mock.Mock()
        client.transcribe.return_value = {"task_id": "task-1"}
        argv = [
            "transcribe.py",
            "meeting.mp3",
            "--no-poll",
            "--output-type", "1",
            "--postproc-on", "0",
            "--enable-subtitle", "1",
            "--smoothproc", "false",
            "--colloqproc", "true",
            "--language-type", "2",
            "--dhw", "alpha,beta",
        ]

        with mock.patch.object(sys, "argv", argv), mock.patch.object(
            TRANSCRIBE, "load_config", return_value=("app", "key", "secret")
        ), mock.patch.object(
            TRANSCRIBE, "XfeiSpeedTranscription", return_value=client
        ), mock.patch.object(
            TRANSCRIBE.Path, "exists", return_value=True
        ), contextlib.redirect_stdout(io.StringIO()):
            TRANSCRIBE.main()

        kwargs = client.transcribe.call_args.kwargs
        self.assertEqual(kwargs["output_type"], 1)
        self.assertEqual(kwargs["postproc_on"], 0)
        self.assertEqual(kwargs["enable_subtitle"], 1)
        self.assertIs(kwargs["smoothproc"], False)
        self.assertIs(kwargs["colloqproc"], True)
        self.assertEqual(kwargs["language_type"], 2)
        self.assertEqual(kwargs["dhw"], "alpha,beta")


if __name__ == "__main__":
    unittest.main()
