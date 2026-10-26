#!/usr/bin/env node
// Each short, cut out of the long take: its blocks in the order of shorts.json (a moment of the take moved first as the
// hook, the rest in any order), the retakes and fillers left out, the dead air shortened, the whole short at the take's
// speed, the picture graded once (the long video's grade), reframed to 9:16 on the speaker's face, and the lines the take
// does not have said by the user's voice (ElevenLabs: their clone, workspace/motion/profile.json › voiceClone).
//
//   node cut.mjs <run-dir> [--short <n>] [--no-grade] [--pause 0.30] [--gap 0.06]
//   node cut.mjs <project> --one [--speed 1.1]
//
// --one    ONE take, ONE short, edited in place (the Short video editor's Whiteboard style, /video-whiteboard-editor,
//          run.json › one): shorts.json holds a single short (the take in its own order, its retakes dropped), the
//          project IS the edit (no shorts/<n>/), its file is run.json › out (workspace/videos/<slug>.mp4). The same cut,
//          grade, reframe and look as a short of a long video: one place for the look, both stay identical. A vertical
//          take's face is found too: the camera's anchor on the eyes, project.json › headroom (the top of the head, 0–1)
//          tells the plan whether the words fit above it (Dynamic text's place)
//
// shorts.json (written in the judgment step, SKILL.md § 2):
//   { "shorts": [ { "slug": "good-lead", "title": "A good lead is 3 things", "style": "headline",
//                   "blocks": [ { "take": "#22" }, { "vo": "Here is how I check it." }, { "take": "#8-#13" } ],
//                   "drop": [9], "why": "…" } ] }
//   a take block: "#n", "#first-#last" (sentences of take/sentences.json) or "12.4-19.8" (seconds of the take);
//   "words": [from, to] keeps only those words of the span (indexes inside it, 0-based, for a sentence cut in two);
//   a vo block: the line, in the user's words (simple spoken English), said by their voice; never a fact they did not say.
// --pause  a pause inside the kept words longer than this is cut (default 0.30 s: a short breathes less than a video)
// --zoom   how much wider than 9:16 a landscape take is sliced (default 1.25, run.json › zoom): the speaker smaller,
//          the wall prolonged above them
// --gap    the silence put back at each cut (default 0.06 s; with the air kept around each piece, ~0.18 s between two)
// Writes, for each short n (shorts/<n>/, an edit of the vertical engine, scaffolded by init.sh):
//   source/take.mov  1080×1920, 30 fps, the voice in PCM (no AAC delay); words.json (the output clock), shots.json
//   (the jump cuts), blocks.json (what each stretch is: the take or a voice line, and the stretches where the picture
//   is the paper: the plan covers them); the run's vo/<line>/ keeps each voice line (vo.json, voix/prise.wav, words.json)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOT, profile } from "../../../motion/brand.mjs";
import { step } from "../../../motion/progress.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const has = k => a.includes("--" + k);
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const run = readJSON(path.join(RUN, "run.json"), {});
const src = path.resolve(ROOT, run.video || "");
if (!fs.existsSync(src)) { console.error(`✗ the long take is not found: ${run.video}`); process.exit(2); }
const plan = readJSON(path.join(RUN, "shorts.json"));
if (!plan?.shorts?.length) { console.error("✗ shorts.json is missing or empty: pick the shorts first (SKILL.md § 2)"); process.exit(2); }
const ONE = has("one") || run.one === true;
if (ONE && plan.shorts.length !== 1) { console.error(`✗ --one: shorts.json must hold exactly one short (it has ${plan.shorts.length})`); process.exit(2); }
const sentences = readJSON(path.join(RUN, "take", "sentences.json")), words = readJSON(path.join(RUN, "take", "words.json"));
if (!sentences || !words) { console.error("✗ take/ is empty: listen.mjs first"); process.exit(2); }
const STYLES = readJSON(path.join(HERE, "..", "styles.json"));
const FPS = 30, OW = 1080, OH = 1920;
const SPEED = +(opt("speed") ?? run.speed ?? profile().voiceover?.introSpeed ?? 1.1);
const ZOOM = Math.max(1, +(opt("zoom") ?? run.zoom ?? 1.25));
const PAUSE = +opt("pause", 0.30), GAP = +opt("gap", 0.06), PRE = 0.04, POST = 0.08;
const FILLER = /^(uh|um|uhm|erm|euh|hum|eh)[,.!?…]*$/i;
const r3 = x => Math.round(x * 1000) / 1000;
const sh = (cmd, args, o = {}) => { const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...o }); if (r.status) throw new Error(`${cmd}: ${String(r.stderr || "").slice(-400)}`); return r.stdout; };
const probe = JSON.parse(sh("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,color_transfer:stream_side_data=rotation", "-of", "json", src])).streams[0];
const rot = Math.abs(Number(probe.side_data_list?.find(d => d.rotation != null)?.rotation || 0)) % 180 === 90;
const SW = rot ? probe.height : probe.width, SH = rot ? probe.width : probe.height;
const VERTICAL = SW / SH < 0.7;

