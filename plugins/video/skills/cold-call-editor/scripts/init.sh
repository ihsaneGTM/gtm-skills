#!/bin/zsh
# Scaffolds a working directory for one cold call.
#
#   /path/to/cold-call-editor/scripts/init.sh <work-dir> <source-video> [out.mp4]
#
# The engine's own scaffold first (the short-editor's init.sh: project.json read from the
# file, the SFX pack in assets/sfx-top5/, subs.config.json, cut.mjs), then this skill's
# plan.mjs, edl.mjs and assets/hookfx.json, the keys of the call language in project.json,
# and Geist Mono in assets/fonts/. A file that already exists is left as it is.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ENGINE="$(cd "$HERE/../../short-editor/scripts" && pwd)"
DIR="${1:?missing work directory}"
SRC="${2:?missing source video}"
OUT="${3:-}"

mkdir -p "$DIR/assets"
# this skill's plan and edit first: the engine's scaffold leaves an existing file alone
for f in plan.mjs edl.mjs; do
  if [[ ! -f "$DIR/$f" ]]; then
    cp "$HERE/templates/$f" "$DIR/$f"
    sed -i '' -e "s#__ENGINE__#$ENGINE#g" -e "s#__SKILL__#$HERE#g" "$DIR/$f"
  fi
done
[[ -f "$DIR/assets/hookfx.json" ]] || cp "$HERE/templates/hookfx.json" "$DIR/assets/hookfx.json"

"$ENGINE/init.sh" "$DIR" "$SRC" ${OUT:+"$OUT"} | sed '/^next:/d'

cd "$DIR"
# the levels of the call language (measured on the reference cut, on this master scale): set
# on a fresh project, never over a project already scaffolded for a call
python3 - <<'PY'
import json
p = json.load(open("project.json"))
if p.get("style") != "cold-call":
    p.update({
        "style": "cold-call",
        "speakers": {"A": {"name": "ME"}, "B": {"name": "PROSPECT"}},
        "blurBand": 0,
        "bed": "music.wav", "bedDb": -20.9,
        "sfxMasterDb": 2,
        "cueGains": {"hookBed": -15, "ring": -13.5},
    })
    json.dump(p, open("project.json", "w"), indent=2)
PY
node "$HERE/fonts.mjs" || echo "  (Geist Mono missing; the record falls back to a system mono)"
echo "next: $ENGINE/transcribe.sh --lang <the language spoken>, then $HERE/py.sh diarize.py --auto"
