"""Simple stand-in pictures for the pets until Shinpei's pet art exists.
Run: python tools/make_placeholder_pets.py  (writes placeholder/pets/<pet>.webp)
The game uses art/pets/<pet>.webp instead as soon as that file exists.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "placeholder" / "pets"
LINE = (60, 40, 50)
K = 4  # drawn 4x bigger, then shrunk for smooth edges


def canvas(w, h):
    img = Image.new("RGBA", (w * K, h * K), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def oval(d, box, fill, width=5):
    d.ellipse([v * K for v in box], fill=fill, outline=LINE, width=width * K // 2)


def eyes(d, cx, y, gap, r=9):
    for x in (cx - gap, cx + gap):
        oval(d, (x - r, y - r, x + r, y + r), (40, 30, 30), 2)
        d.ellipse([(x - r / 3 + 2) * K, (y - r / 2) * K, (x + r / 3 + 2) * K, (y) * K], fill=(255, 255, 255))


def finish(img, name):
    OUT.mkdir(parents=True, exist_ok=True)
    img.resize((img.width // K, img.height // K), Image.LANCZOS).save(OUT / f"{name}.webp", quality=90)


def dog():
    img, d = canvas(190, 200)
    brown, dark = (196, 140, 90), (120, 80, 50)
    oval(d, (40, 90, 150, 196), brown)                       # body
    oval(d, (52, 160, 88, 198), brown)                        # paws
    oval(d, (102, 160, 138, 198), brown)
    oval(d, (45, 20, 145, 115), brown)                        # head
    oval(d, (25, 30, 62, 100), dark)                          # ears
    oval(d, (128, 30, 165, 100), dark)
    oval(d, (70, 70, 120, 108), (240, 215, 180), 3)           # muzzle
    eyes(d, 95, 58, 20)
    oval(d, (86, 70, 104, 84), (40, 30, 30), 2)               # nose
    oval(d, (88, 92, 102, 112), (230, 100, 120), 2)           # tongue
    finish(img, "dog")


def cat():
    img, d = canvas(150, 175)
    grey, pink = (170, 170, 185), (240, 170, 190)
    d.line([(120 * K, 160 * K), (140 * K, 120 * K), (132 * K, 90 * K)], fill=LINE, width=16 * K, joint="curve")
    d.line([(120 * K, 160 * K), (140 * K, 120 * K), (132 * K, 90 * K)], fill=grey, width=10 * K, joint="curve")
    oval(d, (30, 85, 120, 172), grey)                         # body
    for ear in ([(35, 50), (45, 5), (72, 35)], [(115, 50), (105, 5), (78, 35)]):
        d.polygon([(x * K, y * K) for x, y in ear], fill=grey, outline=LINE, width=5 * K // 2)
    oval(d, (30, 20, 120, 100), grey)                         # head
    eyes(d, 75, 55, 18, 8)
    d.polygon([(70 * K, 70 * K), (80 * K, 70 * K), (75 * K, 77 * K)], fill=pink)
    for side in (-1, 1):
        for dy in (-4, 4):
            d.line([((75 + side * 12) * K, (76 + dy / 2) * K), ((75 + side * 40) * K, (72 + dy * 2) * K)], fill=LINE, width=K * 2)
    finish(img, "cat")


def peacock():
    img, d = canvas(240, 270)
    green, blue, gold = (60, 160, 110), (40, 90, 200), (230, 190, 70)
    # Fan tail: feathers with eye spots
    import math
    for i in range(11):
        a = math.radians(200 + i * 14)
        x, y = 120 + math.cos(a) * 100, 175 + math.sin(a) * 120
        d.line([(120 * K, 175 * K), (x * K, y * K)], fill=(40, 110, 70), width=4 * K)
        oval(d, (x - 20, y - 24, x + 20, y + 24), green, 3)
        oval(d, (x - 10, y - 12, x + 10, y + 12), gold, 2)
        oval(d, (x - 5, y - 6, x + 5, y + 6), blue, 2)
    d.line([(108 * K, 230 * K), (104 * K, 265 * K)], fill=(200, 140, 60), width=5 * K)  # legs
    d.line([(132 * K, 230 * K), (136 * K, 265 * K)], fill=(200, 140, 60), width=5 * K)
    oval(d, (90, 120, 150, 240), blue)                        # body
    oval(d, (98, 70, 142, 120), blue)                         # head
    d.polygon([(142 * K, 92 * K), (160 * K, 98 * K), (142 * K, 104 * K)], fill=gold, outline=LINE)  # beak
    for dx in (-8, 0, 8):                                     # crest
        d.line([((120 + dx) * K, 72 * K), ((120 + dx * 2) * K, 50 * K)], fill=LINE, width=3 * K)
        oval(d, (120 + dx * 2 - 5, 44, 120 + dx * 2 + 5, 54), blue, 2)
    eyes(d, 127, 90, 0, 6)
    finish(img, "peacock")


dog()
cat()
peacock()
print("Placeholder pets written to", OUT)
