from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


OUT = Path("frontend/assets/ui")


def make_slot(filled: bool) -> Image.Image:
    w, h = 96, 62
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sh = ImageDraw.Draw(shadow)
    sh.rounded_rectangle((10, 9, w - 8, h - 7), radius=11, fill=(0, 0, 0, 120))
    im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(3)))

    draw.rounded_rectangle((8, 5, w - 10, h - 9), radius=10, fill=(26, 15, 10, 230), outline=(107, 65, 22, 235), width=2)
    draw.rounded_rectangle((13, 10, w - 15, h - 14), radius=7, fill=(8, 18, 20, 232), outline=(50, 32, 16, 220), width=1)

    if filled:
        glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.rounded_rectangle((12, 9, w - 14, h - 13), radius=8, fill=(255, 188, 49, 70))
        im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(5)))

        bx, by = 22, 17
        bricks = [
            (bx, by, 17, 13),
            (bx + 18, by, 17, 13),
            (bx + 36, by, 17, 13),
            (bx + 9, by + 14, 17, 13),
            (bx + 27, by + 14, 17, 13),
        ]
        for i, (x, y, bw, bh) in enumerate(bricks):
            base = (150 + 10 * (i % 2), 54 + 8 * (i % 3), 35, 255)
            draw.rounded_rectangle((x, y, x + bw, y + bh), radius=3, fill=base, outline=(255, 191, 80, 210), width=1)
            draw.line((x + 3, y + 3, x + bw - 4, y + 3), fill=(255, 212, 120, 115), width=1)
        draw.rounded_rectangle((13, 10, w - 15, h - 14), radius=7, outline=(255, 209, 87, 245), width=2)
    else:
        draw.rounded_rectangle((18, 15, w - 20, h - 18), radius=6, outline=(27, 48, 43, 180), width=2)
        draw.line((24, 22, w - 26, 22), fill=(95, 60, 28, 115), width=1)

    return im


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    make_slot(False).save(OUT / "brick-slot-empty.png")
    make_slot(True).save(OUT / "brick-slot-filled.png")


if __name__ == "__main__":
    main()
