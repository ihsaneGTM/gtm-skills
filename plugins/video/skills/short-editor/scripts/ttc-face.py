#!/usr/bin/env python3
"""Pull ONE face out of a macOS font collection, as a standalone font file.

    python3 ttc-face.py --list "/System/Library/Fonts/Supplemental/SuperClarendon.ttc"
    python3 ttc-face.py "/System/Library/Fonts/Supplemental/SuperClarendon.ttc" \
            --style "Black Italic" --out assets/fonts

Why this exists: skia registers a .ttc under an alias as its FIRST face only, and
an alias is one face — so the CSS weight and style can never reach the others.
Every serif macOS ships (Didot, Bodoni 72, Baskerville, Hoefler Text,
SuperClarendon, Cochin) is a collection, which silently reduced a shortlist of
"bold italic serifs" to a shortlist of upright text weights. Extracting the face
you want makes it reachable.

Write the result into the PROJECT's assets/fonts/ (scene.mjs looks there first):
the font stays on the machine that is licensed for it, and nothing licensed ends
up in the repo. Needs fontTools (pip install fonttools).
"""
import argparse, os, sys
from fontTools.ttLib import TTCollection


def faces(path):
    c = TTCollection(path, lazy=False)
    out = []
    for i, f in enumerate(c.fonts):
        n = f["name"]
        out.append((i, f, n.getDebugName(4) or "", n.getDebugName(2) or "",
                    f["OS/2"].usWeightClass))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--style", help='e.g. "Black Italic"')
    ap.add_argument("--index", type=int)
    ap.add_argument("--out", default=".")
    a = ap.parse_args()

    fs = faces(a.src)
    if a.list or (a.style is None and a.index is None):
        for i, _, full, style, w in fs:
            print(f"  [{i}] {full:<38} style={style!r:<18} weight={w}")
        return
    hit = None
    for i, f, full, style, w in fs:
        if (a.index is not None and i == a.index) or \
           (a.style is not None and style.lower() == a.style.lower()):
            hit = (f, full, style)
            break
    if not hit:
        sys.exit(f"style/index not found in {a.src}; use --list")
    f, full, style = hit
    os.makedirs(a.out, exist_ok=True)
    fam = f["name"].getDebugName(1).replace(" ", "")
    name = f"{fam}-{style.replace(' ', '')}.ttf"
    dest = os.path.join(a.out, name)
    f.save(dest)
    print(f"{full} → {dest} ({os.path.getsize(dest)//1024} KB)")


if __name__ == "__main__":
    main()
