#!/bin/zsh
# Scaffolds a working directory for one video.
#
#   /path/to/skill/scripts/init.sh <work-dir> <source-video> [out.mp4]
#
# Everything for a cut lives in that directory: project.json, edl.mjs, plan.mjs,
# the assets, the intermediates. The skill's scripts/ stays read-only.
set -euo pipefail
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
DIR="${1:?missing work directory}"
SRC="${2:?missing source video}"
OUT="${3:-}"
[[ -f "$SRC" ]] || { echo "source not found: $SRC" >&2; exit 1; }
SRC="$(cd "$(dirname "$SRC")" && pwd)/$(basename "$SRC")"

node "$SCRIPTS/bootstrap.mjs"

# The output may live elsewhere (a shared exports folder): create it, and make
# it absolute BEFORE the cd below, or a relative path would land in the project.
if [[ -n "$OUT" ]]; then
  mkdir -p "$(dirname "$OUT")"
  OUT="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
fi

mkdir -p "$DIR/assets"
cd "$DIR"
[[ -n "$OUT" ]] || OUT="$(pwd)/short-v1.mp4"

# ffprobe's csv output does not guarantee the order of two -show_entries
# groups, so read JSON and let python pick the fields by name.
read -r W H DUR FPS <<<"$(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate -show_entries format=duration \
  -of json "$SRC" | python3 -c "
import json, sys
d = json.load(sys.stdin)
st = d['streams'][0]
num, den = (st['r_frame_rate'].split('/') + ['1'])[:2]
print(st['width'], st['height'], d['format']['duration'], round(float(num) / float(den)))
")"

for f in project.json edl.mjs plan.mjs subs.config.json cut.mjs; do
  [[ -f "$f" ]] && { echo "  $f already exists, left as is"; continue; }
  cp "$SCRIPTS/templates/$f" "$f"
  # the plan imports the engine by absolute path: a working directory lives outside
  # the skill (workspace/projects/<slug>/), so a relative "../scripts" resolves to nothing
  if [[ "$f" == plan.mjs || "$f" == edl.mjs ]]; then sed -i '' "s#__SCRIPTS__#$SCRIPTS#g" "$f"; fi
done
python3 - "$SRC" "$OUT" "$W" "$H" "$DUR" "$FPS" <<'PY'
import json, sys
src, out, w, h, dur, fps = sys.argv[1:7]
p = json.load(open("project.json"))
# The overlay is drawn at the OUTPUT size, so cap it at 1080 wide: a 4K take
# would otherwise make every frame 4x the pixels for no gain on a phone.
w, h = int(w), int(h)
if w > 1080:
    h = round(h * 1080 / w / 2) * 2
    w = 1080
p.update(source=src, out=out, width=w, height=h,
         duration=round(float(dur), 3), fps=int(fps))
json.dump(p, open("project.json", "w"), indent=2)
PY

# the house sound design: the SFX pack (flash, click, whoosh, glitch, riser), already at
# 48 kHz 16-bit; sfx.mjs reads a sample from the project's assets/, never from the shelf
PACK="$SCRIPTS/../../../assets/sfx/top5"
if [[ -d "$PACK" ]]; then
  mkdir -p assets/sfx-top5
  for f in "$PACK"/*.wav; do [[ -f "assets/sfx-top5/$(basename "$f")" ]] || cp "$f" assets/sfx-top5/; done
else
  echo "  (SFX pack not found: $PACK; the sample:sfx-top5/... cues will fail)"
fi

# the explainer's light sounds (the Motionix pack), what figures.mjs and paperend.mjs emit through
# pro.mjs mx(): one per thing that appears or moves over the speaker
MXP="$SCRIPTS/../../../assets/sfx/motionix"
if [[ -d "$MXP" ]]; then
  mkdir -p assets/sfx-motionix
  for f in "$MXP"/*.wav; do [[ -f "assets/sfx-motionix/$(basename "$f")" ]] || cp "$f" assets/sfx-motionix/; done
else
  echo "  (Motionix pack not found: $MXP; the light sounds of figures.mjs will fail)"
fi

node "$SCRIPTS/fonts.mjs" || echo "  (accent font missing; the headlines fall back to Snell Roundhand)"

echo
echo "work directory ready: $(pwd)"
echo "  source   $SRC"
echo "  format   ${W}x${H} · ${FPS} fps · ${DUR}s"
echo "  output   $OUT"
echo
echo "next: $SCRIPTS/transcribe.sh   then write plan.mjs and edl.mjs"
