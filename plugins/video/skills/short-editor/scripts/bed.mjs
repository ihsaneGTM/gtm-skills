#!/usr/bin/env node
// THE MUSIC BED, from a track of the shelf (or of the user): assets/music.wav, ready for edl.mjs.
// What every edit did by hand with ffmpeg, the same way each time (audio-spec.md, "A music bed").
//
//   node bed.mjs --map <track>                     the track's shape, measured once and kept
//   node bed.mjs --track <track> [--from s | --align s@t[,s2@t2]] [--muffle a[-b]] [--drops a-b,…]
//                [--end house|cut] [--under 15] [--level auto]
//
// From the working directory. <track>: a file of plugins/video/assets/music/ (its name is enough),
// or a path. The output lasts the edit (project.json duration), 48 kHz 16-bit stereo:
//   --from s        where the track starts (its seconds) at the video's 0. Default: its first note
//   --align s@t     the track's second s lands on the video's second t (a downbeat on the hook's word,
//                   a drop on the payoff). A second pair stretches the track to land both, 1 % at
//                   most (atempo keeps the pitch)
//   --muffle a[-b]  from the video's second a (to b): the bed heard through a wall, 650 Hz low-pass
//                   ×2 at 0.45, 20 ms crossfades (under a phone call, after the cut into a call)
//   --drops a-b,…   silent from a to b (50 ms out, 30 ms in): the breather that lands a point
//   --end house     (default) a stepped low-pass sweep 16 kHz → 500 Hz and an exponential fade
//                   over the last 1.6 s: it disappears INTO the cut. --end cut: 30 ms out
//   --under 15      LU under the voice the level aims at (the vertical short's 15; the call's 17)
//   --level auto    sets project.json bedDb again from the measured levels (it is set when absent)
// Then project.json bed = music.wav, bedDb, musicTrack, musicFrom, musicTempo, musicDrops, musicMuffle.
// The level is arithmetic: measure.mjs gives it as heard, the verdict.
//
// The map (--map): loudness every half second, the low band (kick, bass) and the high band, the
// tempo and the beat grid fitted on the kicks, the sections and the drops, the first note. Kept in
// ~/Library/Caches/gtm-by-pipecorn/music/ (by the file's size and date): a track is measured once.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const arg = (k, d = null) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const SHELF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../assets/music");
const resolveTrack = t => {
  if (!t) return null;
  for (const p of [t, path.join(SHELF, t), path.join(SHELF, `${t}.mp3`), path.resolve("assets", t)]) if (fs.existsSync(p) && fs.statSync(p).isFile()) return path.resolve(p);
  const near = fs.existsSync(SHELF) ? fs.readdirSync(SHELF).filter(f => f.toLowerCase().includes(String(t).toLowerCase())) : [];
  return near.length === 1 ? path.join(SHELF, near[0]) : null;
};
const ff = (args, opts = {}) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 30, ...opts });
const lufsOf = (file, filter = "") => {
  const r = ff(["-i", file, "-af", `${filter}${filter ? "," : ""}ebur128`, "-f", "null", "-"]);
  const x = (((r.stderr || "") + (r.stdout || "")).split("Summary:").pop() || "").match(/^\s*I:\s*(-?[\d.]+)/m);
  return x ? parseFloat(x[1]) : NaN;
};
const fmt = (x, d = 2) => Number(x).toFixed(d);

