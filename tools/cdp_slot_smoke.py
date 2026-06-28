from __future__ import annotations

import base64
import hashlib
import json
import os
import socket
import struct
import subprocess
import sys
import time
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


class CDP:
    def __init__(self, ws_url: str):
        rest = ws_url.removeprefix("ws://")
        host_port, path = rest.split("/", 1)
        host, port = host_port.split(":")
        self.sock = socket.create_connection((host, int(port)), timeout=10)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f"GET /{path} HTTP/1.1\r\n"
            f"Host: {host_port}\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(req.encode())
        resp = self.sock.recv(4096)
        if b"101" not in resp.split(b"\r\n", 1)[0]:
            raise RuntimeError(resp.decode(errors="ignore"))
        self.next_id = 1

    def _send_frame(self, payload: bytes):
        mask = os.urandom(4)
        n = len(payload)
        if n < 126:
            head = struct.pack("!BB", 0x81, 0x80 | n)
        elif n < 65536:
            head = struct.pack("!BBH", 0x81, 0x80 | 126, n)
        else:
            head = struct.pack("!BBQ", 0x81, 0x80 | 127, n)
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        self.sock.sendall(head + mask + masked)

    def _recv_frame(self) -> str:
        chunks = []
        while True:
            h = self.sock.recv(2)
            if len(h) < 2:
                raise RuntimeError("websocket closed")
            b1, b2 = h
            opcode = b1 & 0x0F
            length = b2 & 0x7F
            if length == 126:
                length = struct.unpack("!H", self.sock.recv(2))[0]
            elif length == 127:
                length = struct.unpack("!Q", self.sock.recv(8))[0]
            masked = b2 & 0x80
            mask = self.sock.recv(4) if masked else b""
            data = b""
            while len(data) < length:
                data += self.sock.recv(length - len(data))
            if masked:
                data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
            if opcode in (0x1, 0x0):
                chunks.append(data)
            if b1 & 0x80:
                return b"".join(chunks).decode("utf-8")

    def call(self, method: str, params=None, timeout=10):
        msg_id = self.next_id
        self.next_id += 1
        self._send_frame(json.dumps({"id": msg_id, "method": method, "params": params or {}}).encode())
        end = time.time() + timeout
        while time.time() < end:
            msg = json.loads(self._recv_frame())
            if msg.get("id") == msg_id:
                if "error" in msg:
                    raise RuntimeError(msg["error"])
                return msg.get("result")
        raise TimeoutError(method)

    def eval(self, expression: str):
        return self.call("Runtime.evaluate", {"expression": expression, "returnByValue": True}).get("result", {}).get("value")

    def screenshot(self, path: Path):
        data = self.call("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False}, timeout=20)["data"]
        path.write_bytes(base64.b64decode(data))


def wait_http(url: str, timeout=10):
    end = time.time() + timeout
    while time.time() < end:
        try:
            with urllib.request.urlopen(url, timeout=1) as r:
                return json.loads(r.read().decode())
        except Exception:
            time.sleep(0.2)
    raise TimeoutError(url)


def wait_eval(cdp: CDP, expression: str, timeout=15):
    end = time.time() + timeout
    while time.time() < end:
        if cdp.eval(expression):
            return True
        time.sleep(0.2)
    raise TimeoutError(expression)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "desktop"
    width, height = (390, 844) if mode == "mobile" else (1365, 768)
    port = 9333 if mode == "desktop" else 9334
    out = ROOT / f"tmp-{mode}-cdp.png"
    out_bonus = ROOT / f"tmp-{mode}-bonus-cdp.png"
    profile = ROOT / f".tmp-chrome-{mode}"
    preview_port = int(os.environ.get("PIGGY_PREVIEW_PORT", "8000"))
    url = f"http://127.0.0.1:{preview_port}/index.html?v={int(time.time())}"
    proc = subprocess.Popen([
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        f"--remote-debugging-port={port}",
        f"--user-data-dir={profile}",
        f"--window-size={width},{height}",
        url,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        tabs = wait_http(f"http://127.0.0.1:{port}/json", 10)
        ws = next(t["webSocketDebuggerUrl"] for t in tabs if t.get("type") == "page")
        cdp = CDP(ws)
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")
        wait_eval(cdp, "document.readyState === 'complete' && getComputedStyle(document.querySelector('#loader')).display === 'none'", 20)
        time.sleep(0.4)
        cdp.screenshot(out)
        cdp.eval("document.querySelector('#btn-buy').click()")
        wait_eval(cdp, "!document.querySelector('#buy-pop').classList.contains('hidden')", 5)
        cdp.eval("document.querySelector('#buy-pop button[data-buy=\"bonus\"]').click()")
        wait_eval(cdp, "!document.querySelector('#house-panel').classList.contains('hidden')", 20)
        try:
            wait_eval(cdp, "document.querySelectorAll('#brick-rack span.filled').length > 0", 35)
            time.sleep(0.4)
        except TimeoutError:
            time.sleep(0.8)
        cdp.screenshot(out_bonus)
        metrics = cdp.eval(
            "(()=>{const r=s=>{const e=document.querySelector(s); if(!e)return null; const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom,display:getComputedStyle(e).display};};"
            "return {overflow:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,iw:innerWidth,ih:innerHeight},"
            "missing:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),"
            "rects:{reel:r('.reel-panel'),board:r('#board'),house:r('#house-panel'),phase:r('#phase'),mult:r('#mult-tab')},"
            "cells:[...document.querySelectorAll('#board .cell')].map((e,i)=>{const b=e.getBoundingClientRect();return {i,x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom,text:e.dataset.sym}}),"
            "grid:getComputedStyle(document.querySelector('#board')).gridTemplateRows,"
            "house:document.querySelector('#house-panel')?.innerText, filled:document.querySelectorAll('#brick-rack span.filled').length,"
            "multBg:getComputedStyle(document.querySelector('#mult-tab')).backgroundImage};})()"
        )
        print(json.dumps({"base": str(out), "bonus": str(out_bonus), "metrics": metrics}, indent=2))
    finally:
        proc.terminate()


if __name__ == "__main__":
    main()
