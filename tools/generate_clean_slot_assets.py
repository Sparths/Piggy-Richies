from __future__ import annotations

from pathlib import Path
import math

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SYMBOL_DIR = ROOT / "frontend" / "assets" / "symbols"
UI_DIR = ROOT / "frontend" / "assets" / "ui"
SIZE = 380
SCALE = 2
W = SIZE * SCALE


def font(size: int, serif: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "C:/Windows/Fonts/georgiab.ttf" if serif else "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/cambriaz.ttf",
        "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def rgba(color):
    if len(color) == 3:
        return (*color, 255)
    return color


def new_img(w=W, h=W):
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def shadow_from(mask: Image.Image, radius=14, offset=(0, 14), opacity=150):
    sh = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    alpha = mask.filter(ImageFilter.GaussianBlur(radius))
    sh.putalpha(alpha.point(lambda p: int(p * opacity / 255)))
    out = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    out.alpha_composite(sh, offset)
    return out


def vertical_gradient(size, stops):
    w, h = size
    img = Image.new("RGBA", size)
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= t <= p1:
                u = 0 if p1 == p0 else (t - p0) / (p1 - p0)
                col = tuple(int(c0[j] + (c1[j] - c0[j]) * u) for j in range(4))
                break
        else:
            col = stops[-1][1]
        for x in range(w):
            px[x, y] = col
    return img


def text_mask(text, fnt, stroke=0):
    mask = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(mask)
    bbox = d.textbbox((0, 0), text, font=fnt, stroke_width=stroke)
    x = (W - (bbox[2] - bbox[0])) // 2 - bbox[0]
    y = (W - (bbox[3] - bbox[1])) // 2 - bbox[1] - 14
    d.text((x, y), text, font=fnt, fill=255, stroke_width=stroke)
    return mask, (x, y), bbox


def draw_gold_letter(letter: str):
    img = new_img()
    fnt = font(430, serif=True)
    fill_mask, pos, _ = text_mask(letter, fnt, 0)
    stroke_wide, _, _ = text_mask(letter, fnt, 34)
    stroke_mid, _, _ = text_mask(letter, fnt, 19)
    img.alpha_composite(shadow_from(stroke_wide, 12, (0, 18), 170))
    dark = Image.new("RGBA", (W, W), (74, 33, 10, 255))
    img.alpha_composite(Image.composite(dark, Image.new("RGBA", (W, W)), stroke_wide))
    rim = vertical_gradient((W, W), [
        (0, (255, 246, 162, 255)),
        (0.45, (226, 139, 24, 255)),
        (1, (118, 60, 12, 255)),
    ])
    img.alpha_composite(Image.composite(rim, Image.new("RGBA", (W, W)), stroke_mid))
    gold = vertical_gradient((W, W), [
        (0, (255, 248, 187, 255)),
        (0.2, (255, 204, 75, 255)),
        (0.52, (174, 91, 12, 255)),
        (0.72, (255, 218, 94, 255)),
        (1, (116, 60, 12, 255)),
    ])
    img.alpha_composite(Image.composite(gold, Image.new("RGBA", (W, W)), fill_mask))
    shine = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shine)
    sd.arc((145, 110, 620, 640), 205, 330, fill=(255, 246, 180, 135), width=8)
    shine.putalpha(Image.composite(shine.getchannel("A"), Image.new("L", (W, W), 0), fill_mask))
    img.alpha_composite(shine)
    d = ImageDraw.Draw(img)
    gem_x, gem_y = W // 2 + 55, 110
    d.ellipse((gem_x - 28, gem_y - 28, gem_x + 28, gem_y + 28), fill=(103, 7, 21, 255), outline=(255, 214, 92, 255), width=5)
    d.ellipse((gem_x - 13, gem_y - 17, gem_x + 13, gem_y + 9), fill=(227, 37, 69, 255))
    return img


