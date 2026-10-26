#!/bin/zsh
# Renders the finished short. Run from the project's working directory:
#
#   /path/to/skill/scripts/build.sh
#
# Stages: voice -> effects -> mix -> overlay -> mux. Each one is cheap to redo
# except the overlay, so audio-only changes skip straight to the remux.
#
#   --audio-only   re-mix and remux, keep the rendered picture (~1 min)
#   --slice A B    render only [A,B] seconds, for a look at one beat, at the master's quality
#
# The picture is composited in SEGMENTS of about four seconds, kept in .render/ with what each one
# was made from: the next build draws and composites again only the segments whose picture changed
# (a title moved, a sticker added: one or two of them; render.mjs --fingerprint tells it without
# drawing them) and joins them to the others with -c copy, frame for frame what one pass gives.
# `rm -rf .render` forgets them. For an A/B: ENCODER=x264 (the encoder before the media engine),
# ONE_PASS=1 (the whole picture in one pass, nothing kept).
set -euo pipefail
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
[[ -f project.json ]] || { echo "project.json not found; run from the work directory" >&2; exit 1; }

# Provisions the machine on first run so nobody has to install anything.
node "$SCRIPTS/bootstrap.mjs"

AUDIO_ONLY=0; SLICE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --audio-only) AUDIO_ONLY=1; shift ;;
    --slice) SLICE="$2 $3"; shift 3 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

j() { python3 -c "import json,sys; print(json.load(open('project.json')).get('$1',''))"; }
SRC="$(j source)"; OUT="$(j out)"; DUR="$(j duration)"
W="$(j width)"; H="$(j height)"; FPS="$(j fps)"
: "${W:=1080}"; : "${H:=1920}"; : "${FPS:=60}"
# A LONG video edited only up to editEnd (an intro): the camera and the overlay
# run to that point, the rest of the picture is passed through untouched at the
# output size and concatenated — one encode, no keyframe games. Absent (or past
# the end), the whole video is edited, exactly as before.
# A project may PLAY ITS SOURCE FASTER than it was shot (project.json `speed`).
# Everything downstream lives on the OUTPUT timeline: `duration`, `editEnd`, the
# camera steps, the beats and the cues are all output times, so the whole edit
# is authored once at the final pace. The picture is retimed with setpts (frames
# are dropped to keep fps), the voice with atempo (which preserves pitch — a
# plain asetrate would make the speaker a chipmunk).
SPEED="$(j speed)"; : "${SPEED:=1}"
python3 -c "import sys; sys.exit(0 if abs(float('$SPEED')-1) > 0.001 else 1)" && RETIME=1 || RETIME=0
EDIT_END="$(j editEnd)"; : "${EDIT_END:=$DUR}"
python3 -c "import sys; sys.exit(0 if float('$EDIT_END') < float('$DUR') - 0.05 else 1)" && PARTIAL=1 || { PARTIAL=0; EDIT_END="$DUR"; }
# --- 0. cuts: stretches of the SOURCE removed before anything sees them --------
# project.json `cuts` = [[a, b], …] in SOURCE seconds (cuts.mjs). A retake left in
# the master vanishes from the picture and the voice by the same frames, and
# everything downstream keeps living on one output timeline — the speed applies
# AFTER the cuts. --slice seeks the input and cannot cross them: an excerpt of a
# project with cuts is cut from the finished master with -c copy, or looked at
# with preview.mjs, which maps output time through the cuts.
NCUTS="$(node "$SCRIPTS/cuts.mjs" --count)"
if [[ -n "$SLICE" && "$NCUTS" -gt 0 ]]; then
  echo "--slice cannot cross cuts: cut the finished master with -c copy, or look at the shot with preview.mjs" >&2; exit 2
fi
VCUT=""; VSRC="[0:v]"
if [[ "$NCUTS" -gt 0 ]]; then VCUT="$(node "$SCRIPTS/cuts.mjs" --video)"; VSRC="[vsrc]"; fi
TMP="${OUT%.mp4}.part.mp4"
[[ -f "$SRC" ]] || { echo "source not found: $SRC" >&2; exit 1; }

# --- 1. the voice, at the working rate ---------------------------------------
# `voiceChain` in project.json is an ffmpeg filter string applied to the SPOKEN
# track only — the room treatment (see references/audio-spec.md, "the room"). It
# runs BEFORE atempo on purpose: an expander's release is set from the room's
# measured decay, and that decay belongs to the original timebase.
# Changing it costs no picture render: `rm voice.wav && build.sh --audio-only`.
VOICE_FX="$(j voiceChain)"
if [[ ! -f voice.wav ]]; then
  AF="$VOICE_FX"
  [[ $RETIME -eq 1 ]] && AF="${AF:+$AF,}atempo=${SPEED}"
  if [[ "$NCUTS" -gt 0 ]]; then
    ffmpeg -v error -y -i "$SRC" -filter_complex "$(node "$SCRIPTS/cuts.mjs" --audio "$AF")" -map "[aout]" -ar 48000 -c:a pcm_s16le voice.wav
  elif [[ -n "$AF" ]]; then
    ffmpeg -v error -y -i "$SRC" -map 0:a -af "$AF" -ar 48000 -c:a pcm_s16le voice.wav
  else
    ffmpeg -v error -y -i "$SRC" -map 0:a -ar 48000 -c:a pcm_s16le voice.wav
  fi
