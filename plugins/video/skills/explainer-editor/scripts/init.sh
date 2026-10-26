#!/bin/zsh
# Scaffolds a working directory for one take in the explainer language.
#
#   /path/to/explainer-editor/scripts/init.sh <work-dir> <source-video> [out.mp4] [--theme light]
#
# The engine's own scaffold first (the short-editor's init.sh: project.json read from the
# file, the SFX pack in assets/sfx-top5/), then this skill's plan.mjs and edl.mjs, the light
# sounds of the Motionix pack in assets/sfx-motionix/, the keys of the explainer language in
# project.json (the layout: the speaker's frame at the bottom of the stage; the levels) and the
# faces (Inter, Instrument Serif) in assets/fonts/.
# A file that already exists is left as it is.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ENGINE="$(cd "$HERE/../../short-editor/scripts" && pwd)"
# --theme light: the light version of the stage (project.json stage.theme); dark otherwise, and a
# project already scaffolded keeps its own
THEME=""; ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --theme) THEME="${2:?--theme dark|light}"; shift 2 ;;
    --light) THEME="light"; shift ;;
    *) ARGS+=("$1"); shift ;;
  esac
done
DIR="${ARGS[1]:?missing work directory}"
SRC="${ARGS[2]:?missing source video}"
OUT="${ARGS[3]:-}"
# absolute: the steps below run from inside the work directory (a relative source was not found
# there, and the sounds were never set on the voice)
SRC="${SRC:A}"; [[ -n "$OUT" ]] && OUT="${OUT:A}"

mkdir -p "$DIR/assets"
# this skill's plan and edit first: the engine's scaffold leaves an existing file alone
for f in plan.mjs edl.mjs; do
  if [[ ! -f "$DIR/$f" ]]; then
    cp "$HERE/templates/$f" "$DIR/$f"
    sed -i '' -e "s#__ENGINE__#$ENGINE#g" -e "s#__SKILL__#$HERE#g" "$DIR/$f"
  fi
done

"$ENGINE/init.sh" "$DIR" "$SRC" ${OUT:+"$OUT"} | sed '/^next:/d'

cd "$DIR"
# the engine's subtitles and cut list are not this style's: the captions are the stage's
rm -f subs.config.json
# the light sounds of what appears (the Motionix pack, prepared on the shelf), next to the house pack
MX="$HERE/../../../assets/sfx/motionix"
if [[ -f "$MX/kit.json" ]]; then
  mkdir -p assets/sfx-motionix
  for f in "$MX"/*.wav "$MX"/kit.json; do [[ -f "assets/sfx-motionix/${f:t}" ]] || cp "$f" assets/sfx-motionix/; done
else
  echo "  (the Motionix pack is not on the shelf: $MX; the small sounds fall back on the SFX pack)"
fi
# the keys of the explainer language, set on a fresh project, never over one already scaffolded
python3 - "$HERE/layout.mjs" "$THEME" <<'PY'
import json, sys
p = json.load(open("project.json"))
# the theme: the one asked for, else the one already set, else dark
want = sys.argv[2] if sys.argv[2] in ("dark", "light") else (p.get("stage") or {}).get("theme", "dark")
if (p.get("stage") or {}).get("theme") != want:
    p.setdefault("stage", {})["theme"] = want
    json.dump(p, open("project.json", "w"), indent=2)
if p.get("style") != "explainer":
    for k in ("script", "scriptBlack", "appName", "wallpaper", "anchorX", "anchorY"):
        p.pop(k, None)
    p.update({
        "style": "explainer",
        "layout": sys.argv[1],
        "blurBand": 0,
        "bed": "music.wav", "bedDb": None,
        "sfxMasterDb": -15,
    })
    json.dump(p, open("project.json", "w"), indent=2)
# a portrait take narrower than 1080 gets a 1080x1920 master: the text is drawn sharp, and the
# picture is scaled into the frame anyway (every time: the engine's scaffold, run again on a
# project, sets the format back to the source's)
if p["height"] > p["width"] and p["width"] < 1080:
    p["height"] = round(p["height"] * 1080 / p["width"] / 2) * 2
    p["width"] = 1080
    json.dump(p, open("project.json", "w"), indent=2)
PY
# the house sounds at the level the base skills are heard at (measured as heard on the reference
# take: whoosh 9-11 LU under the programme), whatever the take's own level: sfxMasterDb from the
# loudness of its voice (I + 15.3 dB, a little more on a quiet take), set once on a fresh project
python3 - "$SRC" <<'PY'
import json, subprocess, re, sys
p = json.load(open("project.json"))
if not p.get("sfxCalibrated"):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", sys.argv[1], "-map", "0:a:0", "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", out)
    if m:
        I = float(m[-1])
        # a quiet take (heavily lifted by the loudness pass) hears its sounds lower: +0.13 dB per dB
        # under the reference's −20.5 LUFS (measured on two takes: −20.5 → +0, −31.8 → +1.5)
        p["sfxMasterDb"] = round(max(-24, min(6, I + 15.3 + 0.13 * max(0, -20.5 - I))), 1)
        p["voiceLufs"] = I
        p["sfxCalibrated"] = True
        json.dump(p, open("project.json", "w"), indent=2)
        print(f"  the voice at {I} LUFS: sfxMasterDb {p['sfxMasterDb']}")
PY
node "$HERE/fonts.mjs" || echo "  (a face is missing: the captions and titles fall back to Helvetica Neue)"
# the person matte needs a portrait take: say it now rather than at the first render
python3 - <<'PY'
import json
p = json.load(open("project.json"))
if p["width"] > p["height"]:
    print("  ⚠ a landscape take: this style is made for a vertical one (9:16), the frame and the matte assume it")
PY
echo "next: $ENGINE/transcribe.sh --lang <the language spoken>, then node $ENGINE/matte.mjs and node $HERE/layout.mjs --measure --write"
