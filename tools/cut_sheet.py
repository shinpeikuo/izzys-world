"""Cuts the separate items out of an item sheet (items drawn on a white background).

  python tools/cut_sheet.py find  "art-source/House Interior/living room items.jpg"
      Finds every item and saves a numbered preview (<sheet>.found.png) next to the sheet,
      so you can see what is what.

  python tools/cut_sheet.py cut   "art-source/House Interior/living room items.jpg"
      Reads <sheet>.items.json and saves each named item as art/props/<name>.webp
      with a transparent background, shrunk the same amount as the room backgrounds
      (2752 -> 1920 wide), so items keep their size relative to the room.

<sheet>.items.json maps item names to a point inside the item on the full-size sheet:
  { "living_sofa": [600, 300], "living_armchair": [1100, 320] }
Anything not listed (for example text labels) is left out.

Needs: python -m pip install --user numpy scipy
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SHRINK = 1920 / 2752
MIN_AREA = 600   # smaller blobs are specks, not items
JOIN = 7         # pixels: parts of one item closer than this count as one item
HOLE_MIN_AREA = 600  # smaller white spots inside items are highlights (eyes, shine), not gaps


def find_items(path):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.int16)
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    whiteish = (lo > 226) & (hi - lo < 22)

    # Background = white areas touching the edge. White inside an item (a cup, a cloud) stays.
    labels, _ = ndimage.label(whiteish)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge[edge > 0])

    # Gaps inside an item (between chair legs, under a bunk bed) are the same pure, neutral
    # white as the paper. White that is painted on an item is slightly tinted, so it stays.
    for i, box in enumerate(ndimage.find_objects(labels), start=1):
        if box is None or i in edge:
            continue
        region = labels[box] == i
        if region.sum() < HOLE_MIN_AREA:
            continue
        mean = rgb[box][region].mean(axis=0)
        if mean.min() > 252 and mean.max() - mean.min() < 1.5:
            background[box] |= region

    item_pixels = ~background

    groups, count = ndimage.label(ndimage.binary_dilation(item_pixels, iterations=JOIN))
    items = []
    for i, box in enumerate(ndimage.find_objects(groups), start=1):
        mask = (groups[box] == i) & item_pixels[box]
        if mask.sum() >= MIN_AREA:
            items.append((box, mask))
    return Image.open(path).convert("RGB"), groups, items


def cmd_find(path):
    sheet, _, items = find_items(path)
    preview = sheet.copy()
    d = ImageDraw.Draw(preview)
    f = ImageFont.load_default(size=44)
    for n, (box, _) in enumerate(items, start=1):
        y0, y1, x0, x1 = box[0].start, box[0].stop, box[1].start, box[1].stop
        d.rectangle([x0, y0, x1, y1], outline=(255, 0, 0), width=5)
        d.text((x0 + 6, y0 + 2), str(n), font=f, fill=(255, 0, 0), stroke_width=4, stroke_fill=(255, 255, 255))
        print(f"{n}: center [{(x0 + x1) // 2}, {(y0 + y1) // 2}] size {x1 - x0}x{y1 - y0}")
    out = path.with_suffix(".found.png")
    preview.thumbnail((1800, 1800))
    preview.save(out)
    print("Preview:", out)


def cmd_cut(path):
    names = json.loads(path.with_suffix(".items.json").read_text(encoding="utf-8"))
    sheet, _, items = find_items(path)
    rgb = np.asarray(sheet)
    out_dir = ROOT / "art" / "props"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, (x, y) in names.items():
        # The smallest item box around the point (the "center" numbers printed by find).
        around = [(b, m) for b, m in items if b[1].start <= x < b[1].stop and b[0].start <= y < b[0].stop]
        if not around:
            sys.exit(f"{name}: no item at {x},{y}")
        box, mask = min(around, key=lambda bm: (bm[0][0].stop - bm[0][0].start) * (bm[0][1].stop - bm[0][1].start))
        rgba = np.dstack([rgb[box], (mask * 255).astype(np.uint8)])
        img = Image.fromarray(rgba, "RGBA")
        img = img.convert("RGBa").resize((max(1, round(img.width * SHRINK)), max(1, round(img.height * SHRINK))), Image.LANCZOS).convert("RGBA")
        img.save(out_dir / f"{name}.webp", quality=90, method=6)
    print(f"Cut {len(names)} items into {out_dir}")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("find", "cut"):
        sys.exit(__doc__)
    {"find": cmd_find, "cut": cmd_cut}[sys.argv[1]](Path(sys.argv[2]).resolve())