fi

# --- 2. the effect bed --------------------------------------------------------
# A slice used to carry the SOURCE audio — no bed, no effects, no loudness pass —
# on the grounds that it is "for looking at one beat". That made the review file
# LIE about the deliverable: a reviewer watched an intro whose music and whose
# pen sounds were absent BY CONSTRUCTION and reported them missing, and an
# unknown-effect error thrown by a plate's cue never surfaced either, because
# the stage that raises it never ran. A slice now carries the real mix; it costs
# about 50 s, which is the price of a review file that tells the truth.
node "$SCRIPTS/sfx.mjs"

# --- 3. the mix, at the loudness standard -------------------------------------
node "$SCRIPTS/mix.mjs"

# The source's COLOUR TAGS, carried through to the master. x264 does not infer
# them from the input, so a re-encode that touches no pixel still ships a file
# whose transfer and primaries read "unknown" — players then guess (usually
# BT.709, so it looks right) but the master no longer DECLARES what was shot.
# `-of default=nw=1:nk=1` because `csv=p=0` appends a separator when the stream
# carries side data, and that trailing comma kills the filterchain.
ctag() { ffprobe -v error -select_streams v:0 -show_entries stream=$1 -of default=nw=1:nk=1 "$SRC" | head -1; }
CPRIM="$(ctag color_primaries)"; CTRC="$(ctag color_transfer)"; CSPC="$(ctag color_space)"
COLOR=()
[[ -n "$CPRIM" && "$CPRIM" != "unknown" ]] && COLOR+=(-color_primaries "$CPRIM")
[[ -n "$CTRC"  && "$CTRC"  != "unknown" ]] && COLOR+=(-color_trc "$CTRC")
[[ -n "$CSPC"  && "$CSPC"  != "unknown" ]] && COLOR+=(-colorspace "$CSPC")
# The output options alone are NOT enough behind a filtergraph: measured on this
# very graph, `-colorspace` survives and `-color_primaries` / `-color_trc` are
# dropped, because what the encoder writes comes from the FRAME the graph hands
# it and the overlay chain hands it a frame with those two unset. So the tags are
# also stamped ON the frame, at the end of the chain, with `setparams`. Keep both:
# `setparams` is what fixes the re-encode, the output options are what carry the
# tags through the audio-only remux, where there is no filtergraph at all.
SETP=""
[[ ${#COLOR[@]} -gt 0 ]] && SETP=",setparams=color_primaries=${CPRIM}:color_trc=${CTRC}:colorspace=${CSPC}"

if [[ $AUDIO_ONLY -eq 1 ]]; then
  [[ -f "$OUT" ]] || { echo "no rendered picture to reuse; run a full build" >&2; exit 1; }
  # A remux needs room for a SECOND copy of the master, and on a long video that
  # is half a gigabyte. Say so before writing rather than dying half-way with
  # "No space left on device" — and clean up either way: `set -e` used to kill
  # the script on ffmpeg's failure BEFORE the `rm -f .prev.mp4` below, so a
  # remux that ran out of space left a full-size copy behind and made the next
  # attempt fail sooner. `|| rc=$?` keeps the cleanup reachable.
  NEED="$(( $(stat -f%z "$OUT") / 1048576 + 64 ))"
  FREE="$(df -m . | tail -1 | awk '{print $4}')"
  [[ $FREE -ge $NEED ]] || { echo "not enough space: ${FREE} MB free, the remux needs ${NEED}" >&2; exit 1; }
  cp "$OUT" .prev.mp4
  rc=0
  ffmpeg -hide_banner -v error -y -i .prev.mp4 -i mix.wav \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${COLOR[@]}" -shortest -movflags +faststart "$TMP" || rc=$?
  rm -f .prev.mp4
  [[ $rc -eq 0 ]] || { echo "remux failed (code $rc); the previous file is intact" >&2; rm -f "$TMP"; exit $rc; }
  mv "$TMP" "$OUT"
  echo "OK (audio only) -> $OUT"
  exit 0
fi

# --- the encoder ----------------------------------------------------------------
# The Mac's media engine (VideoToolbox) when it can, x264 otherwise. The composite's own filters
# keep about seven cores busy, so x264 slowed every render down by fighting them for the CPU,
# while the media engine costs the CPU nothing. Measured 2026-10-08, the composite of a 50 s edit
# at 1080x1920: 49 s with x264 medium, 20 s with the engine; 20 s of a 60 fps one: 30 s, 17 s.
# q 87 is the lowest setting that measured at least x264 medium CRF 14 on both test videos (VMAF,
# SSIM, SSIM of the headline band, and their worst frames); the price is the file, 2 to 3 times
# larger (171 MB instead of 86 for those 50 s). -g 250 as x264: the engine's default is a keyframe
# every 12 frames, 17 % of the file for nothing.
# A Mac whose engine refuses it (an Intel Mac has no constant-quality mode) gets x264, as before;
# so does ENCODER=x264. ENCODER=lossless is for checking that two renders give the same frames.
X264=(-c:v libx264 -preset medium -crf 14)
case "${ENCODER:-}" in
  x264) VENC=("${X264[@]}") ;;
  lossless) VENC=(-c:v libx264 -preset ultrafast -qp 0 -x264-params no-fast-pskip=1) ;;   # without it, not lossless
  *) VENC=(-c:v h264_videotoolbox -q:v 87 -g 250)
     ffmpeg -v quiet -f lavfi -i color=black:s=256x256:r=30 -frames:v 2 "${VENC[@]}" -f null - </dev/null \
       || VENC=("${X264[@]}") ;;
