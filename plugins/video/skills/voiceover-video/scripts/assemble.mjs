#!/usr/bin/env node
// The whole video: the dressed intro (its music baked in) → part 1 → the dressed cutback 1 → part 2 → … → the last part
// (its end card). ONE music: the intro's track goes on from where the intro stops it (build/intro.json › music.next),
// laid once under everything after the intro (looped on the track's body with 2 s crossfades), at the intro's own level,
// ducked under the voices by the same sidechain as the intro, faded out over the end card. The real clips' voices are
// brought to the motion parts' level by fixed gains (no per-part loudnorm: it would break the music's continuity). The
// whole is mastered at -14 LUFS, true peak ≤ -2 dBTP: the sound is measured ALONE (-vn: the picture never decoded for it),
// set by one gain and a limiter at -3 dBFS (the AAC encode adds up to 1 dB of intersample peak), measured again and
// corrected; then the picture and the sound are encoded ONCE.
//
//   node assemble.mjs <run-dir>          → workspace/videos/<slug>.mp4 (1080p, H.264 crf 20, AAC 256k: the draft to review)
//                                          + workspace/videos/<slug>-preview.mp4 (720p crf 24: small enough to send in a chat)
//                                          (exports/ holds hard links to both: no second copy on the disk)
//   node assemble.mjs <run-dir> --4k     → workspace/videos/<slug>-4k.mp4 (3840×2160, H.264 High crf 15 slow, AAC 320k), from
//                                          build/4k/ (intro.mjs --4k, render.mjs --part n --4k): only when the user asked
// A long video (look.md § Long videos: chapters; Ihsane, 2026-10-14): run.json › chapters lays the progress marker
//   (build/tracker/chapter-<i>.mov, scripts/tracker.mjs) right after each chapter page with its sounds, a riser into each
//   page; run.json › music.sections changes the music at a chapter (the next one lower, another register); the cut from a
//   face shot into a chapter's page is covered by the yellow torn sheet (build/sweep/, scripts/sweep.mjs), the other cuts
//   stay plain (run.json › junction: "chapters", the default · "sweep-all" · "cut").
// options: --name <file name> (default: the slug; e.g. --name waterfall-final → workspace/videos/waterfall-final.mp4 and
//          waterfall-final-preview.mp4)   --music-loop-from 12 (where the track's body starts, for the loops)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { step } from "../../../motion/progress.mjs";
import { ROOT, profile } from "../../../motion/brand.mjs";
import { loudness, musicPath, sfxPath, alignOf } from "./sound.mjs";

const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const K4 = a.includes("--4k");
const run = JSON.parse(fs.readFileSync(path.join(RUN, "run.json"), "utf8"));
const slug = run.slug || path.basename(RUN);
const NAME = opt("name") || run.assembly?.name || slug;
if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(NAME)) { console.error(`✗ --name: lower case letters, digits and dashes (${NAME})`); process.exit(2); }
const BUILD = path.join(RUN, "build"), SRC = K4 ? path.join(BUILD, "4k") : BUILD;
const FPS = 30, OW = K4 ? 3840 : 1920, OH = K4 ? 2160 : 1080;
const json = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
const ff = (args, what) => { const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 1 << 26 }); if (r.status) throw new Error(`${what}: ${String(r.stderr).slice(-400)}`); return r; };
const dur = f => +String(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }).stdout).trim();
// a picture's length in frames (csv output appends a separator when the stream carries side data: default=nw=1:nk=1)
const vdur = f => { const r = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }); return parseInt(String(r.stdout).trim(), 10) / FPS; };
const pick = (...fs_) => fs_.find(f => fs.existsSync(f)) || null;
const r3 = x => Math.round(x * 1000) / 1000;

