#!/bin/zsh
# Scaffolds a working directory for one short in the scrapbook language.
#
#   /path/to/scrapbook-editor/scripts/init.sh <work-dir> <source-video> [out.mp4]
#
# The engine's own scaffold first (the short-editor's init.sh: project.json read from the file,
# subs.config.json, cut.mjs, the SFX pack in assets/sfx-top5/), then this skill's plan.mjs and
# edl.mjs, the keys of the scrapbook language in project.json, its three faces (Archivo, Fraunces and
# the marker hand of the paper, Gochi Hand) in assets/fonts/,
# its paper sounds in assets/sfx-paper/ (fetched once per machine from Mixkit) and the Motionix
# pack in assets/sfx-motionix/ (from the shelf), calibrated against the voice of this source. A
# file that already exists is left as it is.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ENGINE="$(cd "$HERE/../../short-editor/scripts" && pwd)"
DIR="${1:?missing work directory}"
SRC="${2:?missing source video}"
OUT="${3:-}"

mkdir -p "$DIR/assets/media"
# this skill's plan and edit first: the engine's scaffold leaves an existing file alone
for f in plan.mjs edl.mjs; do
  if [[ ! -f "$DIR/$f" ]]; then
    cp "$HERE/templates/$f" "$DIR/$f"
    sed -i '' -e "s#__ENGINE__#$ENGINE#g" -e "s#__SKILL__#$HERE#g" "$DIR/$f"
  fi
done

"$ENGINE/init.sh" "$DIR" "$SRC" ${OUT:+"$OUT"} | sed '/^next:/d'

cd "$DIR"
# the keys of the scrapbook language: set on a fresh project, never over one already scaffolded
python3 - <<'PY'
import json
p = json.load(open("project.json"))
if p.get("style") != "scrapbook":
    p.pop("bed", None); p.pop("bedDb", None)          # the bed is set by music.mjs (Hip Hop 02 by default, § 0.2)
    p.update({
        "style": "scrapbook",
        "blurBand": 0,
        "anchorX": 0.5, "anchorY": 0.40,
        "accent": "#FFD43B",          # the accent paper and the caption word being said: the brand's colour (a bright one)
        "captionKeep": [],            # names the captions write as they are (brand, product, people)
        "cueGains": {},
        "lufs": -14.0, "ceilingDbtp": -1.0,
    })
    json.dump(p, open("project.json", "w"), indent=2)
PY
node "$HERE/fonts.mjs" || echo "  (a face is missing; the figures fall back to system faces and say so)"
node "$HERE/sounds.mjs" --calibrate
echo "next: $ENGINE/transcribe.sh --lang <the language spoken>, then $HERE/py.sh tighten.py"
