#!/bin/zsh
# The Whiteboard style's project (the Short video editor runs it as its first command):
#
#   init.sh <workspace/projects/<slug>> <the take> <workspace/videos/<slug>.mp4> [--speed 1.1] [--style behind|prints|cuts]
#
# One raw vertical take edited in place into one short, in the look of Long video to shorts: the shorts' own setup
# (plugins/video/skills/shorts/scripts/new.mjs --one), so both styles share one look and one code. It writes run.json
# (one: true, the take, out), README.md and the folders the pictures need; the edit itself (project.json, plan.mjs…) is
# scaffolded by the cut (cut.mjs --one). A file that exists is left as it is.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SHORTS="$(cd "$HERE/../../shorts/scripts" && pwd)"
DIR="${1:?missing project directory}"
SRC="${2:?missing source video}"
OUT="${3:?missing output file}"
shift 3
[[ -f "$SRC" ]] || { echo "source not found: $SRC" >&2; exit 1; }
node "$SHORTS/new.mjs" "$DIR" --video "$SRC" --one --out "$OUT" --skill whiteboard-editor "$@"
echo "next: node $SHORTS/listen.mjs $DIR --lang <the language spoken>"
