#!/bin/zsh
# One short of a /video-long-to-shorts run, as an edit of the vertical engine (cut.mjs runs it):
#
#   init.sh <short-dir> <source/take.mov> <out.mp4> <style>
#
# The scrapbook's scaffold (the engine's: project.json from the file, the SFX pack; then its paper sounds, the Motionix
# pack, calibrated against this voice), with THIS skill's plan.mjs and edl.mjs written first (so the scrapbook's are not),
# the long video's faces in assets/fonts/ (the brand's title face, its italic serif, its text face, the mono) and the keys
# of the style « Document » in project.json. A file that exists is left as it is.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SKILL="$(cd "$HERE/.." && pwd)"
BOOK="$(cd "$HERE/../../scrapbook-editor/scripts" && pwd)"
ENGINE="$(cd "$HERE/../../short-editor/scripts" && pwd)"
FONTS="$(cd "$HERE/../../../motion/fonts" && pwd)"
DIR="${1:?missing short directory}"
SRC="${2:?missing source}"
OUT="${3:?missing output file}"
STYLE="${4:-headline}"

mkdir -p "$DIR/assets/media" "$DIR/assets/fonts"
for f in plan.mjs edl.mjs; do
  if [[ ! -f "$DIR/$f" ]]; then
    cp "$SKILL/templates/$f" "$DIR/$f"
    sed -i '' -e "s#__ENGINE__#$ENGINE#g" -e "s#__BOOK__#$BOOK#g" -e "s#__SHORTS__#$HERE#g" -e "s#__STYLE__#$STYLE#g" "$DIR/$f"
  fi
done
"$BOOK/init.sh" "$DIR" "$SRC" "$OUT" | sed '/^next:/d'
cd "$DIR"
for f in BricolageGrotesque.ttf InstrumentSerif-Italic.ttf Onest.ttf GeistMono.ttf; do
  [[ -f "assets/fonts/$f" ]] || cp "$FONTS/$f" "assets/fonts/$f"
done
# the brand's own faces and accent, when the user set them (workspace/brand/, Settings › Your brand)
python3 - "$STYLE" <<'PY'
import json, os, sys
style = sys.argv[1]
p = json.load(open("project.json"))
if not p.get("shortsStyle"):
    # the run's folder: two up for a short of a long video (shorts/<n>/), this one for a take edited in place (--one)
    run = os.path.abspath(".") if os.path.exists("run.json") else os.path.abspath(os.path.join("..", ".."))
    theme = {}
    try: theme = json.load(open(os.path.join(run, "brand", "theme.json")))
    except Exception: pass
    accent = (theme.get("colors") or {}).get("accent") or "#FFD90D"
    p.update({
        "shortsStyle": style,
        "faces": {"sans": "BricolageGrotesque.ttf", "serif": "InstrumentSerif-Italic.ttf", "text": "Onest.ttf"},
        "accent": accent, "wordColor": accent,
        "ink": (theme.get("colors") or {}).get("dark") or "#1A1A1A",
        "anchorX": 0.5, "anchorY": 0.36,
    })
    json.dump(p, open("project.json", "w"), indent=2)
PY
echo "short ready: $(pwd) · style $STYLE"
