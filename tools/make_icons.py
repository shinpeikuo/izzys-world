"""Draws the placeholder app icons into icons/. Run: python tools/make_icons.py

Replace with real art later by saving icon-192.png, icon-512.png and
icon-maskable-512.png into icons/ (keep the important part in the middle 80%
of the maskable one, since Android may crop it to a circle).
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
PURPLE = (123, 92, 255)
YELLOW = (255, 210, 63)
WHITE = (255, 255, 255)


def star_points(cx, cy, outer, inner):
    import math
    pts = []
    for i in range(10):
        r = outer if i % 2 == 0 else inner
        a = math.radians(-90 + i * 36)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def draw(size, maskable):
    img = Image.new("RGBA", (size, size), PURPLE if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if not maskable:
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 5, fill=PURPLE)
    scale = 0.30 if maskable else 0.38
    c = size / 2
    d.polygon(star_points(c, c * 1.04, size * scale, size * scale * 0.45), fill=YELLOW, outline=WHITE, width=max(2, size // 64))
    return img


OUT.mkdir(exist_ok=True)
draw(192, False).save(OUT / "icon-192.png")
draw(512, False).save(OUT / "icon-512.png")
draw(512, True).save(OUT / "icon-maskable-512.png")
print("Icons written to", OUT)