esac
# A slice is encoded like the master, so what it shows is what the master will look like. On x264
# (no engine, or SLICE_CRF / SLICE_PRESET set) it keeps its fast preset, veryfast CRF 20 by default.
if [[ "${VENC[2]}" == h264_videotoolbox && -z "${SLICE_CRF:-}${SLICE_PRESET:-}" ]]; then SVENC=("${VENC[@]}")
else SVENC=(-c:v libx264 -preset "${SLICE_PRESET:-veryfast}" -crf "${SLICE_CRF:-20}"); fi

# --- 3.5 the person matte, when the project has one ---------------------------
# matte/ holds one mask per OUTPUT frame of the edited stretch, already retimed
# but NOT camera'd — so the same zoompan can be applied to it below and the mask
# lands pixel-aligned on the picture. Beats declaring `layer: "under"` are then
# drawn BEHIND the speaker. Build it with `node matte.mjs` (about a minute for a minute at 30 fps).
MATTE=0
if [[ -d matte && -n "$(ls matte/*.png 2>/dev/null | head -1)" ]]; then MATTE=1; fi
# The mask sequence has to run to editEnd. When the edit goes PAST the last frame
# the speaker is in (an ident laid over the cut), the image2 demuxer hits a missing file,
# logs one line and ends the mask stream — and the person layer silently stops
# there. So the sequence is padded with EMPTY masks (nobody in frame) up to the
# edited length, which is also the truth: past the cut there is no one to matte.
if [[ $MATTE -eq 1 ]]; then
  HAVE=$(ls matte/m*.png 2>/dev/null | wc -l | tr -d ' ')
  NEED=$(python3 -c "import math; print(math.ceil(float('$EDIT_END')*${FPS})+2)")
  if (( HAVE < NEED )); then
    ffmpeg -v error -y -f lavfi -i "color=black:s=${W}x${H}:r=1" -frames:v 1 -pix_fmt gray .matte-empty.png
    for ((i = HAVE + 1; i <= NEED; i++)); do cp .matte-empty.png "matte/m$(printf %05d $i).png"; done
    echo "matte: $((NEED - HAVE)) empty mask(s) added after the last shot of the speaker (up to ${EDIT_END}s)"
  fi
fi

# The mask sequence must keep ONE pixel format from its first file to its last: a
# change mid-way (a repainted mask written as rgb24 among gray ones) makes ffmpeg
# re-initialise the filtergraph at that frame and drop the layers for a few frames.
# `-reinit_filter 0` on the mask input converts instead of re-initialising, and
# this check says so when it happens rather than letting it pass silently.
if [[ $MATTE -eq 1 ]]; then
  MFMT="$(for f in matte/m00001.png matte/m$(printf %05d $(( $(ls matte/m*.png | wc -l) / 2 ))).png; do ffprobe -v error -show_entries stream=pix_fmt -of csv=p=0 "$f"; done | sort -u | wc -l | tr -d ' ')"
  [[ "$MFMT" == "1" ]] || echo "⚠ matte/ mixes several pixel formats; re-run matte-holes.mjs (it rewrites them as gray)" >&2
fi

# --- 4. the overlay + the picture ---------------------------------------------
Z0="$(node "$SCRIPTS/zexpr.mjs")"
GATE0="$(node "$SCRIPTS/gate.mjs")"
# the horizontal anchor is an expression of time (a step's 4th value), so the
# frame can drift away from a title block as it punches in
AX0="$(node "$SCRIPTS/zexpr.mjs" --ax)"
AY="$(python3 -c "import json;print(json.load(open('project.json')).get('anchorY',0.34))")"
# The band that gets the progressive blur, and how far down it fades out.
BAND="$(python3 -c "import json;print(json.load(open('project.json')).get('blurBand',700))")"
SW=$((W * 7 / 6)); SH=$((H * 7 / 6))            # headroom so the zoom never samples past the edge
RAMP="clip((80.4-Y)/21.4\,0\,1)"
# A style that LAYS THE PICTURE OUT instead of zooming it (project.json `layout`: the path of
# a script, e.g. the explainer's speaker frame at the bottom of a black stage) prints its own
# camera filters: one for the picture, one for the matte (its labels differ), both on the
# output timeline from `--offset` (where a slice starts). The rest of the graph is unchanged.
LAYOUT="$(j layout)"; [[ "$LAYOUT" == "None" ]] && LAYOUT=""
PRE=""
[[ $RETIME -eq 1 ]] && PRE="setpts=PTS/${SPEED},fps=${FPS},"

