"""Draws simple placeholder art into placeholder/. Run: python tools/make_placeholders.py

Real art goes in art/ with the same file name and replaces these automatically.
Props are drawn at "art size": the game shows them at ART_SCALE (0.3) of their
pixel size, the same as real art drawn to scale against 1024 x 2048 characters.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "placeholder"
S = 1 / 0.3  # screen pixels -> art pixels
LINE = (60, 40, 70)


def font(size):
    return ImageFont.load_default(size=size)


def canvas(w, h):
    img = Image.new("RGBA", (round(w * S), round(h * S)), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def box(d, x0, y0, x1, y1, fill, r=12):
    d.rounded_rectangle([x0 * S, y0 * S, x1 * S, y1 * S], radius=r * S, fill=fill, outline=LINE, width=round(4 * S))


def label(img, d, text):
    f = font(round(26 * S))
    w = d.textlength(text, font=f)
    d.text(((img.width - w) / 2, img.height * 0.04), text, font=f, fill=LINE, stroke_width=round(3 * S), stroke_fill=(255, 255, 255))


def save(img, name):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


def bed():
    img, d = canvas(420, 260)
    box(d, 10, 40, 60, 250, (150, 100, 70))          # headboard
    box(d, 40, 140, 410, 220, (150, 100, 70))        # frame
    box(d, 50, 110, 400, 160, (255, 255, 255))       # mattress
    box(d, 60, 90, 150, 135, (250, 240, 200), 20)    # pillow
    box(d, 150, 105, 400, 165, (120, 170, 255))      # blanket
    box(d, 380, 200, 405, 255, (120, 80, 55), 6)     # legs
    box(d, 45, 200, 70, 255, (120, 80, 55), 6)
    label(img, d, "bed")
    save(img, "props/house_bed.png")


def couch():
    img, d = canvas(400, 210)
    box(d, 30, 40, 370, 140, (240, 120, 120), 30)     # back
    box(d, 20, 110, 380, 180, (230, 100, 100), 20)    # seat
    box(d, 5, 80, 60, 185, (220, 90, 90), 24)          # arms
    box(d, 340, 80, 395, 185, (220, 90, 90), 24)
    box(d, 40, 180, 60, 205, (100, 70, 50), 4)
    box(d, 340, 180, 360, 205, (100, 70, 50), 4)
    label(img, d, "couch")
    save(img, "props/house_couch.png")


def table():
    img, d = canvas(260, 170)
    box(d, 10, 50, 250, 80, (200, 150, 100), 8)
    box(d, 30, 75, 50, 165, (170, 120, 80), 4)
    box(d, 210, 75, 230, 165, (170, 120, 80), 4)
    label(img, d, "table")
    save(img, "props/house_table.png")


def chair():
    img, d = canvas(130, 210)
    box(d, 20, 30, 110, 120, (200, 150, 100), 10)
    box(d, 10, 110, 120, 135, (180, 130, 90), 6)
    box(d, 18, 130, 34, 205, (160, 110, 75), 4)
    box(d, 96, 130, 112, 205, (160, 110, 75), 4)
    label(img, d, "chair")
    save(img, "props/house_chair.png")


def tv():
    img, d = canvas(240, 210)
    box(d, 10, 40, 230, 160, (50, 50, 60), 10)
    box(d, 22, 52, 218, 148, (90, 110, 140), 6)
    box(d, 90, 160, 150, 180, (70, 70, 80), 4)
    box(d, 50, 178, 190, 205, (70, 70, 80), 6)
    label(img, d, "TV")
    save(img, "props/house_tv.png")


def lamp():
    img, d = canvas(110, 300)
    d.polygon([(20 * S, 120 * S), (90 * S, 120 * S), (75 * S, 45 * S), (35 * S, 45 * S)], fill=(255, 220, 120), outline=LINE, width=round(4 * S))
    box(d, 49, 120, 61, 280, (120, 120, 130), 4)
    box(d, 25, 275, 85, 295, (100, 100, 110), 8)
    label(img, d, "lamp")
    save(img, "props/house_lamp.png")


def fridge():
    img, d = canvas(180, 380)
    box(d, 10, 40, 170, 375, (230, 240, 245), 18)
    d.line([10 * S, 150 * S, 170 * S, 150 * S], fill=LINE, width=round(4 * S))
    box(d, 140, 80, 152, 130, (150, 160, 170), 4)
    box(d, 140, 170, 152, 250, (150, 160, 170), 4)
    label(img, d, "fridge")
    save(img, "props/house_fridge.png")


def picture():
    img, d = canvas(170, 140)
    box(d, 10, 30, 160, 135, (180, 130, 80), 6)
    box(d, 24, 44, 146, 121, (170, 220, 255), 3)
    d.polygon([(30 * S, 118 * S), (70 * S, 70 * S), (110 * S, 118 * S)], fill=(90, 170, 90))
    d.ellipse([110 * S, 54 * S, 132 * S, 76 * S], fill=(255, 210, 60))
    label(img, d, "picture")
    save(img, "props/house_picture.png")


def rug():
    img, d = canvas(520, 170)
    d.ellipse([10 * S, 40 * S, 510 * S, 165 * S], fill=(190, 120, 200), outline=LINE, width=round(4 * S))
    d.ellipse([60 * S, 62 * S, 460 * S, 143 * S], outline=(240, 200, 250), width=round(6 * S))
    label(img, d, "rug")
    save(img, "props/house_rug.png")


def house_bg():
    img = Image.new("RGB", (1920, 1080), (255, 236, 200))
    d = ImageDraw.Draw(img)
    for x in range(0, 1920, 80):                                   # wallpaper stripes
        d.rectangle([x, 0, x + 38, 620], fill=(255, 228, 185))
    d.rectangle([0, 620, 1920, 1080], fill=(205, 155, 105))        # floor
    for y in range(660, 1080, 70):
        d.line([0, y, 1920, y], fill=(185, 135, 90), width=4)
    d.rectangle([0, 600, 1920, 630], fill=(250, 250, 250))         # skirting board
    d.rounded_rectangle([1350, 130, 1700, 430], radius=16, fill=(170, 220, 255), outline=(255, 255, 255), width=18)  # window
    d.line([1525, 130, 1525, 430], fill=(255, 255, 255), width=12)
    d.line([1350, 280, 1700, 280], fill=(255, 255, 255), width=12)
    save(img, "places/house_bg.png")


def drawer_icon():
    img = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([4, 4, 196, 196], fill=(255, 210, 63), outline=(224, 168, 0), width=8)
    d.rounded_rectangle([45, 80, 155, 150], radius=10, fill=(190, 120, 70), outline=LINE, width=6)  # box
    d.rounded_rectangle([38, 62, 162, 88], radius=8, fill=(215, 145, 90), outline=LINE, width=6)    # lid
    d.rounded_rectangle([88, 100, 112, 112], radius=4, fill=LINE)
    save(img, "ui/drawer.png")


def trash_icon():
    img = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([4, 4, 196, 196], fill=(240, 240, 245), outline=(200, 80, 80), width=8)
    d.rounded_rectangle([62, 70, 138, 160], radius=10, fill=(150, 160, 170), outline=LINE, width=6)
    d.rounded_rectangle([50, 52, 150, 70], radius=6, fill=(170, 180, 190), outline=LINE, width=6)
    d.rounded_rectangle([85, 40, 115, 54], radius=4, fill=LINE)
    for x in (82, 100, 118):
        d.line([x, 85, x, 145], fill=LINE, width=5)
    save(img, "ui/trash.png")


for draw in (bed, couch, table, chair, tv, lamp, fridge, picture, rug, house_bg, drawer_icon, trash_icon):
    draw()
print("Placeholders written to", OUT)
