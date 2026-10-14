"""Exercise server shutdown through real CLI processes and HTTP listeners."""
import http.client
import json
import os
import signal
import socket
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC))

from pstack_cli.observe.lifecycle import register, registry_dir


def request(port, method="GET", path="/api/sessions", headers=None):
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=3)
    try:
        connection.request(method, path, headers=headers or {})
        response = connection.getresponse()
        return response.status, response.read()
    finally:
        connection.close()


def assert_closed(port):
    with socket.socket() as probe:
        probe.settimeout(1)
        assert probe.connect_ex(("127.0.0.1", port)) != 0


@pytest.fixture
def servers(tmp_path):
    env = {**os.environ, "HOME": str(tmp_path), "XDG_CACHE_HOME": str(tmp_path / ".cache"),
           "PYTHONPATH": str(SRC), "PYTHONUNBUFFERED": "1"}
    processes = []
    directory = registry_dir(tmp_path)
    command_dir = tmp_path / "different-project"
    command_dir.mkdir()

    def command(*args):
        return subprocess.run([sys.executable, "-m", "pstack_cli", "serve", *args],
                              env=env, cwd=command_dir, capture_output=True, text=True, timeout=15)

    def start(*args):
        cwd = tmp_path / f"project-{len(processes)}"
        cwd.mkdir()
        process = subprocess.Popen([sys.executable, "-m", "pstack_cli", "serve", "--port", "0", *args],
                                   env=env, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        processes.append(process)
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if process.poll() is not None:
                pytest.fail(str(process.communicate()))
            paths = list(directory.glob(f"{process.pid}-*.json"))
            if paths:
                record = json.loads(paths[0].read_text())
                assert request(record["port"])[0] == 200
                return process, record, paths[0]
            time.sleep(0.02)
        pytest.fail("server did not register within 10 seconds")

    try:
        yield start, command, directory
    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()
            try:
                process.communicate(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.communicate(timeout=5)


def test_stop_all_servers_across_project_directories_and_repeat(servers):
    start, command, directory = servers
    running = [start(), start("--bind", "localhost")]
    result = command("stop")
    assert result.returncode == 0, result.stderr
    for process, record, path in running:
        assert process.wait(timeout=5) == 0
        assert f"stopped port {record['port']}" in result.stdout
        assert_closed(record["port"])
        assert not path.exists()
    assert not list(directory.glob("*.json"))
    repeated = command("stop")
    assert repeated.returncode == 0 and "no running servers" in repeated.stdout


def test_stop_can_target_one_port(servers):
    start, command, _ = servers
    first, second = start(), start()
    result = command("stop", "--port", str(first[1]["port"]))
    assert result.returncode == 0, result.stderr
    assert first[0].wait(timeout=5) == 0
    assert_closed(first[1]["port"])
    assert second[0].poll() is None
    assert request(second[1]["port"])[0] == 200
    assert command("stop").returncode == 0


@pytest.mark.parametrize("method,headers,code", [
    ("GET", {}, 404),
    ("POST", {}, 403),
    ("POST", {"Authorization": "Bearer wrong"}, 403),
    ("POST", {"Host": "evil.example"}, 403),
    ("POST", {"Origin": "https://evil.example"}, 403),
])
def test_shutdown_rejects_untrusted_requests(servers, method, headers, code):
    start, command, _ = servers
    process, record, _ = start()
    if "Origin" in headers or "Host" in headers:
        headers = {**headers, "Authorization": f"Bearer {record['token']}"}
    assert request(record["port"], method, "/api/shutdown", headers)[0] == code
    assert process.poll() is None
    assert request(record["port"])[0] == 200
    assert command("stop").returncode == 0


def test_crashed_server_registration_is_removed(servers):
    start, command, _ = servers
    process, record, path = start()
    process.kill()
    process.wait(timeout=5)
    assert path.exists()
    result = command("stop")
    assert result.returncode == 0 and "no running servers" in result.stdout
    assert not path.exists()
    assert_closed(record["port"])


def test_ctrl_c_cleans_up_private_registration(servers):
    start, _, directory = servers
    process, record, path = start()
    assert set(record) == {"pid", "host", "port", "token"}
    if os.name == "posix":
        assert directory.stat().st_mode & 0o777 == 0o700
        assert path.stat().st_mode & 0o777 == 0o600
    process.send_signal(signal.SIGINT)
    assert process.wait(timeout=5) == 0
    assert not path.exists()
    assert_closed(record["port"])


def test_reused_port_does_not_stop_an_unrelated_server(servers, tmp_path):
    _, command, _ = servers

    class OtherServer(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"unrelated server")

    httpd = ThreadingHTTPServer(("127.0.0.1", 0), OtherServer)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        port = httpd.server_address[1]
        path, _ = register("127.0.0.1", port, tmp_path)
        result = command("stop")
        assert result.returncode == 1 and "shutdown refused" in result.stderr
        assert request(port) == (200, b"unrelated server")
        assert path.exists()
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=5)


def test_default_start_port_and_explicit_free_port_are_preserved(monkeypatch):
    from pstack_cli.cli import main
    from pstack_cli.observe import server
    seen = []
    monkeypatch.setattr(server, "serve", lambda **kwargs: seen.append(kwargs["port"]) or 0)
    assert main(["serve"]) == 0
    assert main(["serve", "start", "--port", "0"]) == 0
    assert seen == [7777, 0]
