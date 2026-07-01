"""One-off visual QA: render the celebration banner variants and screenshot them.
Run: PIGGY_PREVIEW_PORT=8765 python tools/celebrate_shot.py"""
import os
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from cdp_slot_smoke import CDP, ROOT, CHROME, wait_http, wait_eval

def main():
    port = 9340
    profile = ROOT / ".tmp-chrome-celebrate"
    preview_port = int(os.environ.get("PIGGY_PREVIEW_PORT", "8765"))
    url = f"http://127.0.0.1:{preview_port}/index.html?v={int(time.time())}"
    proc = subprocess.Popen([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        f"--remote-debugging-port={port}", f"--user-data-dir={profile}",
        "--window-size=1365,768", url,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        tabs = wait_http(f"http://127.0.0.1:{port}/json", 10)
        ws = next(t["webSocketDebuggerUrl"] for t in tabs if t.get("type") == "page")
        cdp = CDP(ws)
        cdp.call("Page.enable"); cdp.call("Runtime.enable")
        wait_eval(cdp, "document.readyState==='complete' && getComputedStyle(document.querySelector('#loader')).display==='none'", 25)
        time.sleep(0.3)
        shots = [
            ("retrigger", "PIGGY_GAME.celebrate({icon:'pot',title:'+5 FREE SPINS',sub:'RETRIGGER',holdMs:4000})"),
            ("scatterpay", "PIGGY_GAME.celebrate({icon:'pot',title:'SCATTER',sub:'3× pays 4.50',holdMs:4000})"),
            ("totalwin", "PIGGY_GAME.celebrate({icon:'pig',title:'128.40',sub:'TOTAL WIN',holdMs:4000})"),
        ]
        for name, js in shots:
            cdp.eval(js)
            time.sleep(0.75)  # after pop-in + shine
            cdp.screenshot(ROOT / f"tmp-celebrate-{name}.png")
            cdp.eval("document.querySelectorAll('.celebrate').forEach(e=>e.remove())")
            time.sleep(0.15)
        print("ok")
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
