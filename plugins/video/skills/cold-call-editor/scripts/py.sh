#!/bin/zsh
# Runs one of this skill's Python tools with the speech-to-text venv, which carries numpy
# and faster-whisper + mlx-whisper (the engine's bootstrap.mjs provisions it on first use; the system
# python3 may have neither). Run from the project's working directory:
#
#   /path/to/cold-call-editor/scripts/py.sh <tool>.py [args]
#
# Tools: diarize.py · onsets.py · realign.py · envelope.py · assemble.py · levels.py · sounds.py
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
node "$HERE/../../short-editor/scripts/bootstrap.mjs"
TOOL="${1:?which tool? diarize.py, onsets.py, realign.py, envelope.py, assemble.py, levels.py, sounds.py}"; shift
[[ -f "$HERE/$TOOL" ]] || { echo "no such tool: $TOOL" >&2; exit 2; }
exec "${WHISPER_PY:-$HOME/.venv/whisper/bin/python}" "$HERE/$TOOL" "$@"
