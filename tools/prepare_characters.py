"""Makes the character pictures from Shinpei's character art.

  python tools/prepare_characters.py

Reads the drawings in _source-photos/ (which never go in the repository), removes the
white background, shrinks each one to its height in the game and saves it as
art/characters/<character>_<look>.webp (plus _sit and _lie versions when those exist).
Pets come from art-source/Pets/<pet>.jpg and are saved as art/pets/<pet>.webp. Also makes the people button (ui/people.webp)
from Izzy's face.

To add a look: add a line to LOOKS below, run this, then add the look to CHARACTERS in
catalog.js and run tools/release.py.

Needs: python -m pip install --user numpy scipy
"""
import sys
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
    "izzy_princess": ("princess Izzy.jpg", 422),  # taller because of the tiara
    "mom_default": ("mom.jpg", 500),
    "dad_default": ("dad.jpg", 520),
    "ollie_default": ("Ollie's Character.jpg", 440),
    "caden_default": ("Caden.jpg", 400),
    "jane_default": ("Jane.jpg", 400),
    "syd_default": ("syd.jpg", 380),
}

# Pets: art-source/Pets/<pet>.jpg -> art/pets/<pet>.webp, this tall in room pixels.
PETS = {"dog": 200, "cat": 160, "peacock": 280}

# Sitting pictures are shrunk by the same amount as the standing one. Some were drawn a
# little closer up; this fixes those so the face comes out the same size (measured by eye,
# comparing the faces in the two pictures).
SIT_SIZE = {
    "izzy_main": 0.83, "izzy_hiphop": 0.88, "izzy_princess": 0.84, "mom_default": 0.895,
    "caden_default": 0.86, "jane_default": 0.87, "syd_default": 0.88,
}

# The same kind of fix for the lying pictures.
# (Lying faces and body lengths didn't always agree, so these are a middle ground.)
LIE_SIZE = {
    "izzy_main": 0.93, "izzy_hiphop": 0.95, "izzy_princess": 0.85, "mom_default": 0.88,
    "dad_default": 0.94, "caden_default": 0.92, "jane_default": 0.9, "syd_default": 0.82,
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


def pose_file(file, pose):
    """The sitting or lying picture for a look: same name plus ' sitting' or ' lying'.
    Capital letters, extra spaces and "'s" don't matter."""
    def norm(name):
        return " ".join(name.lower().replace("'s", "").split())
    wanted = norm(Path(file).stem + " " + pose)
    for p in SRC.iterdir():
        if norm(p.stem) == wanted:
            return p
    return None


def main():
    out_dir = ROOT / "art" / "characters"
    out_dir.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]  # optional: just these looks, e.g. izzy_main
    for name, (file, height) in LOOKS.items():
        if only and name not in only:
            continue
        figure = cut_out(SRC / file)
        scale = height / figure.height
        width = round(figure.width * scale)
        figure.resize((width, height), Image.LANCZOS).save(out_dir / f"{name}.webp", quality=90)
        print(f"{name}: {width}x{height}")
        if name == "izzy_main":
            make_people_button(figure).save(ROOT / "art" / "ui" / "people.webp", quality=92)

        # Sitting picture: the same size as standing, so the face matches.
        sitting = pose_file(file, "sitting")
        if sitting:
            sit = cut_out(sitting)
            sit_scale = scale * SIT_SIZE.get(name, 1)
            size = (round(sit.width * sit_scale), round(sit.height * sit_scale))
            sit.resize(size, Image.LANCZOS).save(out_dir / f"{name}_sit.webp", quality=90)
            print(f"{name}_sit: {size[0]}x{size[1]}")

        # Lying picture (head on the left): the face the same size as standing.
        lying = pose_file(file, "lying")
        if lying:
            lie = cut_out(lying)
            lie_scale = scale * LIE_SIZE.get(name, 1)
            size = (round(lie.width * lie_scale), round(lie.height * lie_scale))
            lie.resize(size, Image.LANCZOS).save(out_dir / f"{name}_lie.webp", quality=90)
            print(f"{name}_lie: {size[0]}x{size[1]}")

    pets_dir = ROOT / "art" / "pets"
    for pet, height in PETS.items():
        src = ROOT / "art-source" / "Pets" / f"{pet}.jpg"
        if (only and pet not in only) or not src.exists():
            continue
        figure = cut_out(src)
        width = round(figure.width * height / figure.height)
        pets_dir.mkdir(parents=True, exist_ok=True)
        figure.resize((width, height), Image.LANCZOS).save(pets_dir / f"{pet}.webp", quality=90)
        print(f"{pet}: {width}x{height}")


main()