try {
  step(RUN, "assemble", "running", `Putting your intro, the motion parts and your cutbacks together${K4 ? " in 4K" : ""}`);
  // ── the sequence: intro → part 1 → cutback 1 → part 2 → … (as long as the files are there) ──────────────
  // the AI voice mode has no filmed clip: the parts follow each other, the music from the video's first frame
  const AI = run.mode === "ai";
  const intro = AI ? null : pick(path.join(SRC, "intro.mov"), path.join(SRC, "intro.mp4"), ...(K4 ? [] : [path.join(RUN, "real", "intro.mp4")]));
  if (!intro && !AI) throw new Error(K4 ? "build/4k/intro.mov is missing: intro.mjs <run> --4k" : "no intro: intro.mjs <run> --render (or cut.mjs for an undressed one)");
  const seq = AI ? [] : [{ kind: "intro", f: intro, j: json(path.join(BUILD, "intro.json")) }];
  for (let n = 1; ; n++) {
    const p = pick(path.join(SRC, `part-${n}.mp4`));
    if (!p) break;
    seq.push({ kind: "part", n, f: p, j: json(path.join(SRC, `part-${n}.json`)) });
    const c = AI ? null : pick(path.join(SRC, `cutback-${n}.mov`), path.join(SRC, `cutback-${n}.mp4`), ...(K4 ? [] : [path.join(RUN, "real", `cutback-${n}.mp4`)]));
    if (c && (run.cut?.cutbacks?.length || 0) >= n) seq.push({ kind: "cutback", n, f: c, j: json(path.join(BUILD, `cutback-${n}.json`)) });
  }
  const nParts = seq.filter(s => s.kind === "part").length;
  if (!nParts) throw new Error(`no motion part: render.mjs <run> --part 1${K4 ? " --4k" : ""}`);
  if (seq.at(-1).kind === "cutback" && (json(path.join(BUILD, "part-" + (nParts) + ".json"))?.out == null)) console.log("⚠ the video ends on a cutback: its last part ends on no clip");
  for (const s of seq) s.d = vdur(s.f);
  const D = seq.map(s => s.d), TOT = D.reduce((x, y) => x + y, 0), D0 = AI ? 0 : D[0], BED = TOT - D0;

  // ── the voices' gains: each real clip brought to the motion parts' level (part 1's mix) ────────────────────
  const target = seq.find(s => s.kind === "part").j?.mix ?? loudness(seq.find(s => s.kind === "part").f).I;
  const voiceOf = s => s.j?.voice ?? null;
  // facecam: the face shots and the parts carry the SAME voice (the take), at its own level: no gain between them (a gain
  // measured on different words made ±2 dB jumps at the cuts)
  for (const s of seq) s.g = run.mode === "facecam" || s.kind === "part" || voiceOf(s) == null ? 0 : +(target - voiceOf(s)).toFixed(1);
  // where each piece starts in the video
  let acc = 0; for (const s of seq) { s.at = acc; acc += s.d; }
  const startOf = (ref) => {
    if (ref.part != null) return seq.find(s => s.kind === "part" && s.n === +ref.part)?.at;
    if (ref.clip) { const m = /^cutback-(\d+)$/.exec(ref.clip); return ref.clip === "intro" ? 0 : seq.find(s => s.kind === "cutback" && s.n === +(m?.[1]))?.at; }
    return null;
  };
  // ── long videos (look.md § Long videos: chapters): the chapters' instants in the video, the marker after each page ──
  const CH = (run.chapters || []).map((c, i) => ({ ...c, i: i + 1, T: (startOf(c) ?? NaN) + +(c.at ?? 0) })).filter(c => Number.isFinite(c.T));
  const HOLD = +(run.tracker?.hold ?? 4.5);
  const TRK = run.tracker?.off ? [] : CH.map(c => ({ ...c, file: path.join(BUILD, "tracker", `chapter-${c.i}.mov`) })).filter(c => fs.existsSync(c.file));
  if (CH.length && !TRK.length && !run.tracker?.off) console.log("⚠ run.json › chapters but no build/tracker/chapter-<i>.mov: node scripts/tracker.mjs <run> first (or tracker.off)");
  // ── the junction between the face and a drawn screen: a PLAIN CUT, except the cut into a chapter's yellow V page, which
  //    the yellow torn sheet covers (Ihsane, 2026-10-14: the sheet on every cut « ça fait trop »); run.json › junction
  //    "sweep-all" puts it on every face ↔ screen cut, "cut" on none ──
  const JN = run.junction || "chapters";
  const sweepDir = path.join(BUILD, "sweep");
  const SWEEP = JN !== "cut" && fs.existsSync(sweepDir) ? fs.readdirSync(sweepDir).filter(f => /^sweep-.*\.mov$/.test(f)).sort() : [];
  // a part that OPENS on its chapter page (the page within its first seconds): the cut into it gets the sheet
  const chapterParts = new Set(CH.filter(c => c.part != null && +(c.at ?? 0) <= +(c.page ?? 2.4) + 0.2).map(c => +c.part));
  const cutsAt = seq.slice(1).map((s, i) => ({ s, prev: seq[i] })).filter(({ s, prev }) => (s.kind === "part") !== (prev.kind === "part"))
    .filter(({ s }) => JN === "sweep-all" || (s.kind === "part" && chapterParts.has(s.n)));
  if (cutsAt.length && !SWEEP.length && JN !== "cut") console.log(`⚠ ${cutsAt.length} cut(s) into a chapter page but no build/sweep/*.mov: node scripts/sweep.mjs <run> (plain cuts meanwhile)`);
  const CUTS = SWEEP.length ? cutsAt.map(({ s }, i) => ({ t: s.at, file: path.join(sweepDir, SWEEP[i % SWEEP.length]) })) : [];
  // ── the music: the intro's track from where it stopped, its body looped (2 s crossfades), at the intro's own level;
  //    run.json › music.sections changes the track at a chapter (look.md § The music of a long video): the old bed fades
  //    out as the chapter page comes in, the new one starts as the page leaves, lower under the voice ──
  const PM = run.music || profile().voiceover?.music || {};
  const M = AI ? null : seq[0].j?.music;
  if (!M && !AI) console.log("⚠ the intro carries no music (build/intro.json): the bed starts from the track's start at -26 dB");
  const music = M?.name || PM.name || "gimme", mfile = musicPath(music);
  const NEXT = M?.next ?? (PM.start ?? (music === "gimme" ? 1.95 : 0)), LOOP = +opt("music-loop-from", 12);
  // the bed's level: the intro's music level once its gain is applied; with no intro, 12 LU under the parts' voice
  const MGB = AI ? +((target - 12) - loudness(mfile).I).toFixed(1) : +(((M?.gain ?? -26) + seq[0].g)).toFixed(1);
  const L0 = loudness(mfile).I;
  const beds = [{ name: music, file: mfile, from: NEXT, gain: MGB, start: D0, fin: AI ? 0.25 : 0 }];
  for (const sec of PM.sections || []) {
    const c = CH.find(x => x.i === +sec.chapter);
    if (!c) { console.log(`⚠ music.sections: no chapter ${sec.chapter} in run.json › chapters`); continue; }
    const f = musicPath(sec.name), lead = +(sec.lead ?? c.page ?? 2.4);
    beds.at(-1).end = c.T - lead + 0.4; beds.at(-1).fout = 0.4;
    // the same loudness as the first bed, then the section's offset (Ihsane: the second music a little lower: -6 dB)
    beds.push({ name: sec.name, file: f, from: +(sec.start ?? 0), gain: +(MGB + (L0 - loudness(f).I) + +(sec.offset ?? -6)).toFixed(1), start: c.T, fin: 0.3 });
  }
  beds.at(-1).end = TOT; beds.at(-1).fout = 2.4;
  const AF = "aresample=48000,aformat=channel_layouts=stereo";
  const IN = [...seq.flatMap(s => ["-i", s.f])];
  const k = seq.length;
  let ii = k;
  // each clip's sound exactly as long as its picture (padded or cut to the frame): the joins stay in sync all along
  let pre = seq.map((s, i) => `[${i}:a]${AF}${s.g ? `,volume=${s.g}dB` : ""},apad,atrim=0:${D[i].toFixed(4)}[a${i}]`).join(";");
  pre += `;${seq.map((_, i) => `[a${i}]`).join("")}concat=n=${k}:v=0:a=1,asplit=2[dry][key]`;
  beds.forEach((b, bi) => {
    const len = b.end - b.start, tl = dur(b.file);
    const pieces = [[b.from, tl - b.from]]; let have = tl - b.from;
    while (have < len + 0.5) { pieces.push([LOOP, tl - LOOP]); have += tl - LOOP - 2; }
    const first = ii;
    for (const [ss] of pieces) { IN.push("-ss", String(ss), "-i", b.file); pre += `;[${ii}:a]${AF}[b${bi}p${ii}]`; ii++; }
    let lst = `b${bi}p${first}`;
    for (let j = 1; j < pieces.length; j++) { pre += `;[${lst}][b${bi}p${first + j}]acrossfade=d=2:c1=tri:c2=tri[b${bi}x${j}]`; lst = `b${bi}x${j}`; }
    pre += `;[${lst}]atrim=0:${len.toFixed(4)},${b.fin ? `afade=t=in:d=${b.fin},` : ""}afade=t=out:st=${(len - b.fout).toFixed(4)}:d=${b.fout},volume=${b.gain}dB,adelay=${Math.round(b.start * 1000)}:all=1[bed${bi}]`;
  });
  pre += `;${beds.map((_, bi) => `[bed${bi}]`).join("")}amix=inputs=${beds.length}:normalize=0:duration=longest[mb]`;
  pre += `;[mb][key]sidechaincompress=threshold=0.03:ratio=2.5:attack=30:release=450:makeup=1[bed]`;
  // the sounds of the marker (in: a click, the mascot's pop; out: a shutter, clicks, a gear) and of the sweeps
  const FX = [];
  for (const c of TRK) FX.push([c.T, "m:ui-click", -16], [c.T + 0.6, "m:normal-pop-2", -18], [c.T + HOLD - 0.02, "m:smooth-camera-shutter", -12], [c.T + HOLD + 0.14, "m:ui-digital-click", -15], [c.T + HOLD + 0.2, "m:soft-gear", -17], [c.T + HOLD + 0.36, "m:ui-digital-click-3", -16]);
  for (const c of CUTS) FX.push([c.t, "m:deep-light-whoosh", -14, "peak"], [c.t + 0.05, "p:mixkit-paper-slide-1530", -19]);
  for (const c of CH) if (c.riser !== false) FX.push([c.T - (c.page ?? 2.4) + 0.5, "m:smooth-riser", -16, "end"]);
  const fxl = FX.map(([t, name, g, al], j) => { const f = sfxPath(name); IN.push("-i", f); const st = Math.max(0, t - (al ? alignOf(f, al) : 0)); return `[${ii++}:a]${AF},adelay=${Math.round(st * 1000)}:all=1,volume=${g}dB[fx${j}]`; });
  if (fxl.length) pre += ";" + fxl.join(";");
  pre += `;[dry][bed]${FX.map((_, j) => `[fx${j}]`).join("")}amix=inputs=${2 + FX.length}:normalize=0:duration=first[mix]`;
  console.log(`${seq.map((s, i) => `${s.kind}${s.n ? ` ${s.n}` : ""} ${D[i].toFixed(2)} s${s.g ? ` (voice ${s.g > 0 ? "+" : ""}${s.g} dB)` : ""}`).join(" → ")} = ${TOT.toFixed(2)} s`);
  console.log(`music: ${beds.map(b => `${b.name} from ${b.start.toFixed(1)} s at ${b.gain} dB`).join(" → ")}, ducked under the voices${CH.length ? ` · ${CH.length} chapters, ${TRK.length} markers` : ""}${CUTS.length ? ` · ${CUTS.length} sweeps` : ""}`);

  // ── the sound alone, then the master: measured, one gain, a limiter at -3 dBFS, measured again, corrected ──────
  const TMP = path.join(BUILD, "assemble"); fs.mkdirSync(TMP, { recursive: true });
  const pre1 = path.join(TMP, "mix.wav"), wav = path.join(TMP, "master.wav");
  ff([...IN, "-filter_complex", pre, "-map", "[mix]", "-vn", "-c:a", "pcm_f32le", pre1], "the mix");
  const m0 = loudness(pre1);
  let gain = -14 - m0.I + 0.4, m = m0;
  for (let i = 0; i < 4; i++) {
    ff(["-i", pre1, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.668:attack=2:release=50:level=false`, "-c:a", "pcm_s16le", wav], "the master");
    m = loudness(wav);
    if (Math.abs(m.I + 14) <= 0.1) break;
    gain += -14 - m.I;
  }
  console.log(`master: the mix ${m0.I.toFixed(1)} LUFS → ${m.I.toFixed(1)} LUFS, true peak ${m.TP.toFixed(1)} dBTP (gain ${gain.toFixed(1)} dB, limiter -3 dBFS)`);

  // ── the picture: every part at the output size, joined, encoded ONCE with the master ───────────────────────────
  // the overlays laid on the joined picture: the sweeps on the cuts (covered on their 10th frame), the markers
  const OV = [...CUTS.map(c => ({ file: c.file, st: c.t - 10 / FPS })), ...TRK.map(c => ({ file: c.file, st: c.T }))];
  let V = seq.map((s, i) => `[${i}:v]scale=${OW}:${OH}${K4 ? ":flags=lanczos" : ""},fps=${FPS},format=yuv420p,setsar=1[v${i}]`).join(";") + ";" + seq.map((_, i) => `[v${i}]`).join("") + `concat=n=${k}:v=1:a=0[c0]`;
  OV.forEach((o, j) => { V += `;[${k + 1 + j}:v]${K4 ? `scale=${OW}:${OH}:flags=lanczos,` : ""}format=yuva444p,setpts=PTS-STARTPTS+${o.st.toFixed(4)}/TB[o${j}];[c${j}][o${j}]overlay=0:0:eof_action=pass:format=auto[c${j + 1}]`; });
  V += `;[c${OV.length}]format=yuv420p[v]`;
  const out = path.join(ROOT, "workspace", "videos", `${NAME}${K4 ? "-4k" : ""}.mp4`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const venc = K4 ? ["-c:v", "libx264", "-profile:v", "high", "-crf", "15", "-preset", "slow", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]
    : ["-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"];
  ff([...seq.flatMap(s => ["-i", s.f]), "-i", wav, ...OV.flatMap(o => ["-i", o.file]), "-filter_complex", V, "-map", "[v]", "-map", `${k}:a`, ...venc, "-c:a", "aac", "-b:a", K4 ? "320k" : "256k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", out], "the picture");
  const L = loudness(out), d = dur(out);
  const links = [out];
  if (!K4) {
    // a 720p preview, small enough to send in a chat (the 1080p file would not open there)
    const prev = path.join(ROOT, "workspace", "videos", `${NAME}-preview.mp4`);
    ff(["-i", out, "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264", "-crf", "24", "-preset", "medium", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", prev], "the preview");
    links.push(prev);
  }
  fs.mkdirSync(path.join(RUN, "exports"), { recursive: true });
  for (const f of links) { const e = path.join(RUN, "exports", path.basename(f)); fs.rmSync(e, { force: true }); try { fs.linkSync(f, e); } catch { fs.copyFileSync(f, e); } }
  fs.rmSync(TMP, { recursive: true, force: true });
  run[K4 ? "assembly4k" : "assembly"] = { at: new Date().toISOString(), name: NAME, out: path.relative(ROOT, out), duration: r3(d), lufs: L.I, tp: L.TP,
    parts: seq.map((s, i) => ({ kind: s.kind, ...(s.n ? { n: s.n } : {}), f: path.relative(RUN, s.f), d: r3(D[i]), gain: s.g })), music: beds.map(b => ({ name: b.name, start: r3(b.start), gain: b.gain })), chapters: CH.map(c => ({ i: c.i, title: c.title, t: r3(c.T) })), sweeps: CUTS.length };
  fs.writeFileSync(path.join(RUN, "run.json"), JSON.stringify(run, null, 2) + "\n");
  step(RUN, "assemble", "done", `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, "0")}${K4 ? " in 4K" : ""}, ${L.I.toFixed(1)} LUFS`);
  console.log(`${d.toFixed(2)} s · ${L.I.toFixed(1)} LUFS · true peak ${L.TP.toFixed(1)} dBTP · ${(fs.statSync(out).size / 1e6).toFixed(0)} MB\n→ ${path.relative(process.cwd(), out)}${links[1] ? `\n→ ${path.relative(process.cwd(), links[1])} (${(fs.statSync(links[1]).size / 1e6).toFixed(0)} MB, to send)` : ""}`);
} catch (e) {
  step(RUN, "assemble", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