def draw_ring(d, cx, cy, r, inner=(37, 42, 45, 255)):
    d.ellipse((cx-r-10, cy-r-4, cx+r+10, cy+r+16), fill=(0, 0, 0, 90))
    d.ellipse((cx-r, cy-r, cx+r, cy+r), fill=(92, 40, 13, 255))
    d.ellipse((cx-r+12, cy-r+12, cx+r-12, cy+r-12), fill=(255, 211, 90, 255))
    d.ellipse((cx-r+28, cy-r+28, cx+r-28, cy+r-28), fill=(118, 55, 17, 255))
    d.ellipse((cx-r+43, cy-r+43, cx+r-43, cy+r-43), fill=inner)


def draw_pig(kind: int):
    img = new_img()
    d = ImageDraw.Draw(img)
    cx, cy, r = W // 2, W // 2, 290
    inner = [(50, 37, 35, 255), (42, 54, 42, 255), (59, 42, 29, 255)][kind - 1]
    draw_ring(d, cx, cy, r, inner)
    # ears
    d.polygon([(232, 292), (158, 210), (270, 226)], fill=(238, 132, 142, 255), outline=(103, 42, 38, 255))
    d.polygon([(528, 292), (602, 210), (490, 226)], fill=(238, 132, 142, 255), outline=(103, 42, 38, 255))
    d.polygon([(226, 256), (183, 220), (254, 230)], fill=(255, 182, 184, 255))
    d.polygon([(534, 256), (577, 220), (506, 230)], fill=(255, 182, 184, 255))
    # face
    d.ellipse((200, 220, 560, 592), fill=(246, 159, 161, 255), outline=(111, 53, 48, 255), width=8)
    d.ellipse((255, 300, 335, 385), fill=(255, 228, 213, 255))
    d.ellipse((425, 300, 505, 385), fill=(255, 228, 213, 255))
    d.ellipse((282, 324, 312, 354), fill=(28, 27, 27, 255))
    d.ellipse((452, 324, 482, 354), fill=(28, 27, 27, 255))
    d.ellipse((286, 327, 297, 338), fill=(255, 255, 255, 220))
    d.ellipse((456, 327, 467, 338), fill=(255, 255, 255, 220))
    d.ellipse((294, 396, 466, 504), fill=(230, 105, 120, 255), outline=(108, 45, 53, 255), width=7)
    d.ellipse((336, 428, 362, 458), fill=(97, 36, 43, 255))
    d.ellipse((398, 428, 424, 458), fill=(97, 36, 43, 255))
    d.arc((310, 460, 450, 540), 18, 162, fill=(96, 42, 45, 255), width=8)
    if kind == 1:  # brick/castle pig
        d.rounded_rectangle((235, 155, 525, 245), radius=22, fill=(160, 56, 35, 255), outline=(255, 205, 82, 255), width=7)
        for x in range(255, 505, 68):
            d.line((x, 160, x, 243), fill=(89, 32, 22, 180), width=4)
        d.rectangle((285, 118, 335, 170), fill=(160, 56, 35, 255), outline=(255, 205, 82, 255), width=5)
        d.rectangle((425, 118, 475, 170), fill=(160, 56, 35, 255), outline=(255, 205, 82, 255), width=5)
    elif kind == 2:  # wood helmet
        d.pieslice((226, 130, 534, 335), 180, 360, fill=(178, 105, 40, 255), outline=(255, 211, 92, 255), width=7)
        for x in range(275, 500, 50):
            d.line((x, 168, x - 18, 274), fill=(92, 45, 18, 180), width=7)
    else:  # straw hat
        d.pieslice((210, 132, 550, 340), 185, 355, fill=(212, 157, 52, 255), outline=(105, 63, 16, 255), width=7)
        d.ellipse((175, 230, 585, 285), fill=(230, 174, 70, 255), outline=(105, 63, 16, 255), width=7)
        for x in range(225, 550, 34):
            d.line((x, 158, x - 65, 280), fill=(125, 82, 18, 105), width=4)
    return img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=130, threshold=2))