# The old-school look, when the project has one (project.json `look`, LOOK=… for an A/B): its
# stretch, "from to" in output seconds, empty without one.
LOOKSPAN="$(node --input-type=module -e "
import fs from 'node:fs'; import { currentLook } from '$SCRIPTS/looks.mjs';
const l = currentLook(JSON.parse(fs.readFileSync('project.json', 'utf8')));
process.stdout.write(l ? l.from + ' ' + l.to : '')")"

# make_fc <offset> <length> <whole>: the composite's filtergraph for the stretch of the OUTPUT that
# starts at <offset> s and lasts <length> s. A stretch that does not start at 0 seeks its inputs,
# so the camera, the gate, the layout and the look are told where it starts — otherwise a preview
# of beat 3 plays the zoom of beat 1. whole=1: the full edit, with the untouched tail of a
# partial one. Inputs: [0] source, [1] over layer, [2] under layer, [3] masks.
make_fc() {
  local off="$1" len="$2" whole="$3"
  local Z="$Z0" AX="$AX0" GATE="$GATE0" HEAD TAIL OVL CAM CAMM="" CHAIN LOOKF
  if [[ "$off" != 0 ]]; then
    Z="${Z//it/(it+$off)}"; AX="${AX//it/(it+$off)}"; GATE="${GATE//T/(T+$off)}"
  fi
  # The edited stretch: [0, EDIT_END). With a partial edit the source is split,
  # the head goes through the camera + overlay, the tail is only scaled.
  if [[ $whole -eq 1 && $PARTIAL -eq 1 ]]; then
    HEAD="${VCUT}${VSRC}${PRE}split=2[s_head][s_tail];
[s_head]trim=0:${EDIT_END},setpts=PTS-STARTPTS,"
    TAIL="[s_tail]trim=${EDIT_END},setpts=PTS-STARTPTS,scale=${W}:${H}:flags=lanczos,fps=${FPS}[tail];
[head][tail]concat=n=2:v=1:a=0,format=yuv420p${SETP}[v]"
    OVL="[bg][1:v]overlay=0:0:format=auto:eof_action=pass[head];"
  else
    HEAD="${VCUT}${VSRC}${PRE}"
    TAIL=""
    OVL="[bg][1:v]overlay=0:0:format=auto,format=yuv420p${SETP}[v]"
  fi
  CAM="scale=${SW}:${SH}:flags=lanczos,zoompan=z='$Z':x='(iw*zoom-ow)*(${AX})':y='(ih*zoom-oh)*${AY}':d=1:s=${SW}x${SH}:fps=${FPS},scale=${W}:${H}:flags=lanczos"
  if [[ -n "$LAYOUT" ]]; then
    CAM="$(node "$LAYOUT" --ffmpeg --tag v --offset "$off")"
    CAMM="$(node "$LAYOUT" --ffmpeg --tag m --offset "$off")"
  fi
  if [[ "$GATE" == "0" || "$BAND" == "0" ]]; then
    CHAIN="${HEAD}${CAM}[bg];"
  else
    CHAIN="${HEAD}${CAM},split=2[b1][b2];
[b2]crop=${W}:${BAND}:0:0,gblur=sigma=17:steps=3,eq=brightness=-0.07:saturation=0.92,format=yuva420p[bl];
nullsrc=s=135x88:r=${FPS}:d=${EDIT_END},format=gray,geq=lum='255*${RAMP}*${GATE}',scale=${W}:${BAND}[mk];
[bl][mk]alphamerge[bla];
[b1][bla]overlay=0:0:format=auto[bg];"
  fi
  # With a matte, the picture is split: one copy is the background, the other is
  # cut out as the person and put back ON TOP of the under-layer. render.mjs runs
  # TWICE, once per layer, each into its own lossless file (see the layers below —
  # live FIFOs let the picture drift ahead of the layers).
  if [[ $MATTE -eq 1 ]]; then
    # the mask goes through the IDENTICAL camera expression; `it` starts at 0 on
    # both inputs, so the two stay frame-locked with no offset to maintain
    CHAIN="${CHAIN/\[bg\];/[cam];}"
    # The mask stream is CUT to the edited length. matte/ outlives the timeline (a
    # shorter editEnd, a cut in the source) and the compositing filters run until
    # their LONGEST input ends, repeating the last picture frame: 67 surplus masks
    # once froze the picture for 2.23 s after the ident and put the whole tail 2.2 s
    # behind the voice (sound and picture visibly out of sync).
    CHAIN="${CHAIN}
[3:v]trim=end=${len},setpts=PTS-STARTPTS,format=gray,${CAMM:-$CAM}[maskcam];
[cam]split=2[bgp][cutp];
[cutp][maskcam]alphamerge[person];
[bgp][2:v]overlay=0:0:format=auto:eof_action=pass[b1];
[b1][person]overlay=0:0:format=auto[bg];"
  fi
  # --- an old-school LOOK on one stretch (project.json `look`, looks.mjs) ---
  # It runs on the composited picture — footage, the titles behind the speaker, the speaker — and
  # BEFORE the over layer, so the flash that ends it stays a clean white on top.
  # LOOK=<preset>|none overrides it for an A/B.
  LOOKF=""
  [[ -n "$LOOKSPAN" ]] && LOOKF="$(node "$SCRIPTS/looks.mjs" --ffmpeg --offset "$off")"
  if [[ -n "$LOOKF" ]]; then
    CHAIN="${CHAIN%\[bg\];}[bgraw];
${LOOKF}"
  fi
  printf '%s\n%s\n%s\n' "$CHAIN" "$OVL" "$TAIL"
}

