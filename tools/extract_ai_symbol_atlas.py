from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / "tmp" / "imagegen" / "ai-symbol-atlas-alpha.png"
OUT = ROOT / "frontend" / "assets" / "symbols"

SYMBOLS = {
    "A": (0, 0),
    "K": (1, 0),
    "Q": (2, 0),
    "J": (3, 0),
    "W": (0, 1),
    "S": (1, 1),
    "BR": (2, 1),
    "M1": (3, 1),
    "M2": (0, 2),
    "M3": (1, 2),
    "P3": (2, 2),
    "P2": (3, 2),
    "P1": (0, 3),
}


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    alpha = img.getchannel("A")
    bbox = alpha.point(lambda p: 255 if p > 18 else 0).getbbox()
    if not bbox:
      return (0, 0, img.width, img.height)
    pad = 10
    return (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(img.width, bbox[2] + pad),
        min(img.height, bbox[3] + pad),
    )


def clean_edges(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            is_green = g > 120 and g > r * 1.5 and g > b * 1.35
            if is_green:
                px[x, y] = (r, g, b, 0)
            elif g > r + 25 and g > b + 20:
                px[x, y] = (min(r + 8, 255), max(0, int(g * 0.55)), min(b + 8, 255), a)
    return img


def remove_specks(img: Image.Image, min_area: int = 450) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    w, h = img.size
    seen = bytearray(w * h)
    px = img.load()

    for start_y in range(h):
        for start_x in range(w):
            start = start_y * w + start_x
            if seen[start] or alpha.getpixel((start_x, start_y)) <= 18:
                continue

            stack = [(start_x, start_y)]
            seen[start] = 1
            comp = []
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    idx = ny * w + nx
                    if seen[idx] or alpha.getpixel((nx, ny)) <= 18:
                        continue
                    seen[idx] = 1
                    stack.append((nx, ny))

            if len(comp) < min_area:
                for x, y in comp:
                    r, g, b, _ = px[x, y]
                    px[x, y] = (r, g, b, 0)

    return img


def main() -> None:
    atlas = Image.open(ATLAS).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    cell_w = atlas.width / 4
    cell_h = atlas.height / 4

    for name, (col, row) in SYMBOLS.items():
        left = round(col * cell_w)
        top = round(row * cell_h)
        right = round((col + 1) * cell_w)
        bottom = round((row + 1) * cell_h)
        tile = remove_specks(clean_edges(atlas.crop((left, top, right, bottom))))
        tile = tile.crop(alpha_bbox(tile))

        canvas = Image.new("RGBA", (320, 320), (0, 0, 0, 0))
        max_w, max_h = 278, 278
        scale = min(max_w / tile.width, max_h / tile.height, 1.9)
        resized = tile.resize((round(tile.width * scale), round(tile.height * scale)), Image.Resampling.LANCZOS)
        x = (canvas.width - resized.width) // 2
        y = (canvas.height - resized.height) // 2
        canvas.alpha_composite(resized, (x, y))
        canvas.save(OUT / f"{name}.png")


if __name__ == "__main__":
    main()
