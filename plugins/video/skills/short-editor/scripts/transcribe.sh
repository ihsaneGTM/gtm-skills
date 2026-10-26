#!/bin/zsh
# Word-level timestamps, with the machine provisioned on the way in.
#   /path/to/scripts/transcribe.sh [--model large-v3] [--lang en]
set -euo pipefail
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPTS/bootstrap.mjs"
exec "${WHISPER_PY:-$HOME/.venv/whisper/bin/python}" "$SCRIPTS/transcribe.py" "$@"