rm -f "$TMP"

# --- the layers are drawn to FILES first, then composited ----------------------
# They used to be streamed live into FIFOs, and that is not safe. ffmpeg decodes
# the source far faster than render.mjs draws a layer (~5 frames a second), so it
# queues decoded source frames while it waits — measured on the GTM OS short
# (2026-09-29, a 60 fps vertical 4K source): 5.3 GB of RSS for six seconds of
# output, then the process was killed; and on the 21.7 s build that did survive,
# the PICTURE came out ten frames AHEAD of the layers from 3.92 s on — the source's
# own hard cut landed at 3.917 s instead of 4.083, two frames carried no layer at all,
# and the speaker's lips led the voice by 167 ms for the rest of the video. Nothing warned:
# the log was clean and verify.mjs passed. The same graph fed from files puts the
# cut on 4.083 exactly, at 1.2 GB of RSS.
# So each layer is rendered into lossless files, and the composite reads them at its own pace. The
# picture is still encoded exactly once: the layers are lossless intermediates, the source is never
# re-encoded before the master. The files are deleted once the master is published.
# QuickTime RLE (qtrle), lossless 8-bit ARGB: it stores only the rows a frame changes, and a layer is
# mostly still or empty. It replaced FFV1, which cost ~31 ms of CPU a frame to encode and 9-15 ms to
# decode, two thirds of the layers' time (qtrle: ~6 ms and ~1 ms; 2026-10-09, the composite frame
# for frame the same). In MOV with a time scale of 512 ticks a frame, so every layer frame sits on
# the picture's exact time. Never Matroska: it keeps time in whole MILLISECONDS, a frame at 2/30 s
# is stored at 0.067 > the picture's 0.0667, and the overlay showed the previous layer frame on
# every third frame (measured 2026-10-05: every animation juddered).
LAYERS=".layers"
rm -rf "$LAYERS"; mkdir -p "$LAYERS"
# A layer is drawn in PIECES at once (render.mjs --frames), one process a piece: a frame costs
# ~23 ms of drawing (the shadows, glows and blurs of the figures), on one core per process, and
# the Mac has more. Every frame is drawn at the very time a whole pass gives it (i / FPS), so the
# pieces are frame for frame one pass (framemd5, five projects, 2026-10-08). As many processes as
# the cores allow (two left for ffmpeg), 1.5 GB each at most (a plan may hold a decoded clip).
PIECES="$(node -e 'const o=require("os");process.stdout.write(String(Math.max(1,Math.min(o.availableParallelism()-2,Math.floor(o.totalmem()/1.5e9)))))')"
LAYER_CODEC="-c:v qtrle -pix_fmt argb -video_track_timescale $((FPS * 512)) -f mov"
draw_piece() {   # draw_piece <layer> <from> <to> <first frame> <end frame> <out.mov>
  node "$SCRIPTS/render.mjs" --layer "$1" --from "$2" --to "$3" --frames "$4" "$5" \
    | ffmpeg -hide_banner -v error -y -f rawvideo -pix_fmt rgba -s ${W}x${H} -r ${FPS} -i - \
        ${=LAYER_CODEC} "$6"
}
draw_layers() {  # draw_layers <from> <to> <layer>…  — each one whole, in pieces at once
  local a="$1" b="$2"; shift 2
  local n k i L p rc=0; local -a pids
  n="$(node -e "process.stdout.write(String(Math.round(($b - $a) * $FPS)))")"   # render.mjs's own count
  k=$(( PIECES / $# )); (( k > n / (2 * FPS) )) && k=$(( n / (2 * FPS) )); (( k < 1 )) && k=1
  for L in "$@"; do
    for ((i = 0; i < k; i++)); do
      draw_piece "$L" "$a" "$b" $(( n * i / k )) $(( n * (i + 1) / k )) "$LAYERS/$L.$i.mov" & pids+=($!)
    done
  done
  for p in $pids; do wait $p || rc=$?; done
  [[ $rc -eq 0 ]] || { echo "layers: render failed (code $rc)" >&2; exit $rc; }
  for L in "$@"; do
    if (( k == 1 )); then mv "$LAYERS/$L.0.mov" "$LAYERS/$L.mov"; continue; fi
    # each piece's EXACT length: estimated from the file, it comes out a frame short and the
    # join drops a frame at every seam (measured: 298 frames out of 300 with four pieces)
    for ((i = 0; i < k; i++)); do
      echo "file '$L.$i.mov'"
      echo "duration $(node -e "process.stdout.write(String(($(( n * (i + 1) / k )) - $(( n * i / k ))) / $FPS))")"
    done > "$LAYERS/$L.txt"
    ffmpeg -hide_banner -v error -y -f concat -safe 0 -i "$LAYERS/$L.txt" -c copy "$LAYERS/$L.mov" \
      || { echo "layers: joining the pieces of $L failed" >&2; exit 1; }
    for ((i = 0; i < k; i++)); do rm -f "$LAYERS/$L.$i.mov"; done
    rm -f "$LAYERS/$L.txt"
  done
}
LAYER_LIST=(over); [[ $MATTE -eq 1 ]] && LAYER_LIST=(over under)

if [[ -n "$SLICE" ]]; then
  set -- ${=SLICE}
  make_fc "$1" "$(python3 -c "print($2-$1)")" 0 > .fc.txt
  # --slice A B are OUTPUT times; the input seek is scaled back by the speed
  SS="$(python3 -c "print($1*$SPEED)")"; ST="$(python3 -c "print(($2-$1)*$SPEED)")"
  # mix.wav lives on the OUTPUT timeline, not the source's: its slice does
  # not go through the speed.
  SLEN="$(python3 -c "print($2-$1)")"
  draw_layers "$1" "$2" "${LAYER_LIST[@]}"
  rc=0
  if [[ $MATTE -eq 1 ]]; then
    # A matte project's filtergraph references [2:v] (the under layer) and
    # [3:v] (the mask). A slice that supplies only the source and one overlay
    # therefore dies on "Error binding filtergraph inputs/outputs" — which is
    # every landscape project, since an under-layer beat needs the matte. The
    # slice has to carry the SAME four inputs as the full render, with the mask
    # sequence started on the slice's own first frame: m00001.png is output
    # frame 0, so frame A is start_number round(A*FPS)+1.
    MSTART="$(python3 -c "print(round($1*${FPS})+1)")"
    ffmpeg -hide_banner -v warning -y \
      -ss "$SS" -t "$ST" -i "$SRC" \
      -i "$LAYERS/over.mov" -i "$LAYERS/under.mov" \
      -reinit_filter 0 -framerate ${FPS} -start_number "$MSTART" -i matte/m%05d.png \
      -ss "$1" -t "$SLEN" -i mix.wav \
      -filter_complex_script .fc.txt -map "[v]" -map 4:a \
      "${SVENC[@]}" -pix_fmt yuv420p -r ${FPS} "${COLOR[@]}" -c:a aac slice.mp4 || rc=$?
  else
    ffmpeg -hide_banner -v warning -y \
      -ss "$SS" -t "$ST" -i "$SRC" \
      -i "$LAYERS/over.mov" \
      -ss "$1" -t "$SLEN" -i mix.wav \
      -filter_complex_script .fc.txt -map "[v]" -map 2:a \
      "${SVENC[@]}" -pix_fmt yuv420p -r ${FPS} "${COLOR[@]}" -c:a aac slice.mp4 || rc=$?
  fi
  rm -rf "$LAYERS"
  [[ $rc -eq 0 ]] || { echo "slice failed (code $rc)" >&2; exit $rc; }
  echo "OK (slice $1-$2 s) -> slice.mp4"
  exit 0
fi

# --- the segments ----------------------------------------------------------------
# A segment starts on a whole second of the output that is also a whole frame of the SOURCE
# (seconds × speed × the source's rate, an integer), so its seek lands on the frame one pass
# would show there and every later frame follows the same way. Four seconds when they qualify,
# the nearest whole number of seconds from 2 to 12 otherwise. A source whose rate varies, a
# partial edit and cuts are rendered in one pass, as before.
SEGF=0
if [[ $PARTIAL -eq 0 && "$NCUTS" -eq 0 && -z "${ONE_PASS:-}" ]]; then
  SEGF="$(python3 - "$FPS" "$SPEED" "$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,avg_frame_rate -of csv=p=0 "$SRC")" <<'PY'
import sys
from fractions import Fraction as F
fps, speed = F(sys.argv[1]), F(sys.argv[2])
try:
    r, avg = (F(x) for x in sys.argv[3].strip().strip(",").split(",")[:2])
except (ValueError, ZeroDivisionError):
    print(0); sys.exit()
if r != avg or fps.denominator != 1:
    print(0); sys.exit()
for s in sorted(range(2, 13), key=lambda s: (abs(s - 4), s)):
    if (s * speed * r).denominator == 1:
        print(s * fps); break
else:
    print(0)
PY
)"
fi

