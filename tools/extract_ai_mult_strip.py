from __future__ import annotations

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
STRIP = ROOT / "tmp" / "imagegen" / "ai-mult-strip-alpha.png"
OUT = ROOT / "frontend" / "assets" / "ui"
NAMES = ["mult-x1.png", "mult-x2.png", "mult-x3.png", "mult-x5.png", "mult-x8.png"]


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    alpha = img.getchannel("A")
    bbox = alpha.point(lambda p: 255 if p > 18 else 0).getbbox()
    if not bbox:
        return (0, 0, img.width, img.height)
    pad = 18
    return (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(img.width, bbox[2] + pad),
        min(img.height, bbox[3] + pad),
    )


def remove_specks(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    w, h = img.size
    seen = bytearray(w * h)
    px = img.load()

    components: list[list[tuple[int, int]]] = []
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
            components.append(comp)

    if not components:
        return img
    keep = max(components, key=len)
    keep_set = set(keep)
    for comp in components:
        if comp is keep:
            continue
        for x, y in comp:
            if (x, y) in keep_set:
                continue
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, 0)
    return img


def main() -> None:
    strip = Image.open(STRIP).convert("RGBA")
    cell_w = strip.width / len(NAMES)
    OUT.mkdir(parents=True, exist_ok=True)

    for idx, name in enumerate(NAMES):
        left = round(idx * cell_w)
        right = round((idx + 1) * cell_w)
        badge = strip.crop((left, 0, right, strip.height))
        badge = remove_specks(badge).crop(alpha_bbox(badge))
        canvas = Image.new("RGBA", (520, 174), (0, 0, 0, 0))
        scale = min(500 / badge.width, 154 / badge.height)
        badge = badge.resize((round(badge.width * scale), round(badge.height * scale)), Image.Resampling.LANCZOS)
        canvas.alpha_composite(badge, ((canvas.width - badge.width) // 2, (canvas.height - badge.height) // 2))
        canvas.save(OUT / name)


if __name__ == "__main__":
    main()