// ── the HLG tone map (a phone take): the YouTube editor's, so a short and its video look the same ──────────────
let TONE = "";
if (/arib-std-b67/.test(probe.color_transfer || "")) {
  const lut = path.join(RUN, "take", "hlg2709.cube");
  if (!fs.existsSync(lut)) sh(process.execPath, [path.join(HERE, "..", "..", "voiceover-video", "scripts", "hdr-lut.mjs"), "--out", lut]);
  TONE = `format=rgb48le,lut3d=file='${lut}':interp=tetrahedral,format=yuv420p,`;
}
// ── the grade: the long video's (the colour grade's engine on a stretch of the take), once for every short ───────
const LUT = path.join(RUN, "take", "grade.cube");
const graded = !has("no-grade");
if (graded && !fs.existsSync(LUT)) {
  console.log("the grade: measured on 12 s of the take…");
  const ex = path.join(RUN, "take", "excerpt.mp4"), out = path.join(RUN, "take", "excerpt-graded.mp4");
  const mid = Math.max(0, (words.at(-1)?.e ?? 60) / 2 - 6);
  sh("ffmpeg", ["-v", "error", "-y", "-ss", String(mid), "-t", "12", "-i", src, "-vf", `${TONE}scale=-2:1080:flags=lanczos,format=yuv420p`, "-an", "-c:v", "libx264", "-crf", "14", "-preset", "fast",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", ex]);
  const g = spawnSync(process.execPath, [path.join(HERE, "..", "..", "voiceover-video", "scripts", "grade.mjs"), ex, "--out", out], { encoding: "utf8" });
  if (g.status || !fs.existsSync(out + ".cube")) console.log(`⚠ the grade could not be made (${String(g.stderr).trim().split("\n").at(-1)}): the shorts keep the take's colours`);
  else { fs.copyFileSync(out + ".cube", LUT); console.log(`grade → take/grade.cube (${(readJSON(out + ".grade.json", {}).summary || "measured on the excerpt").toString().slice(0, 120)})`); }
  fs.rmSync(ex, { force: true }); fs.rmSync(out, { force: true });
}
const GRADE = graded && fs.existsSync(LUT) ? `scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=gbrp16le,lut3d=file='${LUT}':interp=tetrahedral,scale=out_color_matrix=bt709:out_range=tv,` : "";

// ── where the face is in the take (Apple Vision, the scrapbook's tool), at a few instants ─────────────────────
const FACE_BIN = path.join(HERE, "..", "..", "scrapbook-editor", "scripts", "native", "face");
function faceAt(times, tmp) {
  if (!fs.existsSync(FACE_BIN)) {
    const s = spawnSync("swiftc", ["-O", "-o", FACE_BIN, FACE_BIN + ".swift"], { stdio: "inherit" });
    if (s.status) return null;
  }
  fs.mkdirSync(tmp, { recursive: true });
  const files = times.map((t, i) => { const f = path.join(tmp, `f${i}.jpg`); spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(2), "-i", src, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "4", f]); return f; }).filter(f => fs.existsSync(f));
  fs.writeFileSync(path.join(tmp, "list.txt"), files.join("\n"));
  const out = spawnSync(FACE_BIN, ["--list", path.join(tmp, "list.txt")], { encoding: "utf8" }).stdout || "";
  fs.rmSync(tmp, { recursive: true, force: true });
  const got = out.split("\n").filter(Boolean).map(l => JSON.parse(l)).filter(o => !o.none);
  if (!got.length) return null;
  const med = k => got.map(o => o[k]).sort((x, y) => x - y)[got.length >> 1];
  return { x: med("x") + med("w") / 2, y: med("y") + med("h") / 2, w: med("w"), h: med("h"), n: got.length, of: files.length };
}

