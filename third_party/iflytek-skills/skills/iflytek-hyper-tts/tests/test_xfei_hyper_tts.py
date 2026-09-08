import base64
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT_PATH = Path(__file__).parents[1] / "scripts" / "xfei_hyper_tts.py"
SPEC = importlib.util.spec_from_file_location("xfei_hyper_tts", SCRIPT_PATH)
TTS_MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(TTS_MODULE)


class FakeWebSocket:
    def __init__(self, audio: bytes):
        self.audio = audio
        self.sent_messages = []
        self.closed = False

    def send(self, message: str):
        self.sent_messages.append(json.loads(message))

    def recv(self):
        return json.dumps(
            {
                "header": {"code": 0},
                "payload": {
                    "audio": {
                        "audio": base64.b64encode(self.audio).decode(),
                        "status": 2,
                    }
                },
            }
        )

    def close(self):
        self.closed = True


class SynthesizeTest(unittest.TestCase):
    def test_synthesize_completes_with_service_response(self):
        audio = b"synthetic-audio"
        socket = FakeWebSocket(audio)
        client = TTS_MODULE.XfeiHyperTTSClient("app", "key", "secret")

        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "speech.mp3"
            with mock.patch.object(
                TTS_MODULE.websocket,
                "create_connection",
                return_value=socket,
            ):
                result = client.synthesize("测试文本", str(output_path))

            self.assertEqual(output_path.read_bytes(), audio)

        self.assertTrue(result["success"])
        self.assertEqual(result["total_size_bytes"], len(audio))
        self.assertEqual(len(socket.sent_messages), 1)
        self.assertTrue(socket.closed)


if __name__ == "__main__":
    unittest.main()
