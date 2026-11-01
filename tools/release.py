"""Gets the game ready to publish. Run: python tools/release.py 0.3.0

It does three things:
  1. Sets the version number in app.js and sw.js (tablets update when it changes).
  2. Lists every file the game needs in sw.js, so it all works offline.
  3. Writes assets.js, which tells the game which real art exists in art/.
     Anything not there yet uses the matching file in placeholder/.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEDIA = {".png", ".webp", ".jpg", ".jpeg", ".mp3", ".ogg"}
ROOT_FILES = ["index.html", "style.css", "manifest.webmanifest"]
FOLDERS = ["icons", "vendor", "art", "placeholder"]


def rel(p):
    return p.relative_to(ROOT).as_posix()


def media_in(folder):
    base = ROOT / folder
    if not base.exists():
        return []
    found = []
    for p in sorted(base.rglob("*")):
        if not p.is_file() or not (p.suffix.lower() in MEDIA or folder == "vendor"):
            continue
        if not re.fullmatch(r"[a-z0-9_./-]+", rel(p)):
            print(f"SKIPPED (use lowercase, no spaces; originals go in art-source/): {rel(p)}")
            continue
        found.append(rel(p))
    return found


def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        sys.exit("Usage: python tools/release.py 1.2.3")
    version = sys.argv[1]

    art = media_in("art")
    (ROOT / "assets.js").write_text(
        "// Written by tools/release.py: the real art files in art/. Do not edit by hand.\n"
        f"export const ART = new Set({json.dumps(art, indent=1)});\n",
        encoding="utf-8",
    )

    js = sorted(p.name for p in ROOT.glob("*.js") if p.name != "sw.js")
    files = ["./"] + ROOT_FILES + js + [f for folder in FOLDERS for f in media_in(folder)]
    listing = "const FILES = [\n" + "".join(f"  {json.dumps(f)},\n" for f in files) + "];"

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", sw)
    sw = re.sub(r"const FILES = \[.*?\];", lambda _: listing, sw, flags=re.S)
    (ROOT / "sw.js").write_text(sw, encoding="utf-8")

    app = (ROOT / "app.js").read_text(encoding="utf-8")
    app = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", app)
    (ROOT / "app.js").write_text(app, encoding="utf-8")

    print(f"Version {version}: {len(files)} files cached, {len(art)} real art files found.")


main()