// ── the voice of a line: the user's clone (or the voice the run names), one take, trimmed to its words ─────────
async function voLine(dir, text) {
  const spec = path.join(dir, "vo.json"), clone = profile().voiceClone || null;
  const voice = run.voice?.id || clone?.id;
  if (!voice) throw new Error("a voice line needs a voice: clone the user's voice first (voiceover-video/scripts/clone.mjs) or leave the line out");
  const prefix = run.voice?.prefix ?? clone?.prefix ?? "";
  const want = { voice, voice_name: run.voice?.name || clone?.name || "your voice", model: clone?.model || "eleven_v4", stability: clone?.stability ?? 0.5,
    similarity: clone?.similarity ?? 0.85, seed: 7, language: run.language || "en", text: prefix + text, say: {} };
  const had = readJSON(spec);
  fs.mkdirSync(dir, { recursive: true });
  if (!had || had.text !== want.text || had.voice !== want.voice || !fs.existsSync(path.join(dir, "voix", "prise.wav")) || !fs.existsSync(path.join(dir, "words.json"))) {
    fs.writeFileSync(spec, JSON.stringify(want, null, 1) + "\n");
    const { take } = await import("../../../motion/voice.mjs");
    console.log(`voice line: « ${text} »`);
    await take(spec);
  }
  const ws = readJSON(path.join(dir, "words.json"), []);
  return { wav: path.join(dir, "voix", "prise.wav"), words: ws };
}
const loud = f => { const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-vn", "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }); const m = /I:\s+(-?[\d.]+) LUFS/.exec(String(r.stderr).split("Summary:").pop() || ""); return m ? +m[1] : null; };