if [[ "$SEGF" -gt 0 ]]; then
  NF="$(node -e "process.stdout.write(String(Math.round($EDIT_END * $FPS)))")"   # render.mjs's own count
  # Every segment: its first and end frames, where it starts and how long it lasts on the output,
  # where its source seek starts and how far it reads (a frame more, -frames:v cuts it). The look's
  # stretch (its frames held like a projector, its grain drawn frame after frame) is never split,
  # and no last segment lasts under a second: the one before takes it.
  SEGDEF="$(python3 - "$NF" "$SEGF" "$FPS" "$SPEED" "$LOOKSPAN" <<'PY'
import sys
nf, segf, fps, speed = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4])
span = [float(x) for x in sys.argv[5].split()] if sys.argv[5].strip() else None
num = lambda x: str(int(x)) if x == int(x) else repr(x)
starts = [0] + [a for a in range(segf, nf, segf)
                if nf - a >= fps and not (span and span[0] - 1e-9 < a / fps <= span[1] + 0.3)]
ends = starts[1:] + [nf]
print(" ".join(map(str, starts))); print(" ".join(map(str, ends)))
print(" ".join(num(a / fps) for a in starts)); print(" ".join(num((b - a) / fps) for a, b in zip(starts, ends)))
print(" ".join(num(a / fps * speed) for a in starts)); print(" ".join(num((b - a + 1) / fps * speed) for a, b in zip(starts, ends)))
PY
)"
  SEGL=("${(@f)SEGDEF}")
  SA=(${=SEGL[1]}); SB=(${=SEGL[2]}); SOFF=(${=SEGL[3]}); SLEN=(${=SEGL[4]}); SSS=(${=SEGL[5]}); SST=(${=SEGL[6]})
  NSEG=${#SA}
  mkdir -p .render
  # What every segment is made from, beyond its own frames: this script, ffmpeg, the source, the
  # encoder, the format, and the whole graph (camera, layout, look: a segment's own graph is the
  # same one told where it starts, so it changes only when this one does).
  make_fc 0 "$EDIT_END" 1 > .render/fc.txt
  GLOBAL="$(md5 -q "$0") $(ffmpeg -version | head -1) $(stat -f '%z %m' "$SRC") $SRC | ${VENC[*]} | ${COLOR[*]} | $W $H $FPS $SPEED $MATTE | $(md5 -q .render/fc.txt)"

  # 1. every segment's layers drawn DRY (render.mjs --fingerprint, fingerprint.mjs): the canvas
  # calls each piece would make, recorded without painting a pixel (0.2 s a piece instead of
  # seconds). The same record paints the same frames: only a segment whose record changed is drawn.
  t0=$SECONDS
  : > "$LAYERS/jobs"
  for ((i = 0; i < NSEG; i++)); do
    for L in "${LAYER_LIST[@]}"; do
      print -rn -- "node ${(q)SCRIPTS}/render.mjs --layer $L --from 0 --to $EDIT_END --frames ${SA[i+1]} ${SB[i+1]} --fingerprint > $LAYERS/$L.$i.fp 2> $LAYERS/$L.$i.err"$'\0' >> "$LAYERS/jobs"
    done
  done
  if ! xargs -0 -P "$PIECES" -n 1 zsh -c < "$LAYERS/jobs"; then
    grep -hv "^rendered (" "$LAYERS"/*.err >&2 || true
    echo "layers: their fingerprints failed" >&2; exit 1
  fi

  # 2. which segments changed: the graph, their layers' records, their masks. A piece the record
  # cannot follow (it reads pixels back, draws at random…) is "volatile": drawn every time.
  GLOBAL="$GLOBAL | $(md5 -q "$SCRIPTS/render.mjs") $(md5 -q "$SCRIPTS/fingerprint.mjs") $(node -p "require('$SCRIPTS/../node_modules/@napi-rs/canvas/package.json').version") $(sw_vers -productVersion 2>/dev/null) | $LAYER_CODEC"
  TODO=(); NVOL=0
  for ((i = 0; i < NSEG; i++)); do
    a=${SA[i+1]}; b=${SB[i+1]}
    fps=""; for L in "${LAYER_LIST[@]}"; do fps="$fps $(cat "$LAYERS/$L.$i.fp")"; done
    if [[ "$fps" == *volatile* ]]; then
      key="volatile"; NVOL=$((NVOL + 1))                    # never equal to a key: drawn again
    else
      key="$( { print -r -- "$GLOBAL | $a $b |$fps"
                if [[ $MATTE -eq 1 ]]; then printf 'matte/m%05d.png\0' {$((a+1))..$b} | xargs -0 cat; fi
              } | md5 -q )"
      if [[ -f ".render/seg.$i.mp4" && "$(cat ".render/seg.$i.key" 2>/dev/null)" == "$key" ]]; then continue; fi
    fi
    print -r -- "$key" > ".render/seg.$i.next"
    TODO+=($i)
  done
  for f in .render/seg.*.mp4(N); do
    i="${${f#.render/seg.}%.mp4}"
    if (( i >= NSEG )); then rm -f ".render/seg.$i".*; fi
  done

  # 3. the layers of the segments to composite again, drawn for real, PIECES processes at once
  : > "$LAYERS/jobs"
  for i in $TODO; do
    for L in "${LAYER_LIST[@]}"; do
      print -rn -- "node ${(q)SCRIPTS}/render.mjs --layer $L --from 0 --to $EDIT_END --frames ${SA[i+1]} ${SB[i+1]} 2> $LAYERS/$L.$i.err | ffmpeg -hide_banner -v error -y -f rawvideo -pix_fmt rgba -s ${W}x${H} -r ${FPS} -i - ${LAYER_CODEC} $LAYERS/$L.$i.mov"$'\0' >> "$LAYERS/jobs"
    done
  done
  if [[ ${#TODO} -gt 0 ]] && ! xargs -0 -P "$PIECES" -n 1 zsh -o pipefail -c < "$LAYERS/jobs"; then
    grep -hv "^rendered (" "$LAYERS"/*.err >&2 || true
    echo "layers: render failed" >&2; exit 1
  fi
  t1=$SECONDS

  # 3. the changed ones composited, three at once: the filters of one keep ~7 cores busy, yet three
  # beat two (50 s at 1080x1920: 34 s one at a time, 25 s two, 19 s three; 79 s at 60 fps: 60 s
  # three, 61 s four, 89 s five). Each with its own graph: the whole one told where it starts
  : > "$TMP"
  : > "$LAYERS/jobs"
  for i in $TODO; do
    make_fc "${SOFF[i+1]}" "${SLEN[i+1]}" 0 > ".render/fc.$i.txt"
    IN=(-ss "${SSS[i+1]}" -t "${SST[i+1]}" -i "$SRC" -i "$LAYERS/over.$i.mov")
    [[ $MATTE -eq 1 ]] && IN+=(-i "$LAYERS/under.$i.mov" -reinit_filter 0 -framerate ${FPS} -start_number $((SA[i+1] + 1)) -i matte/m%05d.png)
    print -rn -- "ffmpeg -hide_banner -v error -y ${(q)IN[@]} -filter_complex_script .render/fc.$i.txt -map '[v]' -frames:v $((SB[i+1] - SA[i+1])) ${(q)VENC[@]} -pix_fmt yuv420p -r ${FPS} ${(q)COLOR[@]} -an .render/seg.$i.part.mp4 && mv .render/seg.$i.part.mp4 .render/seg.$i.mp4 && mv .render/seg.$i.next .render/seg.$i.key"$'\0' >> "$LAYERS/jobs"
  done
  t2=$SECONDS
  if [[ ${#TODO} -gt 0 ]] && ! xargs -0 -P "${COMPOSITE_JOBS:-3}" -n 1 zsh -c < "$LAYERS/jobs"; then
    rm -f "$TMP" .render/seg.*.part.mp4
    echo "render failed" >&2; exit 1
  fi
  echo "segments: ${#TODO} of $NSEG drawn and composited (layers $(( t1 - t0 )) s with their fingerprints, composite $(( SECONDS - t2 )) s), the others kept as they were$( (( NVOL )) && print -n "; $NVOL drawn every render (their drawing cannot be fingerprinted)")"

  # 4. joined with -c copy, each one at its exact length, and the mix muxed in
  { print "ffconcat version 1.0"
    for ((i = 0; i < NSEG; i++)); do print "file 'seg.$i.mp4'"; print "duration ${SLEN[i+1]}"; done
  } > .render/list.txt
  rc=0
  ffmpeg -hide_banner -v error -y -f concat -i .render/list.txt -i mix.wav \
    -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k "${COLOR[@]}" -t "$DUR" -movflags +faststart "$TMP" || rc=$?
  rm -rf "$LAYERS"
  [[ $rc -eq 0 ]] || { echo "joining the segments failed (code $rc)" >&2; rm -f "$TMP"; exit $rc; }
else
  # One pass: the whole picture composited at once.
  # CRF 14, not 18, on x264. Kinetic text sits STILL over a
  # background that the camera moves every frame, so the encoder re-codes the
  # glyph/background boundary on every frame; at CRF 18 that boundary carried
  # mosquito noise that reads as pixelated edges (text-region SSIM vs a
  # lossless composite: 0.9964 at CRF 18, 0.9975 at 14).
  # And a review excerpt is
  # CUT WITH -c copy, never re-encoded: the second generation cost as much again.
  # The publish is gated on ffmpeg's EXIT CODE, never on a later `ls`. A disk-full
  # render once left a truncated file behind and the cleanup deleted the good
  # previous version because the guard was testing the wrong thing.
  make_fc 0 "$EDIT_END" 1 > .fc.txt
  draw_layers 0 "$EDIT_END" "${LAYER_LIST[@]}"
  rc=0
  if [[ $MATTE -eq 1 ]]; then
    ffmpeg -hide_banner -v warning -y \
      -i "$SRC" \
      -i "$LAYERS/over.mov" -i "$LAYERS/under.mov" \
      -reinit_filter 0 -framerate ${FPS} -i matte/m%05d.png \
      -i mix.wav \
      -filter_complex_script .fc.txt -map "[v]" -map 4:a \
      "${VENC[@]}" -pix_fmt yuv420p -r ${FPS} "${COLOR[@]}" \
      -c:a aac -b:a 192k -t "$DUR" -movflags +faststart "$TMP" || rc=$?
  else
    ffmpeg -hide_banner -v warning -y \
      -i "$SRC" -i "$LAYERS/over.mov" -i mix.wav \
      -filter_complex_script .fc.txt -map "[v]" -map 2:a \
      "${VENC[@]}" -pix_fmt yuv420p -r ${FPS} "${COLOR[@]}" \
      -c:a aac -b:a 192k -t "$DUR" -movflags +faststart "$TMP" || rc=$?
  fi
  rm -rf "$LAYERS"
  [[ $rc -eq 0 ]] || { echo "render failed (code $rc)" >&2; exit $rc; }
fi

d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP")
python3 -c "import sys; sys.exit(0 if float('$d') > float('$DUR')-1 else 1)" \
  || { echo "truncated render ($d s instead of $DUR); nothing published" >&2; exit 1; }
mv "$TMP" "$OUT"
echo "OK -> $OUT (duration $d)"
