from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "frontend" / "assets"
UI = ASSETS / "ui"


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    w, h = size
    im = Image.new("RGB", size)
    px = im.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(lerp(top[i], bottom[i], t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return im


def add_noise(im: Image.Image, amount: int = 8, seed: int = 1) -> Image.Image:
    rnd = random.Random(seed)
    im = im.convert("RGB")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            n = rnd.randint(-amount, amount)
            r, g, b = px[x, y]
            px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
    return im


def shadow(size: tuple[int, int], bbox: tuple[int, int, int, int], radius: int = 28, alpha: int = 130) -> Image.Image:
    mask = Image.new("L", size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle(bbox, radius=radius, fill=alpha)
    return Image.new("RGBA", size, (0, 0, 0, 0)).filter(ImageFilter.GaussianBlur(0)).putalpha(mask)


def draw_wood_panel(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], seed: int = 0) -> None:
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    d.rounded_rectangle(box, radius=26, fill=(91, 49, 24, 255), outline=(231, 158, 58, 255), width=6)
    for y in range(y0 + 14, y1 - 8, 30):
        c = (105 + rnd.randint(-10, 16), 57 + rnd.randint(-6, 8), 28 + rnd.randint(-5, 5), 255)
        d.rectangle((x0 + 14, y, x1 - 14, min(y + 24, y1 - 12)), fill=c)
        d.line((x0 + 18, y, x1 - 18, y), fill=(50, 25, 13, 90), width=2)
        for _ in range(7):
            yy = y + rnd.randint(4, 21)
            sx = x0 + rnd.randint(25, 80)
            ex = x1 - rnd.randint(25, 80)
            if ex > sx + 12:
                d.arc((sx, yy - 8, ex, yy + 14), 180, 360, fill=(149, 86, 39, 105), width=1)


def draw_straw_roof(d: ImageDraw.ImageDraw, w: int, y: int, left: int, right: int) -> None:
    roof = [(left, y + 94), (left + 205, y + 12), (w // 2, y - 25), (right - 205, y + 12), (right, y + 94)]
    d.polygon(roof, fill=(188, 112, 28, 255))
    d.line(roof + [roof[0]], fill=(89, 49, 17, 210), width=7)
    for layer in range(5):
        yy = y + 8 + layer * 22
        for x in range(left + 15 - layer * 7, right - 15, 24):
            tip = yy + 28 + (x + layer * 9) % 18
            color = (230 - layer * 10, 158 - layer * 13, 47 - layer * 3, 255)
            d.line((x, yy, x + 8, tip), fill=color, width=5)
            d.line((x + 10, yy + 2, x + 4, tip), fill=(116, 67, 21, 145), width=1)
    d.line((left + 120, y + 65, right - 120, y + 65), fill=(249, 190, 75, 175), width=5)


def draw_bricks(d: ImageDraw.ImageDraw, box: tuple[int, int, int, int], seed: int = 0) -> None:
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    d.rounded_rectangle(box, radius=10, fill=(119, 52, 31, 255), outline=(203, 137, 75, 255), width=5)
    bw, bh = 55, 33
    for y in range(y0 + 12, y1 - 8, bh):
        offset = 0 if ((y - y0) // bh) % 2 == 0 else bw // 2
        for x in range(x0 + 8 - offset, x1 - 8, bw):
            col = (145 + rnd.randint(-12, 16), 62 + rnd.randint(-8, 9), 35 + rnd.randint(-6, 8), 255)
            d.rounded_rectangle((x, y, x + bw - 7, y + bh - 6), radius=4, fill=col, outline=(74, 31, 20, 130), width=1)


def draw_lantern(d: ImageDraw.ImageDraw, cx: int, cy: int, scale: float = 1.0) -> None:
    w, h = int(50 * scale), int(78 * scale)
    d.line((cx, cy - h // 2 - 26, cx, cy - h // 2), fill=(81, 46, 21, 220), width=max(2, int(3 * scale)))
    d.rounded_rectangle((cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2), radius=int(12 * scale), fill=(75, 45, 23, 255), outline=(228, 164, 68, 255), width=max(2, int(3 * scale)))
    d.rounded_rectangle((cx - w // 3, cy - h // 3, cx + w // 3, cy + h // 3), radius=int(8 * scale), fill=(255, 174, 45, 180))
    d.ellipse((cx - w, cy - h, cx + w, cy + h), fill=(255, 181, 54, 30))


def generate_background() -> None:
    w, h = 1920, 1080
    im = vertical_gradient((w, h), (9, 32, 48), (5, 11, 18))
    im = add_noise(im, 4, 4).convert("RGBA")
    d = ImageDraw.Draw(im, "RGBA")
    d.ellipse((1320, 70, 1505, 255), fill=(206, 228, 224, 210))
    d.ellipse((1290, 40, 1535, 285), fill=(105, 214, 226, 25))

    rnd = random.Random(7)
    for _ in range(160):
        x, y = rnd.randrange(w), rnd.randrange(30, 710)
        a = rnd.randrange(50, 170)
        d.ellipse((x, y, x + 2, y + 2), fill=(210, 239, 220, a))

    for i, y in enumerate((505, 585, 680)):
        col = [(12, 51, 55, 220), (9, 40, 43, 230), (5, 25, 29, 245)][i]
        pts = [(0, h), (0, y)]
        for x in range(0, w + 120, 120):
            pts.append((x, y - rnd.randint(0, 95)))
        pts.extend([(w, h), (0, h)])
        d.polygon(pts, fill=col)

    # left tree and right castle/cottage are clean silhouettes, not detailed AI scenery.
    d.rectangle((0, 0, 135, 1080), fill=(1, 9, 12, 130))
    d.line((80, 780, 210, 55), fill=(11, 22, 17, 245), width=42)
    for bx, by, ex, ey, wid in [(140, 160, 455, 35, 28), (165, 240, 385, 180, 21), (120, 315, 340, 280, 18)]:
        d.line((bx, by, ex, ey), fill=(12, 32, 24, 225), width=wid)
    for _ in range(70):
        x, y = rnd.randrange(20, 500), rnd.randrange(0, 310)
        d.ellipse((x, y, x + rnd.randrange(38, 86), y + rnd.randrange(22, 58)), fill=(18, 62, 55, 85))

    # distant fairytale structures, restrained so the reels stay dominant.
    d.rectangle((1500, 520, 1780, 820), fill=(25, 31, 40, 205))
    for x in (1518, 1722):
        d.rectangle((x, 430, x + 72, 820), fill=(31, 37, 48, 220))
        d.polygon([(x - 16, 430), (x + 36, 338), (x + 88, 430)], fill=(22, 43, 62, 240))
    for x in range(1532, 1764, 42):
        for y in range(560, 760, 62):
            d.rounded_rectangle((x, y, x + 15, y + 30), radius=4, fill=(235, 159, 72, 135))

    d.rectangle((1260, 735, 1500, 905), fill=(64, 42, 26, 230))
    d.polygon([(1240, 735), (1380, 628), (1520, 735)], fill=(91, 64, 32, 245))
    d.rectangle((1345, 800, 1415, 905), fill=(41, 25, 15, 255))
    d.rounded_rectangle((1288, 770, 1330, 815), radius=8, fill=(241, 151, 54, 150))
    d.rounded_rectangle((1450, 770, 1490, 815), radius=8, fill=(241, 151, 54, 135))

    d.rectangle((0, 820, w, h), fill=(4, 15, 15, 180))
    d.ellipse((-200, 820, 2120, 1260), fill=(3, 17, 15, 120))
    d.ellipse((310, 120, 1610, 990), fill=(0, 0, 0, 65))
    d.rectangle((0, 0, w, h), outline=(0, 0, 0, 0))
    im.save(ASSETS / "background.webp", quality=92, method=6)


def generate_reel_assets() -> None:
    bed = vertical_gradient((900, 700), (18, 67, 65), (4, 18, 20)).convert("RGBA")
    d = ImageDraw.Draw(bed, "RGBA")
    for x in range(0, 900, 90):
        d.line((x, 0, x, 700), fill=(255, 209, 96, 20), width=1)
    bed = bed.filter(ImageFilter.GaussianBlur(0.2))
    bed.save(UI / "reel-bed.webp", quality=92, method=6)

    cell = Image.new("RGBA", (280, 240), (0, 0, 0, 0))
    d = ImageDraw.Draw(cell, "RGBA")
    d.rounded_rectangle((8, 8, 272, 232), radius=16, fill=(8, 31, 35, 230), outline=(216, 165, 69, 165), width=4)
    d.rounded_rectangle((15, 15, 265, 225), radius=12, outline=(255, 226, 135, 65), width=2)
    d.rectangle((20, 18, 260, 92), fill=(26, 69, 72, 45))
    cell.save(UI / "reel-cell.webp", quality=92, method=6)


def generate_frame() -> None:
    w, h = 1672, 941
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh, "RGBA")
    sd.rounded_rectangle((255, 135, 1417, 845), radius=42, fill=(0, 0, 0, 150))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(22)), (0, 0))
    d = ImageDraw.Draw(im, "RGBA")

    # Main stage body.
    draw_wood_panel(d, (280, 155, 1392, 826), seed=10)
    d.rounded_rectangle((342, 220, 1330, 782), radius=30, fill=(20, 91, 84, 235), outline=(224, 156, 55, 255), width=8)

    hole = (462, 232, 1210, 760)
    # Cut a transparent hole so the frame can sit above the board.
    d.rounded_rectangle(hole, radius=18, fill=(0, 0, 0, 0))
    d.rounded_rectangle((hole[0] - 15, hole[1] - 15, hole[2] + 15, hole[3] + 15), radius=25, outline=(255, 214, 104, 255), width=9)
    d.rounded_rectangle((hole[0] - 5, hole[1] - 5, hole[2] + 5, hole[3] + 5), radius=20, outline=(85, 45, 22, 230), width=6)

    for box, seed in [((240, 260, 348, 800), 1), ((1324, 260, 1432, 800), 2)]:
        draw_bricks(d, box, seed)
    for box, seed in [((304, 180, 410, 832), 3), ((1262, 180, 1368, 832), 4)]:
        draw_wood_panel(d, box, seed)

    d.rectangle((325, 775, 1348, 845), fill=(117, 66, 31, 255))
    for x in range(340, 1335, 74):
        d.line((x, 778, x, 842), fill=(50, 24, 12, 100), width=3)
    d.line((315, 775, 1360, 775), fill=(255, 205, 97, 180), width=5)

    draw_straw_roof(d, w, 138, 215, 1457)
    draw_lantern(d, 260, 470, 1.1)
    draw_lantern(d, 1412, 470, 1.1)

    for cx, cy, r in [(836, 160, 26), (836, 805, 30), (351, 410, 22), (1321, 410, 22)]:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(128, 14, 21, 255), outline=(255, 208, 104, 255), width=5)
        d.ellipse((cx - r // 2, cy - r // 2, cx, cy), fill=(255, 124, 116, 180))

    # Clear the actual board window again after ornaments.
    mask = Image.new("L", (w, h), 255)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle(hole, radius=16, fill=0)
    alpha = im.getchannel("A")
    alpha = Image.composite(Image.new("L", (w, h), 0), alpha, mask.point(lambda p: 255 if p == 0 else 0))
    # The composite above only clears the hole; restore all other pixels.
    final_alpha = im.getchannel("A")
    clear = Image.new("L", (w, h), 0)
    cd = ImageDraw.Draw(clear)
    cd.rounded_rectangle(hole, radius=16, fill=255)
    final_alpha.paste(0, (0, 0), clear)
    im.putalpha(final_alpha)
    im.save(UI / "reel-frame.png")


def generate_house_panel() -> None:
    w, h = 864, 1821
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh, "RGBA")
    sd.rounded_rectangle((80, 55, 820, 1760), radius=72, fill=(0, 0, 0, 160))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)), (0, 0))
    d = ImageDraw.Draw(im, "RGBA")
    draw_wood_panel(d, (110, 80, 760, 1748), seed=22)
    draw_straw_roof(d, w, 135, 70, 800)

    d.rounded_rectangle((160, 225, 630, 1690), radius=44, fill=(63, 34, 20, 210), outline=(224, 156, 55, 255), width=8)
    socket_boxes = [(210, 388, 620, 695), (210, 852, 620, 1159), (210, 1314, 620, 1621)]
    for box in socket_boxes:
        d.rounded_rectangle(box, radius=42, fill=(7, 30, 35, 230), outline=(245, 196, 89, 255), width=9)
        d.rounded_rectangle((box[0] + 18, box[1] + 18, box[2] - 18, box[3] - 18), radius=32, outline=(255, 235, 156, 70), width=3)

    rack = (660, 330, 796, 1610)
    draw_bricks(d, rack, 12)
    slot_h = 100
    for i in range(10):
        y = rack[1] + 42 + i * 118
        d.rounded_rectangle((682, y, 775, y + slot_h), radius=14, fill=(30, 21, 15, 230), outline=(232, 175, 75, 230), width=5)
        d.rounded_rectangle((691, y + 10, 766, y + slot_h - 10), radius=10, fill=(8, 22, 21, 180))

    for cx, cy, r in [(435, 92, 32), (435, 1742, 34), (128, 520, 22), (128, 980, 22), (128, 1440, 22)]:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(130, 15, 22, 255), outline=(255, 208, 104, 255), width=5)
        d.ellipse((cx - r // 2, cy - r // 2, cx, cy), fill=(255, 124, 116, 170))
    im.save(UI / "house-panel.png")


def main() -> None:
    UI.mkdir(parents=True, exist_ok=True)
    generate_background()
    generate_reel_assets()
    generate_frame()
    generate_house_panel()


if __name__ == "__main__":
    main()