// ── the map ────────────────────────────────────────────────────────────────────────────────────
function measureTrack(file) {
  const SR = 24000;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(String(r.stderr));
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length >> 2), n = x.length;
  // bands: two one-pole low-passes at 120 Hz (kick, bass); what is left over 4 kHz (hats)
  const lo = new Float32Array(n), hi = new Float32Array(n);
  { const a = Math.exp(-2 * Math.PI * 120 / SR); let y1 = 0, y2 = 0; for (let i = 0; i < n; i++) { y1 = (1 - a) * x[i] + a * y1; y2 = (1 - a) * y1 + a * y2; lo[i] = y2; } }
  { const a = Math.exp(-2 * Math.PI * 4000 / SR); let y = 0; for (let i = 0; i < n; i++) { y = (1 - a) * x[i] + a * y; hi[i] = x[i] - y; } }
  const db = (arr, a, b) => { let e = 0; for (let i = a; i < b; i++) e += arr[i] * arr[i]; return 10 * Math.log10(e / Math.max(1, b - a) + 1e-12); };
  const H = SR / 2, half = [];
  for (let s = 0; s + H <= n; s += H) half.push({ t: s / SR, all: db(x, s, s + H), low: db(lo, s, s + H), high: db(hi, s, s + H) });
  // the first note: the first 10 ms over -45 dB
  const h10 = SR / 100;
  let first = 0; for (let s = 0; s + h10 <= n; s += h10) if (db(x, s, s + h10) > -45) { first = s / SR; break; }
  // the tempo: onset strength (rise of a 10 ms envelope), autocorrelated between 70 and 180 bpm
  const m = Math.floor(n / h10), env = new Float32Array(m), envLo = new Float32Array(m);
  for (let k = 0; k < m; k++) { env[k] = db(x, k * h10, (k + 1) * h10); envLo[k] = db(lo, k * h10, (k + 1) * h10); }
  const flux = new Float32Array(m); for (let k = 1; k < m; k++) flux[k] = Math.max(0, env[k] - env[k - 1]);
  let bestLag = 0, best = -1;
  for (let lag = Math.round(6000 / 180); lag <= Math.round(6000 / 70); lag++) {
    let s = 0; for (let k = lag; k < m; k++) s += flux[k] * flux[k - lag];
    if (s > best) { best = s; bestLag = lag; }
  }
  // the kicks: a rise of 6 dB over 40 ms in the low band, 150 ms apart at least
  const kicks = [];
  for (let k = 4; k < m - 1; k++) {
    const rise = envLo[k] - envLo[k - 4];
    if (rise > 6 && rise >= envLo[k + 1] - envLo[k - 3] && envLo[k] > -45 && (!kicks.length || k - kicks.at(-1) > 15)) kicks.push(k);
  }
  // the grid: the period around the autocorrelation's and the phase that put the most kicks within
  // 15 ms of a beat
  const P0 = bestLag / 100;
  let grid = { P: P0, ph: 0, hit: 0 };
  for (let P = P0 * 0.97; P <= P0 * 1.03; P += 0.0002) {
    for (let ph = 0; ph < P; ph += 0.0025) {
      let hit = 0;
      for (const k of kicks) { const d = ((k / 100 - ph) % P + P) % P; if (Math.min(d, P - d) < 0.015) hit++; }
      if (hit > grid.hit) grid = { P, ph, hit };
    }
  }
  // sections: the half-second loudness and low band smoothed over 2 s; a new section where either
  // moves by 5 dB from the running section and stays there for 2 s; its start on the nearest beat
  const sm = (key, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 2); j <= Math.min(half.length - 1, i + 1); j++) { s += half[j][key]; c++; } return s / c; };
  const S = [{ i: 0 }];
  let refA = sm("all", 0), refL = sm("low", 0), cnt = 0;
  for (let i = 1; i < half.length; i++) {
    const dA = sm("all", i) - refA, dL = sm("low", i) - refL;
    if (Math.abs(dA) > 5 || Math.abs(dL) > 5) { if (++cnt >= 4) { S.push({ i: i - 3 }); refA = sm("all", i); refL = sm("low", i); cnt = 0; } }
    else { cnt = 0; refA = refA * 0.9 + sm("all", i) * 0.1; refL = refL * 0.9 + sm("low", i) * 0.1; }
  }
  const snap = t => { if (!grid.hit) return t; const k = Math.round((t - grid.ph) / grid.P); return Math.max(0, grid.ph + k * grid.P); };
  const dur = n / SR;
  const sections = S.map((s, j) => {
    const a = j ? snap(s.i * 0.5) : 0, b = j + 1 < S.length ? snap(S[j + 1].i * 0.5) : dur;
    const sl = half.filter(h => h.t >= a && h.t < b);
    const mean = key => sl.length ? sl.reduce((q, h) => q + h[key], 0) / sl.length : -120;
    return { from: +a.toFixed(3), to: +b.toFixed(3), all: +mean("all").toFixed(1), low: +mean("low").toFixed(1), high: +mean("high").toFixed(1) };
  }).filter(s => s.to - s.from > 0.4);
  // the tail of a fade is one quiet section, not five
  for (let j = sections.length - 1; j > 0; j--) if (sections[j].all < Math.max(...sections.map(s => s.all)) - 12 && sections[j - 1].all < Math.max(...sections.map(s => s.all)) - 12) {
    const a = sections[j - 1], b = sections[j], wa = a.to - a.from, wb = b.to - b.from;
    for (const k of ["all", "low", "high"]) a[k] = +((a[k] * wa + b[k] * wb) / (wa + wb)).toFixed(1);
    a.to = b.to; sections.splice(j, 1);
  }
  const top = Math.max(...sections.map(s => s.all));
  for (const [j, s] of sections.entries()) {
    s.kind = s.all < top - 12 ? "quiet" : s.all < top - 5 ? "light" : "full";
    if (j && s.low - sections[j - 1].low > 6 && s.kind === "full") s.drop = true;
  }
  return {
    file: path.basename(file), duration: +dur.toFixed(3), lufs: +lufsOf(file).toFixed(1), firstNote: +first.toFixed(3),
    bpm: +(60 / grid.P).toFixed(2), beat: +grid.P.toFixed(5), phase: +grid.ph.toFixed(4), onGrid: `${grid.hit}/${kicks.length}`,
    sections, half: half.map(h => [+h.t.toFixed(1), +h.all.toFixed(1), +h.low.toFixed(1), +h.high.toFixed(1)]),
  };
}
function mapOf(file) {
  const st = fs.statSync(file);
  const dir = path.join(os.homedir(), "Library", "Caches", "gtm-by-pipecorn", "music");
  const key = crypto.createHash("md5").update(`${path.basename(file)}|${st.size}|${st.mtimeMs}|v2`).digest("hex");
  const f = path.join(dir, `${key}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const map = measureTrack(file);
  try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, JSON.stringify(map)); } catch {}
  return map;
}

if (argv.includes("--map")) {
  const file = resolveTrack(arg("--map"));
  if (!file) { console.error(`track not found: ${arg("--map")} (a file of ${SHELF}, or a path)`); process.exit(1); }
  const M = mapOf(file);
  console.log(`${M.file} · ${Math.floor(M.duration / 60)}:${String(Math.round(M.duration % 60)).padStart(2, "0")} · ${M.lufs} LUFS · first note ${M.firstNote} s`);
  console.log(`tempo ${M.bpm} bpm · a beat ${M.beat} s · beats at ${M.phase} + k × ${M.beat} s (${M.onGrid} kicks on the grid)`);
  console.log(`sections (track seconds · level · bass · highs, dB):`);
  for (const s of M.sections) console.log(`  ${fmt(s.from, 1).padStart(6)}-${fmt(s.to, 1).padEnd(6)} ${s.kind.padEnd(6)} ${String(s.all).padStart(6)} ${String(s.low).padStart(6)} ${String(s.high).padStart(6)}${s.drop ? "   ← drop" : ""}`);
  process.exit(0);
}

// ── the bed ────────────────────────────────────────────────────────────────────────────────────
const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const file = resolveTrack(arg("--track"));
if (!file) { console.error(`usage: bed.mjs --track <track of ${SHELF}, or a path> [--from s | --align s@t] … (bed.mjs --map <track>)`); process.exit(2); }
const M = mapOf(file);
const DUR = Number(P.duration);
const SR = 48000;
const nums = s => String(s).split(",").map(x => x.trim()).filter(Boolean);
// where the track starts and how fast it plays
let FROM = arg("--from") != null ? parseFloat(arg("--from")) : M.firstNote, TEMPO = 1;
if (arg("--align")) {
  const pairs = nums(arg("--align")).map(p => p.split("@").map(Number));
  if (pairs.some(p => p.length !== 2 || p.some(v => !Number.isFinite(v)))) { console.error("--align s@t[,s2@t2]: the track's second @ the video's second"); process.exit(2); }
  if (pairs.length > 1) {
    const [[s1, t1], [s2, t2]] = pairs;
    TEMPO = (s2 - s1) / (t2 - t1);
    if (!(Math.abs(TEMPO - 1) <= 0.01)) { console.error(`to land both, the track would play at ×${TEMPO.toFixed(4)}: more than 1 % off, it would be heard. Align one point, or pick other ones`); process.exit(1); }
  }
  FROM = pairs[0][0] - pairs[0][1] * TEMPO;
  if (FROM < 0) { console.error(`the track would have to start ${(-FROM).toFixed(2)} s before its beginning: align a later point`); process.exit(1); }
}
const NEED = DUR * TEMPO;                                     // track seconds the video uses
const loop = M.duration - FROM < NEED;
// what is not said again is kept from the last run (project.json); --drops "" or --muffle none clears it
const drops = nums(argv.includes("--drops") ? arg("--drops", "") : (P.musicDrops ?? []).map(d => d.join("-")).join(",")).map(d => d.split("-").map(Number)).filter(([a, b]) => b > a);
const muffle = argv.includes("--muffle") ? (/^none$/i.test(arg("--muffle", "")) ? null : arg("--muffle").split("-").map(Number)) : (P.musicMuffle ?? null);
const END = arg("--end", "house");
// the chain, on the video's timeline (after atempo)
const f = [`aresample=${SR}`];
if (Math.abs(TEMPO - 1) > 1e-6) f.push(`atempo=${TEMPO.toFixed(6)}`);
f.push(`atrim=0:${DUR.toFixed(3)}`, "asetpts=PTS-STARTPTS");
if (drops.length) f.push(`volume=eval=frame:volume='${drops.map(([a, b]) => `max(min(1\\,max(0\\,(${a}-t)/0.05))\\,min(1\\,max(0\\,(t-${b})/0.03)))`).join("*")}'`);
let graph = `[0:a]${f.join(",")}[x]`, last = "x";
if (muffle) {
  const [a, b] = muffle, inW = `clip((t-${a})/0.02\\,0\\,1)`, w = b != null && Number.isFinite(b) ? `(${inW})*(1-clip((t-${b})/0.02\\,0\\,1))` : inW;
  graph += `;[x]asetnsamples=n=256:p=0,asplit=2[md][mw];[md]volume=eval=frame:volume='1-${w}'[dry];[mw]lowpass=f=650:poles=2,lowpass=f=650:poles=2,volume=eval=frame:volume='0.45*${w}'[wet];[dry][wet]amix=inputs=2:normalize=0:duration=first[m]`;
  last = "m";
}
if (END === "house") {
  const T0 = Math.max(0, DUR - 1.6), cmds = [];
  for (let i = 0; i < 16; i++) cmds.push(`${(T0 + i * 0.1).toFixed(3)} lowpass@sweep f ${Math.round(16000 * Math.pow(500 / 16000, i / 15))}`);
  graph += `;[${last}]asendcmd=c='${cmds.join(";")}',lowpass@sweep=f=20000,afade=t=out:st=${T0.toFixed(3)}:d=${(DUR - T0).toFixed(3)}:curve=exp[o]`;
} else graph += `;[${last}]afade=t=out:st=${Math.max(0, DUR - 0.03).toFixed(3)}:d=0.03[o]`;
fs.mkdirSync("assets", { recursive: true });
const r = ff(["-v", "error", "-y", ...(loop ? ["-stream_loop", "-1"] : []), "-ss", String(FROM), "-i", file,
  "-filter_complex", graph, "-map", "[o]", "-ac", "2", "-ar", String(SR), "-c:a", "pcm_s16le", "assets/music.wav"]);
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }

// the level: the vertical short's bed sits ~15 LU under the voice as heard. voice − track − master
// − (under + 4) lands it there (the dynamic loudnorm lifts a bed ~3 dB above the arithmetic;
// measured on the explainer's reference take for 16 LU), +0.18 dB per dB of a take quieter than
// −20.5 LUFS. measure.mjs is the verdict.
const UNDER = Number(arg("--under", P.bedUnder ?? 15));
const trackI = lufsOf("assets/music.wav");
let voice = P.voiceLufs;
if (voice == null) { const src = fs.existsSync("voice.wav") ? "voice.wav" : P.source; voice = lufsOf(src); }
if (Number.isFinite(trackI) && Number.isFinite(voice) && (P.bedDb == null || arg("--level") === "auto")) {
  const master = P.sfxMasterDb ?? -15;
  P.bedDb = +(voice - trackI - master - (UNDER + 4) + 0.18 * Math.max(0, -20.5 - voice)).toFixed(1);
}
Object.assign(P, { bed: "music.wav", musicTrack: path.basename(file), musicFrom: +FROM.toFixed(3), musicTempo: +TEMPO.toFixed(6), musicDrops: drops, musicMuffle: muffle ?? undefined, bedUnder: UNDER });
fs.writeFileSync("project.json", JSON.stringify(P, null, 2));
// where the beats fall in the video: the grid of the track, through --from and the tempo
const firstBeat = (() => { const k = Math.ceil((FROM - M.phase) / M.beat); return (M.phase + k * M.beat - FROM) / TEMPO; })();
const secs = M.sections.filter(s => s.to > FROM && s.from < FROM + NEED).map(s => `${fmt(Math.max(0, (s.from - FROM) / TEMPO), 1)} ${s.kind}${s.drop ? " (drop)" : ""}`);
console.log(`assets/music.wav — ${path.basename(file)} from ${fmt(FROM, 3)} s${TEMPO !== 1 ? ` at ×${TEMPO.toFixed(4)}` : ""}, ${fmt(DUR, 2)} s${loop ? ` (looped: the track lasts ${M.duration} s)` : ""}` +
  `${muffle ? `, muffled from ${muffle[0]}${muffle[1] != null ? ` to ${muffle[1]}` : ""} s` : ""}${drops.length ? `, silent on ${drops.map(d => d.join("-")).join(", ")}` : ""}, end ${END}`);
console.log(`beats in the video: ${fmt(firstBeat, 3)} + k × ${fmt(M.beat / TEMPO, 4)} s (${M.bpm} bpm) · sections from: ${secs.join(" · ")}`);
console.log(`the track ${fmt(trackI, 1)} LUFS, the voice ${fmt(voice, 1)} LUFS → bedDb ${P.bedDb} (about ${UNDER} LU under the voice: measure.mjs bed says it as heard)`);
