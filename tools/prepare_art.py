"""Turns Shinpei's room pictures in art-source/ into game-ready files in art/.
Run: python tools/prepare_art.py

- Room backgrounds and the scene selector: resized to 1920 x 1080, saved as WebP.
- Buttons: the gear is cut from the living room picture; arrows and the map
  button are drawn in the same badge style.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-source"
ART = ROOT / "art"

BACKGROUNDS = {
    "places/world_bg.webp": "Main World scene selector/main scene selector (sunset).jpg",
    "places/house_living_bg.webp": "House Interior/living room interior.jpg",
    "places/house_bedroom_bg.webp": "House Interior/bedroom interior.jpg",
    "places/house_kitchen_bg.webp": "House Interior/kitchen interior.jpg",
    "places/cafe_bg.webp": "Cafe Interior/cafe interior.jpg",
    "places/castle_lobby_bg.webp": "Castle Interior/castle lobby interior.jpg",
    "places/castle_bedroom_bg.webp": "Castle Interior/bedroom plain.jpg",
    "places/castle_dining_bg.webp": "Castle Interior/dining hall interior.jpg",
}

OUTLINE = (60, 40, 70)
BADGE = (236, 228, 246)
SIZE = 160  # button images are 160 x 160; the game shows them at about 130


def save(img, name):
    path = ART / name
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=88, method=6)


def circle_crop(img, cx, cy, r):
    crop = img.crop((cx - r, cy - r, cx + r, cy + r)).convert("RGBA")
    mask = Image.new("L", crop.size, 0)
    ImageDraw.Draw(mask).ellipse([1, 1, 2 * r - 2, 2 * r - 2], fill=255)
    crop.putalpha(mask)
    return crop.resize((SIZE, SIZE), Image.LANCZOS)


def badge():
    img = Image.new("RGBA", (SIZE * 4, SIZE * 4), (0, 0, 0, 0))  # drawn big, shrunk for smooth edges
    d = ImageDraw.Draw(img)
    d.ellipse([8, 8, SIZE * 4 - 8, SIZE * 4 - 8], fill=(255, 255, 255), outline=OUTLINE, width=14)
    d.ellipse([48, 48, SIZE * 4 - 48, SIZE * 4 - 48], fill=BADGE, outline=OUTLINE, width=12)
    return img, d


def arrow(direction):
    img, d = badge()
    s = SIZE * 4
    pts = [(0.40, 0.25), (0.66, 0.50), (0.40, 0.75)]
    if direction == "left":
        pts = [(1 - x, y) for x, y in pts]
    d.line([(x * s, y * s) for x, y in pts], fill=OUTLINE, width=92, joint="curve")
    d.line([(x * s, y * s) for x, y in pts], fill=(255, 255, 255), width=56, joint="curve")
    for x, y in (pts[0], pts[2]):
        d.ellipse([x * s - 46, y * s - 46, x * s + 46, y * s + 46], fill=OUTLINE)
        d.ellipse([x * s - 28, y * s - 28, x * s + 28, y * s + 28], fill=(255, 255, 255))
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def map_button(world):
    img, d = badge()
    s = SIZE * 4
    thumb = world.resize((round(s * 0.62 * 1.79), round(s * 0.62)), Image.LANCZOS)
    thumb = thumb.crop(((thumb.width - round(s * 0.62)) // 2, 0, (thumb.width + round(s * 0.62)) // 2, thumb.height))
    mask = Image.new("L", thumb.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, thumb.width - 1, thumb.height - 1], fill=255)
    img.paste(thumb, ((s - thumb.width) // 2, (s - thumb.height) // 2), mask)
    d.ellipse([(s - thumb.width) // 2, (s - thumb.height) // 2, (s + thumb.width) // 2, (s + thumb.height) // 2], outline=OUTLINE, width=12)
    return img.resize((SIZE, SIZE), Image.LANCZOS)


resized = {}
for out, src in BACKGROUNDS.items():
    img = Image.open(SRC / src).convert("RGB").resize((1920, 1080), Image.LANCZOS)
    resized[out] = img
    save(img, out)

save(circle_crop(resized["places/house_living_bg.webp"], 88, 85, 70), "ui/gear.webp")
save(arrow("left"), "ui/arrow_left.webp")
save(arrow("right"), "ui/arrow_right.webp")
save(map_button(resized["places/world_bg.webp"]), "ui/map.webp")
print("Backgrounds and buttons written to", ART)