def draw_wolf():
    img = new_img()
    d = ImageDraw.Draw(img)
    cx, cy, r = W // 2, W // 2, 290
    draw_ring(d, cx, cy, r, (47, 41, 58, 255))
    # head
    d.polygon([(380, 165), (235, 255), (210, 420), (312, 570), (448, 570), (550, 420), (525, 255)], fill=(91, 95, 105, 255), outline=(30, 30, 35, 255))
    d.polygon([(238, 270), (190, 130), (330, 220)], fill=(72, 73, 82, 255), outline=(30, 30, 35, 255))
    d.polygon([(522, 270), (570, 130), (430, 220)], fill=(72, 73, 82, 255), outline=(30, 30, 35, 255))
    d.polygon([(380, 178), (307, 330), (380, 300), (453, 330)], fill=(135, 140, 150, 255))
    d.polygon([(250, 345), (340, 320), (324, 372)], fill=(248, 208, 91, 255), outline=(46, 32, 16, 255))
    d.polygon([(510, 345), (420, 320), (436, 372)], fill=(248, 208, 91, 255), outline=(46, 32, 16, 255))
    d.polygon([(332, 395), (428, 395), (470, 500), (380, 560), (290, 500)], fill=(211, 202, 190, 255), outline=(37, 36, 38, 255))
    d.ellipse((352, 414, 408, 468), fill=(27, 25, 26, 255))
    d.arc((300, 470, 380, 548), 25, 140, fill=(31, 29, 30, 255), width=7)
    d.arc((380, 470, 460, 548), 40, 155, fill=(31, 29, 30, 255), width=7)
    return img


def thick_line(d, p1, p2, width, fill):
    d.line((*p1, *p2), fill=fill, width=width)
    r = width // 2
    d.ellipse((p1[0]-r, p1[1]-r, p1[0]+r, p1[1]+r), fill=fill)
    d.ellipse((p2[0]-r, p2[1]-r, p2[0]+r, p2[1]+r), fill=fill)


