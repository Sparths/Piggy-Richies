#!/usr/bin/env python3
"""Convert project PNG assets to WebP without visible quality loss.

This script is intentionally conservative:
- converts PNG files under ``frontend/assets`` to sibling ``.webp`` files
- uses WebP lossless mode with ``exact=True`` for alpha preservation
- rewrites project text references from those PNG paths to WebP
- removes the converted PNG files after the WebP exists

Run locally or via the GitHub Action:

    python tools/optimize_assets.py
"""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "frontend" / "assets"
TEXT_EXTS = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".py",
    ".ts",
    ".tsx",
    ".yml",
    ".yaml",
}
SKIP_DIRS = {".git", "node_modules", ".next", "dist", "build", "__pycache__"}


def is_text_file(path: Path) -> bool:
    return path.suffix.lower() in TEXT_EXTS


def convert_png(path: Path) -> Path:
    out = path.with_suffix(".webp")
    with Image.open(path) as im:
        if im.mode not in {"RGB", "RGBA"}:
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        # WebP lossless keeps pixels/alpha visually identical. exact=True avoids
        # color loss in fully transparent pixels, useful for slot sprites/UI.
        im.save(out, "WEBP", lossless=True, quality=100, method=6, exact=True)
    return out


def rel_posix(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def rewrite_references(mapping: dict[str, str]) -> int:
    changed = 0
    for path in ROOT.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if not path.is_file() or not is_text_file(path):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        new_text = text
        for png_rel, webp_rel in mapping.items():
            new_text = new_text.replace(png_rel, webp_rel)
            # Most frontend paths are relative to frontend/, so update those too.
            if png_rel.startswith("frontend/"):
                new_text = new_text.replace(png_rel.removeprefix("frontend/"), webp_rel.removeprefix("frontend/"))
        if new_text != text:
            path.write_text(new_text, encoding="utf-8")
            changed += 1
    return changed


def main() -> None:
    if not ASSETS.is_dir():
        raise SystemExit(f"assets dir not found: {ASSETS}")

    mapping: dict[str, str] = {}
    total_before = 0
    total_after = 0

    pngs = sorted(ASSETS.rglob("*.png"))
    if not pngs:
        print("No PNG assets found under frontend/assets.")
        return

    for png in pngs:
        before = png.stat().st_size
        webp = convert_png(png)
        after = webp.stat().st_size
        total_before += before
        total_after += after
        mapping[rel_posix(png)] = rel_posix(webp)
        print(f"{rel_posix(png)} -> {rel_posix(webp)}  {before/1024:.1f} KB -> {after/1024:.1f} KB")

    changed_files = rewrite_references(mapping)

    for png in pngs:
        if png.with_suffix(".webp").exists():
            png.unlink()

    saved = total_before - total_after
    print("\nPNG to WebP complete")
    print(f"Converted: {len(pngs)} files")
    print(f"Reference files changed: {changed_files}")
    print(f"Before: {total_before/1024/1024:.2f} MB")
    print(f"After:  {total_after/1024/1024:.2f} MB")
    print(f"Delta:  {saved/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
