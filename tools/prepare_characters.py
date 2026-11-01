"""Makes the character pictures from Shinpei's character art.

  python tools/prepare_characters.py

Reads the drawings in _source-photos/ (which never go in the repository), removes the
white background, shrinks each one to its height in the game and saves it as
art/characters/<character>_<look>.webp. Also makes the people button (ui/people.webp)
from Izzy's face.

To add a look: add a line to LOOKS below, run this, then add the look to CHARACTERS in
catalog.js and run tools/release.py.

Needs: python -m pip install --user numpy scipy
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_source-photos"
HOLE_MIN_AREA = 600

# output name: (source file, height in room pixels from the top of the head to the feet)
LOOKS = {
    "izzy_main": ("Izzy Main Character.jpg", 400),
    "izzy_hiphop": ("hiphop izzy.jpg", 400),
    "izzy_mustache": ("mustache Izzy.jpg", 400),
    "mom_default": ("mom.jpg", 500),
    "dad_default": ("dad.jpg", 520),
    "ollie_default": ("Ollie's Character.jpg", 440),
    "caden_default": ("Caden.jpg", 400),
    "jane_default": ("Jane.jpg", 400),
    "syd_default": ("syd.jpg", 380),
}


def cut_out(path):
    """The drawing with a transparent background, cropped to the character."""
    img = Image.open(path).convert("RGB")
    rgb = np.asarray(img).astype(np.int16)
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    whiteish = (lo > 226) & (hi - lo < 22)

    # Background = white touching the edge, plus pure white gaps (between an arm and the body).
    labels, _ = ndimage.label(whiteish)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge[edge > 0])
    for i, box in enumerate(ndimage.find_objects(labels), start=1):
        if box is None or i in edge:
            continue
        region = labels[box] == i
        if region.sum() < HOLE_MIN_AREA:
            continue
        mean = rgb[box][region].mean(axis=0)
        if mean.min() > 250 and mean.max() - mean.min() < 2:
            background[box] |= region

    # Keep only the biggest shape (the character), not stray specks.
    parts, _ = ndimage.label(~background)
    sizes = np.bincount(parts.ravel())
    sizes[0] = 0
    mask = parts == sizes.argmax()

    alpha = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
    out = img.convert("RGBA")
    out.putalpha(alpha)
    return out.crop(Image.fromarray(mask.astype(np.uint8) * 255).getbbox())


def make_people_button(izzy):
    """A round button with Izzy's face on it."""
    w = izzy.width
    face = izzy.crop((int(w * 0.1), 0, int(w * 0.1) + int(w * 0.75), int(w * 0.75)))
    size = 140
    face = face.resize((size - 16, size - 16), Image.LANCZOS)
    button = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(button)
    d.ellipse([0, 0, size - 1, size - 1], fill=(123, 92, 255, 255))
    d.ellipse([6, 6, size - 7, size - 7], fill=(255, 241, 214, 255))
    circle = Image.new("L", face.size, 0)
    ImageDraw.Draw(circle).ellipse([0, 0, face.width - 1, face.height - 1], fill=255)
    face.putalpha(Image.fromarray(np.minimum(np.asarray(face.getchannel("A")), np.asarray(circle))))
    button.alpha_composite(face, (8, 8))
    return button


def main():
    out_dir = ROOT / "art" / "characters"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, (file, height) in LOOKS.items():
        figure = cut_out(SRC / file)
        width = round(figure.width * height / figure.height)
        figure.resize((width, height), Image.LANCZOS).save(out_dir / f"{name}.webp", quality=90)
        print(f"{name}: {width}x{height}")
        if name == "izzy_main":
            make_people_button(figure).save(ROOT / "art" / "ui" / "people.webp", quality=92)


main()