def draw_tool(kind: str):
    img = new_img()
    d = ImageDraw.Draw(img)
    # shared diagonal handle
    thick_line(d, (230, 555), (520, 215), 42, (73, 35, 17, 180))
    thick_line(d, (220, 545), (510, 205), 30, (166, 82, 34, 255))
    thick_line(d, (226, 536), (504, 208), 8, (255, 196, 88, 160))
    if kind == "axe":
        d.polygon([(456, 180), (600, 135), (566, 282), (456, 270)], fill=(213, 221, 220, 255), outline=(73, 72, 73, 255))
        d.polygon([(458, 178), (360, 145), (384, 276), (462, 272)], fill=(196, 207, 207, 255), outline=(73, 72, 73, 255))
        d.line((395, 184, 575, 168), fill=(255, 255, 255, 180), width=7)
    elif kind == "trowel":
        d.polygon([(500, 175), (660, 105), (604, 312)], fill=(216, 220, 216, 255), outline=(71, 74, 74, 255))
        d.polygon([(516, 190), (627, 130), (588, 272)], fill=(245, 250, 243, 170))
    elif kind == "fork":
        thick_line(d, (515, 185), (610, 85), 18, (205, 210, 207, 255))
        for off in [-54, -18, 18, 54]:
            thick_line(d, (592 + off, 80), (514 + off // 2, 200), 12, (218, 224, 222, 255))
        d.arc((432, 170, 592, 330), 235, 312, fill=(218, 224, 222, 255), width=16)
    return img.filter(ImageFilter.UnsharpMask(radius=1.1, percent=120, threshold=3))


def draw_pot():
    img = new_img()
    d = ImageDraw.Draw(img)
    draw_ring(d, W // 2, W // 2, 282, (35, 42, 45, 255))
    d.ellipse((248, 262, 512, 350), fill=(51, 54, 56, 255), outline=(255, 205, 87, 255), width=7)
    d.rounded_rectangle((250, 298, 510, 510), radius=70, fill=(33, 35, 38, 255), outline=(100, 85, 62, 255), width=7)
    d.ellipse((260, 282, 500, 350), fill=(255, 161, 43, 255), outline=(255, 232, 125, 255), width=7)
    d.ellipse((302, 298, 458, 332), fill=(255, 224, 104, 210))
    for x in [312, 380, 448]:
        d.arc((x - 38, 155, x + 38, 280), 210, 330, fill=(255, 238, 186, 180), width=8)
    d.arc((206, 316, 282, 420), 90, 260, fill=(177, 142, 76, 255), width=12)
    d.arc((478, 316, 554, 420), -80, 90, fill=(177, 142, 76, 255), width=12)
    return img


def draw_brick():
    img = new_img()
    d = ImageDraw.Draw(img)
    img.alpha_composite(shadow_from(Image.new("L", (W, W), 0), 0))
    bricks = [(185, 285, 375, 410), (385, 285, 575, 410), (275, 410, 465, 535)]
    for box in bricks:
        d.rounded_rectangle(box, radius=16, fill=(173, 67, 43, 255), outline=(93, 36, 27, 255), width=8)
        x0, y0, x1, y1 = box
        d.line((x0 + 20, y0 + 28, x1 - 20, y0 + 15), fill=(236, 128, 82, 140), width=7)
        d.line((x0 + 28, y1 - 24, x1 - 28, y1 - 18), fill=(93, 36, 27, 110), width=6)
    return img


def normalize_content(img: Image.Image, target=636):
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
      return img
    crop = img.crop(bbox)
    cw, ch = crop.size
    max_dim = max(cw, ch)
    if max_dim >= target:
        return img
    scale = target / max_dim
    nw, nh = int(cw * scale), int(ch * scale)
    crop = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    out = new_img(img.width, img.height)
    out.alpha_composite(crop, ((img.width - nw) // 2, (img.height - nh) // 2))
    return out


def save_asset(img: Image.Image, path: Path, webp=True):
    img = normalize_content(img)
    img = img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    if webp:
        img.save(path.with_suffix(".webp"), "WEBP", lossless=True, quality=92)


def draw_multiplier(mult: int):
    base = Image.open(UI_DIR / "mult-badge.png").convert("RGBA").resize((520, 150), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", base.size, (0, 0, 0, 0))
    out.alpha_composite(base)
    wolf = Image.open(SYMBOL_DIR / "W.png").convert("RGBA").resize((86, 86), Image.Resampling.LANCZOS)
    out.alpha_composite(wolf, (48, 30))
    d = ImageDraw.Draw(out)
    fnt = font(104, serif=True)
    txt = f"X{mult}"
    bbox = d.textbbox((0, 0), txt, font=fnt, stroke_width=5)
    x = 306 - (bbox[2] - bbox[0]) // 2
    y = 80 - (bbox[3] - bbox[1]) // 2 - 12
    color = (178, 255, 191, 255) if mult == 1 else (255, 226, 106, 255)
    d.text((x + 4, y + 8), txt, font=fnt, fill=(0, 0, 0, 170), stroke_width=8, stroke_fill=(0, 0, 0, 170))
    d.text((x, y), txt, font=fnt, fill=color, stroke_width=7, stroke_fill=(31, 52, 29, 255))
    d.text((x + 8, y + 6), txt, font=fnt, fill=(255, 255, 222, 110))
    out.save(UI_DIR / f"mult-x{mult}.png")


def draw_brick_token():
    img = draw_brick().resize((96, 96), Image.Resampling.LANCZOS)
    img.save(UI_DIR / "brick-token.png")


def draw_brick_slot(filled: bool):
    img = Image.new("RGBA", (120, 92), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((6, 10, 114, 82), radius=14, fill=(25, 14, 10, 170), outline=(105, 72, 31, 210), width=4)
    d.rounded_rectangle((16, 20, 104, 72), radius=10, fill=(7, 16, 17, 205), outline=(194, 142, 58, 120), width=2)
    if filled:
        brick = Image.open(SYMBOL_DIR / "BR.png").convert("RGBA").resize((108, 108), Image.Resampling.LANCZOS)
        img.alpha_composite(brick, (6, -8))
        glow = Image.new("RGBA", img.size, (255, 198, 80, 0))
        ga = Image.new("L", img.size, 0)
        gd = ImageDraw.Draw(ga)
        gd.rounded_rectangle((8, 12, 112, 80), radius=14, fill=120)
        glow.putalpha(ga.filter(ImageFilter.GaussianBlur(6)))
        out = Image.new("RGBA", img.size, (0, 0, 0, 0))
        out.alpha_composite(glow)
        out.alpha_composite(img)
        img = out
    img.save(UI_DIR / ("brick-slot-filled.png" if filled else "brick-slot-empty.png"))


def draw_house_plate(active: bool):
    img = Image.new("RGBA", (280, 185), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    alpha = 230 if active else 140
    d.rounded_rectangle((8, 12, 272, 170), radius=28, fill=(20, 11, 8, alpha), outline=(255, 205, 92, 220 if active else 115), width=6)
    d.rounded_rectangle((22, 26, 258, 156), radius=20, fill=(7, 18, 20, 150), outline=(140, 82, 32, 145), width=3)
    if active:
        glow = Image.new("RGBA", img.size, (255, 205, 86, 0))
        ga = Image.new("L", img.size, 0)
        gd = ImageDraw.Draw(ga)
        gd.rounded_rectangle((8, 12, 272, 170), radius=28, fill=150)
        glow.putalpha(ga.filter(ImageFilter.GaussianBlur(10)))
        out = Image.new("RGBA", img.size, (0, 0, 0, 0))
        out.alpha_composite(glow)
        out.alpha_composite(img)
        img = out
    img.save(UI_DIR / ("house-slot-active.png" if active else "house-slot-empty.png"))


def draw_icon(name: str):
    img = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    col = (235, 248, 239, 255)
    gold = (255, 215, 92, 255)
    if name == "bolt":
        d.polygon([(72, 10), (32, 72), (61, 72), (48, 118), (97, 51), (68, 51)], fill=col)
    elif name == "menu":
        for y in (38, 64, 90):
            d.rounded_rectangle((28, y - 5, 100, y + 5), radius=5, fill=col)
    elif name == "auto":
        d.arc((25, 24, 103, 104), 35, 340, fill=col, width=9)
        d.polygon([(96, 26), (106, 58), (75, 50)], fill=col)
    elif name == "info":
        d.ellipse((28, 28, 100, 100), outline=gold, width=8)
        d.rectangle((59, 55, 69, 86), fill=col)
        d.ellipse((57, 35, 71, 49), fill=col)
    elif name == "table":
        d.rounded_rectangle((24, 26, 104, 102), radius=8, outline=gold, width=7)
        for x in (50, 78):
            d.line((x, 30, x, 100), fill=col, width=5)
        for y in (52, 76):
            d.line((28, y, 100, y), fill=col, width=5)
    elif name == "sound":
        d.polygon([(22, 55), (44, 55), (70, 32), (70, 96), (44, 73), (22, 73)], fill=col)
        d.arc((62, 42, 96, 86), -42, 42, fill=gold, width=7)
        d.arc((56, 30, 114, 98), -42, 42, fill=gold, width=6)
    elif name == "lock":
        d.rounded_rectangle((30, 55, 98, 108), radius=10, fill=(33, 42, 42, 255), outline=gold, width=6)
        d.arc((42, 22, 86, 74), 180, 360, fill=col, width=9)
        d.ellipse((58, 75, 70, 87), fill=col)
    img.save(UI_DIR / f"icon-{name}.png")


def main():
    SYMBOL_DIR.mkdir(parents=True, exist_ok=True)
    UI_DIR.mkdir(parents=True, exist_ok=True)
    for letter in "AKQJ":
        save_asset(draw_gold_letter(letter), SYMBOL_DIR / f"{letter}.png")
    save_asset(draw_wolf(), SYMBOL_DIR / "W.png")
    save_asset(draw_pot(), SYMBOL_DIR / "S.png")
    save_asset(draw_pig(1), SYMBOL_DIR / "P1.png")
    save_asset(draw_pig(2), SYMBOL_DIR / "P2.png")
    save_asset(draw_pig(3), SYMBOL_DIR / "P3.png")
    save_asset(draw_tool("axe"), SYMBOL_DIR / "M1.png")
    save_asset(draw_tool("trowel"), SYMBOL_DIR / "M2.png")
    save_asset(draw_tool("fork"), SYMBOL_DIR / "M3.png")
    save_asset(draw_brick(), SYMBOL_DIR / "BR.png")
    draw_brick_token()
    for filled in (False, True):
        draw_brick_slot(filled)
    for active in (False, True):
        draw_house_plate(active)
    for name in ("bolt", "menu", "auto", "info", "table", "sound", "lock"):
        draw_icon(name)
    for mult in (1, 2, 3, 5, 8):
        draw_multiplier(mult)


if __name__ == "__main__":
    main()