// ── a take block → its words and pieces ───────────────────────────────────────────────────────────────────────
function takeBlock(b, drop) {
  let ws;
  let m;
  if ((m = /^#(\d+)(?:-#?(\d+))?$/.exec(b.take))) {
    const i0 = +m[1], i1 = +(m[2] ?? m[1]);
    if (!sentences[i1]) throw new Error(`no sentence ${b.take} in take/sentences.json`);
    const kept = sentences.filter(x => x.i >= i0 && x.i <= i1 && !drop.has(x.i));
    ws = kept.flatMap(x => words.filter(w => w.s >= x.s - 0.001 && w.e <= x.e + 0.001));
  } else if ((m = /^([\d.]+)-([\d.]+)$/.exec(b.take))) ws = words.filter(w => w.s >= +m[1] - 0.001 && w.e <= +m[2] + 0.001);
  else throw new Error(`a take block is "#n", "#a-#b" or "from-to" seconds (not ${b.take})`);
  if (b.words) ws = ws.slice(b.words[0], b.words[1] + 1);
  if (!ws.length) throw new Error(`block ${b.take}: no word kept`);
  const pieces = [];
  let cut = true;
  for (const w of ws) {
    if (FILLER.test(w.w)) { cut = true; continue; }
    const p = pieces.at(-1);
    if (p && !cut && w.s - p.e <= PAUSE) { p.e = w.e; p.w.push(w); } else pieces.push({ s: w.s, e: w.e, w: [w] });
    cut = false;
  }
  return pieces.map(p => {
    const iFirst = words.indexOf(p.w[0]), iLast = words.indexOf(p.w.at(-1));
    const prevEnd = words[iFirst - 1]?.e ?? 0, nextStart = words[iLast + 1]?.s ?? p.e + 1;
    const s0 = Math.max(0, p.s - PRE, (prevEnd + p.s) / 2), s1 = Math.min(p.e + POST, (p.e + nextStart) / 2);
    return { kind: "take", s0, s1, words: p.w };
  });
}

const which = opt("short") ? [+opt("short")] : plan.shorts.map((_, i) => i + 1);
const summary = [];
// a voice line needs an AI voice: an ElevenLabs key and a voice (the user's clone). Without them, the shorts are made of
// the take's real lines only (Ihsane, 2026-10-15: ElevenLabs only for those who want an AI voice): said before anything
const { key: elKey } = await import("../../../motion/voice.mjs");
const voWanted = which.flatMap(n => (plan.shorts[n - 1]?.blocks || []).filter(b => b.vo).map(b => `short ${n}: « ${b.vo} »`));
if (voWanted.length && !(elKey() && (run.voice?.id || profile().voiceClone?.id))) {
  console.error(`✗ ${voWanted.length} voice line${voWanted.length > 1 ? "s" : ""} in shorts.json, but ${elKey() ? "no voice to say them (clone the user's voice first: voiceover-video/scripts/clone.mjs)" : "no ElevenLabs key (ELEVENLABS_API_KEY)"}:\n  ${voWanted.join("\n  ")}\nBuild these shorts from the take's real lines only (a hook and a bridge the user said), and tell the user why.`);
  process.exit(2);
}
try {
  step(RUN, "cut", "running", `Cutting ${which.length} short${which.length > 1 ? "s" : ""}`);
  const takeI = loud(path.join(RUN, "take", "audio.mp3")) ?? -20;
  for (const n of which) {
    const S = plan.shorts[n - 1];
    if (!S) throw new Error(`no short ${n} in shorts.json`);
    const style = S.style || run.style || STYLES.default;
    const LAY = STYLES.styles[style]?.layout || "full";
    const D = ONE ? RUN : path.join(RUN, "shorts", String(n));
    fs.mkdirSync(path.join(D, "source"), { recursive: true });
    const drop = new Set((S.drop || []).map(Number));
    // the pieces, in the short's order
    const pieces = [];
    let k = 0;
    for (const b of S.blocks) {
      if (b.take) pieces.push(...takeBlock(b, drop).map(p => ({ ...p, block: b.take })));
      else if (b.vo) {
        // one take per line for the whole run (the same line in two shorts is said, and paid, once)
        const key = b.vo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + [...b.vo].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
        const line = await voLine(path.join(RUN, "vo", key), b.vo); k++;
        const ws = line.words.filter(w => w.w && !/^\[.*\]$/.test(w.w));
        if (!ws.length) throw new Error(`the voice line « ${b.vo} » came back empty`);
        pieces.push({ kind: "vo", wav: line.wav, s0: Math.max(0, ws[0].s - 0.04), s1: ws.at(-1).e + 0.10, words: ws, text: b.vo, gain: r3(takeI - (loud(line.wav) ?? takeI)) });
      } else throw new Error(`short ${n}: a block is { take } or { vo }`);
    }
    // whole frames: each piece lasts an exact number of output frames, its sound cut to the same length
    for (const p of pieces) { const N = Math.max(1, Math.round((p.s1 - p.s0) / SPEED * FPS)); p.n = N; p.s1 = p.s0 + N / FPS * SPEED; }
    // the face, over this short's take pieces
    const tp = pieces.filter(p => p.kind === "take");
    const face = VERTICAL && !ONE ? null : faceAt(tp.flatMap(p => [p.s0 + 0.3, (p.s0 + p.s1) / 2]).slice(0, 24), path.join(D, "tmp", "face"));
    const fx = face?.x ?? 0.5, fy = face?.y ?? 0.35;
    let crop, pw = OW, ph = OH, wall = 0;
    if (LAY === "split") {
      const { SPLIT } = await import("./doc.mjs");
      pw = Math.round(SPLIT.w * OW / 2) * 2; ph = Math.round(SPLIT.h * OH / 2) * 2;
      const ar = pw / ph;
      let ch = VERTICAL ? Math.round(SW / ar) : Math.round(SH * 0.62), cw = Math.round(ch * ar);
      if (cw > SW) { cw = SW; ch = Math.round(cw / ar); }
      const x0 = Math.round(Math.min(SW - cw, Math.max(0, fx * SW - cw / 2))), y0 = Math.round(Math.min(SH - ch, Math.max(0, fy * SH - ch * 0.40)));
      crop = `crop=${cw - cw % 2}:${ch - ch % 2}:${x0}:${y0},`;
    } else if (VERTICAL) crop = "";
    else {
      // ZOOM (Ihsane, 2026-10-14: « on est très zoomé sur ma tête »): a slice of the take wider than 9:16 (×1.25 by
      // default), the speaker at the bottom of the frame, the wall above them prolonged (its top rows stretched and
      // softened, a 90 px fade into the picture): no blurred copy of the head, no seam
      const cw = Math.round(Math.min(SW, SH * 9 / 16 * ZOOM) / 2) * 2;
      const x0 = Math.round(Math.min(SW - cw, Math.max(0, fx * SW - cw / 2)));
      crop = `crop=${cw}:${SH}:${x0}:0,`;
      if (ZOOM > 1.001) { ph = Math.round(OW * SH / cw / 2) * 2; wall = OH - ph; }
    }
    const scale = `scale=${pw}:${ph}:force_original_aspect_ratio=increase:flags=lanczos,crop=${pw}:${ph},`;
    // the paper under a voice line (and the desk of the split layout)
    const desk = path.join(D, "source", "desk.png"), deskP = path.join(D, "source", "desk-print.png");
    if (!fs.existsSync(desk) || (LAY === "split" && !fs.existsSync(deskP))) {
      const r = spawnSync(process.execPath, ["-e", `const d=await import(${JSON.stringify(path.join(HERE, "doc.mjs"))});d.deskPng(${JSON.stringify(desk)});d.deskPng(${JSON.stringify(deskP)},{print:true});`, "--input-type=module"], { encoding: "utf8", cwd: D });
      if (r.status) throw new Error(`the paper could not be drawn: ${r.stderr}`);
    }
    // ffmpeg: one input per piece (a fast seek), each made to its frames and samples, then joined
    const args = ["-v", "error", "-y"], filt = [];
    let idx = 0;
    const deskIdx = () => { args.push("-loop", "1", "-framerate", String(FPS), "-i", desk); return idx++; };
    pieces.forEach((p, i) => {
      const N = p.n, smp = Math.round(N / FPS * 48000);
      if (p.kind === "take") {
        args.push("-ss", p.s0.toFixed(3), "-t", (p.s1 - p.s0 + 0.2).toFixed(3), "-i", src);
        const j = idx++;
        filt.push(`[${j}:v]${TONE}${crop}${scale}${GRADE}setpts=(PTS-STARTPTS)/${SPEED},fps=${FPS},trim=end_frame=${N},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[v${i}]`);
        filt.push(`[${j}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${(p.s1 - p.s0).toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=0.006,afade=t=out:st=${(p.s1 - p.s0 - 0.006).toFixed(4)}:d=0.006,atempo=${SPEED},apad,atrim=end_sample=${smp}[a${i}]`);
      } else {
        const j = deskIdx();
        args.push("-i", p.wav); const ja = idx++;
        filt.push(`[${j}:v]scale=${pw}:${ph},${LAY === "split" ? "" : ""}fps=${FPS},trim=end_frame=${N},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[v${i}]`);
        filt.push(`[${ja}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=${p.s0.toFixed(4)}:${p.s1.toFixed(4)},asetpts=PTS-STARTPTS,afade=t=in:d=0.006,afade=t=out:st=${(p.s1 - p.s0 - 0.006).toFixed(4)}:d=0.006,atempo=${SPEED},volume=${p.gain}dB,apad,atrim=end_sample=${smp}[a${i}]`);
      }
    });
    // a voice line in the split layout fills the print with paper: the picture under it is the desk alone
    filt.push(`${pieces.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${pieces.length}:v=1:a=1[cv][ca]`);
    // the output clock: each piece's start
    let t = 0;
    const outW = [], blocks = [];
    for (const p of pieces) {
      const d = p.n / FPS;
      for (const w of p.words) outW.push({ w: w.w, s: r3(t + (w.s - p.s0) / SPEED), e: r3(Math.min(t + d, t + (w.e - p.s0) / SPEED)), ...(p.kind === "vo" ? { vo: true } : {}) });
      blocks.push({ kind: p.kind, from: r3(t), to: r3(t + d), ...(p.kind === "take" ? { take: p.block, src: [r3(p.s0), r3(p.s1)] } : { text: p.text, gain: p.gain }) });
      p.t = t; t += d;
    }
    const DUR = t;
    let vmap = "[cv]";
    if (wall > 0) {
      // the wall prolonged over the top of the frame, the picture faded into it on its first 90 px
      const ramp = path.join(D, "source", `ramp-${ph}.png`);
      if (!fs.existsSync(ramp)) sh("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=white:s=${OW}x${ph},format=gray,geq=lum='255*min(1\\,Y/90)'`, "-frames:v", "1", ramp]);
      args.push("-loop", "1", "-framerate", String(FPS), "-i", ramp); const jr = idx++;
      filt.push(`[cv]split[cw1][cw2]`);
      filt.push(`[cw1]crop=${OW}:40:0:0,scale=${OW}:${OH},setsar=1,gblur=sigma=8,format=yuv420p[wall]`);
      filt.push(`[${jr}:v]format=gray,fps=${FPS},trim=end_frame=${Math.round(DUR * FPS)},setpts=PTS-STARTPTS[rmp]`);
      filt.push(`[cw2][rmp]alphamerge[fga]`);
      filt.push(`[wall][fga]overlay=0:${wall}:shortest=1,format=yuv420p,setsar=1[zz]`);
      vmap = "[zz]";
    }
    if (LAY === "split") {
      const { SPLIT } = await import("./doc.mjs");
      args.push("-loop", "1", "-framerate", String(FPS), "-i", deskP); const jp = idx++;
      args.push("-loop", "1", "-framerate", String(FPS), "-i", desk); const jd = idx++;
      const vo = pieces.filter(p => p.kind === "vo").map(p => `between(t,${p.t.toFixed(3)},${(p.t + p.n / FPS - 0.001).toFixed(3)})`);
      filt.push(`[${jp}:v]fps=${FPS},trim=end_frame=${Math.round(DUR * FPS)},setpts=PTS-STARTPTS,format=yuv420p[dp]`);
      filt.push(`[dp][cv]overlay=${Math.round(SPLIT.x * OW)}:${Math.round(SPLIT.y * OH)}:shortest=1[sp]`);
      if (vo.length) { filt.push(`[${jd}:v]fps=${FPS},trim=end_frame=${Math.round(DUR * FPS)},setpts=PTS-STARTPTS,format=yuv420p[dd]`); filt.push(`[sp][dd]overlay=0:0:enable='${vo.join("+")}'[vv]`); vmap = "[vv]"; }
      else vmap = "[sp]";
    }
    // one take edited in place: its cut beside the user's file in source/, under a name of its own (never over it)
    const OUT = path.join(D, "source", ONE ? "take-cut.mov" : "take.mov");
    console.log(`short ${n} « ${S.title || S.slug} »: ${pieces.length} pieces (${pieces.filter(p => p.kind === "vo").length} voice line${pieces.filter(p => p.kind === "vo").length === 1 ? "" : "s"}), ${DUR.toFixed(1)} s · ${LAY}${face ? ` · face at x ${fx.toFixed(2)} (${face.n}/${face.of} frames)` : VERTICAL ? " · vertical take" : " · no face found: centred"}`);
    sh("ffmpeg", [...args, "-filter_complex", filt.join(";"), "-map", vmap, "-map", "[ca]", "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p", "-aspect", "9:16",
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-c:a", "pcm_s16le", "-ar", "48000", "-r", String(FPS), OUT]);
    const got = +sh("ffprobe", ["-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "default=nw=1:nk=1", OUT]).trim();
    if (Math.abs(got - Math.round(DUR * FPS)) > 1) throw new Error(`short ${n}: ${got} frames written, ${Math.round(DUR * FPS)} planned`);
    fs.writeFileSync(path.join(D, "words.json"), JSON.stringify(outW, null, 0).replace(/},{/g, "},\n{") + "\n");
    const joins = pieces.slice(1).map(p => r3(p.t));
    fs.writeFileSync(path.join(D, "shots.json"), JSON.stringify({ shots: pieces.map(p => [r3(p.t), r3(p.t + p.n / FPS)]), joins }, null, 1) + "\n");
    fs.writeFileSync(path.join(D, "blocks.json"), JSON.stringify({ title: S.title || "", style, layout: LAY, speed: SPEED, duration: r3(DUR), face: face ? { x: r3(fx), y: r3(fy) } : null,
      paper: blocks.filter(b => b.kind === "vo").map(b => [b.from, b.to]), blocks }, null, 1) + "\n");
    // the edit: the vertical engine's project, in the style's figures (init.sh leaves what is there)
    const outFile = ONE ? path.resolve(ROOT, run.out || `workspace/videos/${run.slug}.mp4`) : path.join(ROOT, "workspace", "videos", `${run.slug}-${n}${S.slug ? "-" + S.slug : ""}.mp4`);
    const init = spawnSync("zsh", [path.join(HERE, "init.sh"), D, OUT, outFile, style], { encoding: "utf8" });
    if (init.status) throw new Error(`short ${n}: the edit could not be set up: ${String(init.stderr || init.stdout).slice(-500)}`);
    const P = readJSON(path.join(D, "project.json"));
    // the camera's anchor on the eyes, where the zoom put them
    if (face && LAY !== "split") P.anchorY = r3((wall + (fy - face.h * 0.15) * ph) / OH);
    Object.assign(P, { speed: 1, duration: r3(DUR), title: S.title || "", shortsLayout: LAY, zoom: wall ? ZOOM : 1, paper: blocks.filter(b => b.kind === "vo").map(b => [b.from, b.to]) });
    // a vertical take kept whole: where the top of the head is (the face box less ~0.85 of its height for the hair)
    if (VERTICAL && face) P.headroom = r3(Math.max(0, fy - face.h * 0.85));
    fs.writeFileSync(path.join(D, "project.json"), JSON.stringify(P, null, 2) + "\n");
    summary.push({ n, slug: S.slug, title: S.title, dur: r3(DUR), style, vo: pieces.filter(p => p.kind === "vo").length, out: path.relative(ROOT, outFile) });
  }
  // the run's README: the shorts (one take edited in place has no list of shorts)
  const rm = path.join(RUN, ONE ? ".no-readme" : "README.md");
  const table = `## The shorts\n\n| # | Title | Length | Style | Voice lines | File |\n|---|---|---|---|---|---|\n${plan.shorts.map((S, i) => { const s = summary.find(x => x.n === i + 1) || readJSON(path.join(RUN, "shorts", String(i + 1), "blocks.json")) || {}; return `| ${i + 1} | ${S.title || S.slug} | ${s.dur ?? s.duration ?? "?"} s | ${STYLES.styles[S.style || run.style || STYLES.default]?.name} | ${s.vo ?? (s.blocks || []).filter(b => b.kind === "vo").length} | \`workspace/videos/${run.slug}-${i + 1}${S.slug ? "-" + S.slug : ""}.mp4\` |`; }).join("\n")}\n`;
  let text = fs.existsSync(rm) ? fs.readFileSync(rm, "utf8") : "";
  text = /## The shorts\n[\s\S]*?(?=\n## |$)/.test(text) ? text.replace(/## The shorts\n[\s\S]*?(?=\n## |$)/, table) : text + "\n" + table;
  if (!ONE) fs.writeFileSync(rm, text);
  step(RUN, "cut", "done", summary.map(s => `${s.dur.toFixed(0)} s`).join(", "));
  console.log(ONE ? `→ the edit is this project: its face, its music, its matte, then plan.mjs (whiteboard-editor/SKILL.md § 5)` : `→ each short is an edit in shorts/<n>/: its face, its matte, then plan.mjs (SKILL.md § 4)`);
} catch (e) {
  step(RUN, "cut", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
