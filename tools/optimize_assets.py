#!/usr/bin/env python3
"""Optimize generated PNG art into web-ready WebP for the front-end.

Drop your generated PNGs (see docs/ASSET_PROMPTS.md) into frontend/assets/ and
frontend/assets/symbols/, then run:

    python tools/optimize_assets.py

For every PNG it finds it writes a sibling .webp:
- symbols/*.png  -> crop to content, pad to square, 512px, WebP (so they fill
  the reel cells regardless of the source aspect ratio)
- background.png -> opaque, max 1920 wide, WebP
- logo.png       -> crop to content, max 760 wide, WebP (keeps alpha)

Then list the .webp files in frontend/assets/manifest.js. Needs Pillow
(`pip install Pillow`).
"""
from __future__ import annotations

import glob
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "frontend", "assets")


def crop_alpha(im: Image.Image) -> Image.Image:
    bbox = im.getchannel("A").getbbox()
    return im.crop(bbox) if bbox else im


def to_square(im: Image.Image, margin: float = 0.05) -> Image.Image:
    w, h = im.size
    s = max(w, h) + 2 * int(max(w, h) * margin)
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - w) // 2, (s - h) // 2), im)
    return canvas


def kb(path: str) -> float:
    return os.path.getsize(path) / 1024


def main() -> None:
    if not os.path.isdir(ASSETS):
        sys.exit(f"assets dir not found: {ASSETS}")
    total = 0.0

    for p in sorted(glob.glob(os.path.join(ASSETS, "symbols", "*.png"))):
        im = to_square(crop_alpha(Image.open(p).convert("RGBA"))).resize((512, 512), Image.LANCZOS)
        out = p[:-4] + ".webp"
        im.save(out, "WEBP", quality=90, method=6)
        total += kb(out)
        print(f"symbol  {os.path.basename(out):12s} {kb(out):6.1f} KB")

    bgp = os.path.join(ASSETS, "background.png")
    if os.path.exists(bgp):
        bg = Image.open(bgp).convert("RGBA")
        flat = Image.new("RGB", bg.size, (7, 15, 30))
        flat.paste(bg, (0, 0), bg)
        if flat.width > 1920:
            flat = flat.resize((1920, round(flat.height * 1920 / flat.width)), Image.LANCZOS)
        out = os.path.join(ASSETS, "background.webp")
        flat.save(out, "WEBP", quality=82, method=6)
        total += kb(out)
        print(f"background {kb(out):9.1f} KB  ({flat.width}x{flat.height})")

    lgp = os.path.join(ASSETS, "logo.png")
    if os.path.exists(lgp):
        lg = crop_alpha(Image.open(lgp).convert("RGBA"))
        if lg.width > 760:
            lg = lg.resize((760, round(lg.height * 760 / lg.width)), Image.LANCZOS)
        out = os.path.join(ASSETS, "logo.webp")
        lg.save(out, "WEBP", quality=92, method=6)
        total += kb(out)
        print(f"logo {kb(out):14.1f} KB  ({lg.width}x{lg.height})")

    print(f"\nTOTAL WebP: {total/1024:.2f} MB. Now list them in frontend/assets/manifest.js")


if __name__ == "__main__":
    main()
