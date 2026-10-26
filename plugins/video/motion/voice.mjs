#!/usr/bin/env node
// The voice-over of a motion video: ElevenLabs reads the whole text in one take, then every word gets
// its time from what Scribe HEARS on that take (motion/align.mjs says why).
//
//   node voice.mjs take <dir>/vo.json          → <dir>/voix/prise.mp3, prise.wav (48 kHz mono), voix/scribe.json, <dir>/words.json
//   node voice.mjs words <dir>/vo.json         → words.json again, from the take kept (after the shown text changed)
//   node voice.mjs patch <dir>/vo.json @from @to "new text" [--seeds 7,11,23]
//                                              → that passage said again, the rest of the take untouched (@to may be END)
//   node voice.mjs audition <out-dir> "text" name=voice_id … [--lang en] [--stability 0.5]
//   node voice.mjs voices                      → the voices of your ElevenLabs account
//   node voice.mjs library [--lang fr] [--gender male|female] [--use narrative_story|social_media|…] [--n 12]
//                                              → voices of ElevenLabs' shared library, with a preview link
//   node voice.mjs scribe <audio> [--lang fr] [--out file.json]
//   node voice.mjs anchors <dir> [word …]      → every word: its time, its exact anchor (@word#n), * when approximate
//   node voice.mjs clean <take> [--out file]   → the voice made better (Ihsane, 2026-10-15): ElevenLabs' voice isolator
//                                                takes the room's echo and the noise out; <take>-voice.<ext> beside it
//                                                (a video keeps its picture as it is), the same length to the sample, so
//                                                the words' times do not move. The take itself is never changed.
//
// vo.json: { "voice": "<voice_id>", "model": "eleven_v4", "stability": 0.5, "seed": 7, "language": "en",
//            "text": "[excited] The text… (play tags in brackets are acted, never said)",
//            "say": { "MX-5": "M X 5" } }       ← how a word is said; the screen keeps what is written
// The key: ELEVENLABS_API_KEY, from the environment or the folder's .env.local. Never printed.
// The account takes 3 requests at a time: a busy answer waits its turn and tries again.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { norm, writtenWords, spoken, retime, opcodes, ratio, anchors, anchorList } from "./align.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const API = "https://api.elevenlabs.io/v1";

export function key() {
  if (process.env.ELEVENLABS_API_KEY?.trim()) return process.env.ELEVENLABS_API_KEY.trim();
  try {
    const m = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").match(/^\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*['"]?([^'"\s]+)/m);
    if (m) return m[1];
  } catch {}
  return null;
}
function needKey() {
  const k = key();
  if (!k) { console.error("No ElevenLabs key: add ELEVENLABS_API_KEY in .env.local (in the app: Settings › Connectors › Add key)."); process.exit(3); }
  return k;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wait = i => sleep((Math.min(40, 4 + 4 * i) + Math.random() * 4) * 1000);

// one request, tried again while the account is busy (429) or the network drops; a refusal stops at once
async function call(url, init, what) {
  for (let i = 0; i < 14; i++) {
    let r;
    try { r = await fetch(url, { ...init, signal: AbortSignal.timeout(300000) }); }
    catch (e) { console.error(`  ${what}: network (${e.message}), trying again`); await wait(i); continue; }
    if (r.ok) return r;
    const body = (await r.text()).slice(0, 200);
    if ([400, 401, 403, 404, 422].includes(r.status)) throw new Error(`${what}: HTTP ${r.status} ${body}`);
    console.error(`  ${what}: HTTP ${r.status}, trying again`);
    await wait(i);
  }
  throw new Error(`${what}: no answer`);
}

export async function tts(voice, text, { model = "eleven_v4", stability = 0.5, similarity = 0.8, seed = null, language = null } = {}) {
  const body = { text, model_id: model, voice_settings: { stability, similarity_boost: similarity }, ...(language ? { language_code: language } : {}), ...(seed != null ? { seed } : {}) };
  const r = await call(`${API}/text-to-speech/${encodeURIComponent(voice)}/with-timestamps?output_format=mp3_44100_128`,
    { method: "POST", headers: { "xi-api-key": needKey(), "Content-Type": "application/json" }, body: JSON.stringify(body) }, "ElevenLabs");
  return r.json();
}

export async function scribe(file, language = null) {
  const form = new FormData();
  form.set("model_id", "scribe_v1");
  if (language) form.set("language_code", language);
  form.set("timestamps_granularity", "word");
  form.set("tag_audio_events", "false");
  form.set("file", new Blob([fs.readFileSync(file)]), path.basename(file));
  const r = await call(`${API}/speech-to-text`, { method: "POST", headers: { "xi-api-key": needKey() }, body: form }, "Scribe");
  return r.json();
}

const ffmpeg = (args, input) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...args], { input, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg: ${String(r.stderr).slice(0, 300)}`);
  return r.stdout;
};
const toWav = (mp3, wav) => ffmpeg(["-i", mp3, "-ar", "48000", "-ac", "1", wav]);
const pcm = file => { const b = ffmpeg(["-i", file, "-f", "f32le", "-ac", "1", "-ar", "48000", "-"]); return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4); };
const writePcm = (x, wav) => ffmpeg(["-f", "f32le", "-ac", "1", "-ar", "48000", "-i", "-", "-c:a", "pcm_s16le", wav], Buffer.from(x.buffer, x.byteOffset, x.byteLength));
const readJSON = f => JSON.parse(fs.readFileSync(f, "utf8"));
const writeJSON = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1) + "\n");
const lang = spec => spec.language || null;
const settings = (spec, seed = spec.seed) => ({ model: spec.model || "eleven_v4", stability: spec.stability ?? 0.5, similarity: spec.similarity ?? 0.8, seed: seed ?? null, language: lang(spec) });

// ── take: the whole text, one take ──────────────────────────────────────────────────────────────
export async function take(specPath) {
  const d = path.dirname(path.resolve(specPath)), spec = readJSON(specPath);
  if (!spec.voice) throw new Error(`no voice in ${specPath}: pick one first (voice.mjs voices, library or audition)`);
  fs.mkdirSync(path.join(d, "voix"), { recursive: true });
  const r = await tts(spec.voice, spoken(spec.text, spec.say), settings(spec));
  const mp3 = path.join(d, "voix", "prise.mp3"), wav = path.join(d, "voix", "prise.wav");
  fs.writeFileSync(mp3, Buffer.from(r.audio_base64, "base64"));
  toWav(mp3, wav);
  writeJSON(path.join(d, "voix", "alignement-tts.json"), r.alignment || null);
  const sc = await scribe(wav, lang(spec));
  writeJSON(path.join(d, "voix", "scribe.json"), sc);
  const words = retime(spec.text, sc);
  writeJSON(path.join(d, "words.json"), words);
  report(sc, words, d);
  return words;
}
function report(sc, words, d) {
  const approx = words.filter(w => w.approx).length;
  console.log(`heard: ${sc.text}`);
  console.log(`${words.length} words timed (${approx} approximate), speech ends at ${words.at(-1)?.e.toFixed(2)} s → ${path.relative(process.cwd(), path.join(d, "words.json"))}`);
}

export function wordsOnly(specPath) {
  const d = path.dirname(path.resolve(specPath)), spec = readJSON(specPath);
  const words = retime(spec.text, readJSON(path.join(d, "voix", "scribe.json")));
  writeJSON(path.join(d, "words.json"), words);
  console.log(`${words.length} words`);
}

// ── patch: one passage said again, the rest of the take kept ────────────────────────────────────
export async function patch(specPath, aFrom, aTo, text, seeds = [7, 11, 23]) {
  const d = path.dirname(path.resolve(specPath)), spec = readJSON(specPath);
  const words = readJSON(path.join(d, "words.json"));
  const at = anchors(words), SR = 48000;
  const wav = path.join(d, "voix", "prise.wav"), x = pcm(wav);
  const toEnd = /^END$/i.test(aTo);
  const t0 = at(aFrom), t1 = toEnd ? x.length / SR : at(aTo);
  const prevEnd = Math.max(0, ...words.filter(w => w.e <= t0 + 0.01).map(w => w.e));
  const lastEnd = Math.max(...words.filter(w => w.s < t1 - 0.01).map(w => w.e));
  // the quietest 10 ms between two words: where the take is cut
  const quiet = (lo, hi) => {
    lo = Math.floor(lo * SR); hi = Math.floor(hi * SR);
    if (hi - lo < 960) return Math.floor((lo + hi) / 2);
    let best = lo, bestE = Infinity;
    for (let i = lo; i < hi - 480; i += 120) { let e = 0; for (let k = 0; k < 480; k++) e += x[i + k] * x[i + k]; if (e < bestE) { bestE = e; best = i; } }
    return best + 240;
  };
  const c0 = quiet(prevEnd, t0), c1 = toEnd ? x.length : quiet(lastEnd, t1);
  const ref = writtenWords(text).filter(w => norm(w)).map(norm);
  const tmp = path.join(d, "voix", "patch"); fs.mkdirSync(tmp, { recursive: true });
  let best = null;
  for (const sd of seeds) {
    const r = await tts(spec.voice, spoken(text, spec.say), settings(spec, sd));
    const mp3 = path.join(tmp, `try-${sd}.mp3`), w2 = mp3.replace(/\.mp3$/, ".wav");
    fs.writeFileSync(mp3, Buffer.from(r.audio_base64, "base64")); toWav(mp3, w2);
    const sc = await scribe(w2, lang(spec));
    const ws = (sc.words || []).filter(w => w.type === "word");
    if (!ws.length) { console.log(`  seed ${sd}: nothing heard`); continue; }
    const fid = ratio(ref, ws.map(w => norm(w.text)));
    const rate = ws.length / Math.max(ws.at(-1).end - ws[0].start, 0.1);
    const score = fid - Math.abs(rate - 3.2) * 0.05;
    console.log(`  seed ${sd}: ${(fid * 100).toFixed(1)} % as written, ${rate.toFixed(2)} words/s, ${ws.at(-1).end.toFixed(1)} s`);
    if (!best || score > best.score) best = { score, w2, sd, ws };
  }
  if (!best) throw new Error("no take of the passage could be heard");
  const y = pcm(best.w2);
  const s0 = Math.floor(Math.max(best.ws[0].start - 0.06, 0) * SR), s1 = Math.floor(Math.min(best.ws.at(-1).end + 0.12, y.length / SR) * SR);
  const seg = y.slice(s0, s1);
  // the same level as the take around it
  const rms = v => { let s = 0, n = 0; for (const a of v) if (Math.abs(a) > 0.01) { s += a * a; n++; } return n ? Math.sqrt(s / n) : 1; };
  const ctx = new Float32Array([...x.subarray(Math.max(c0 - 5 * SR, 0), c0), ...x.subarray(c1, Math.min(c1 + 5 * SR, x.length))]);
  const g = rms(ctx) / rms(seg);
  for (let i = 0; i < seg.length; i++) seg[i] *= g;
  const f = Math.floor(0.01 * SR);
  for (let i = 0; i < f && i < seg.length; i++) { seg[i] *= i / f; seg[seg.length - 1 - i] *= i / f; }
  const gap = new Float32Array(Math.floor(0.18 * SR));
  const out = new Float32Array(c0 + gap.length + seg.length + (toEnd ? 0 : gap.length) + (x.length - c1));
  let o = 0;
  const put = a => { out.set(a, o); o += a.length; };
  put(x.subarray(0, c0)); put(gap); put(seg); if (!toEnd) put(gap); put(x.subarray(c1));
  // the take before, kept
  let n = 1;
  while (fs.existsSync(path.join(d, "voix", `avant-patch-${n}`))) n++;
  const bk = path.join(d, "voix", `avant-patch-${n}`); fs.mkdirSync(bk);
  for (const fn of ["prise.wav", "scribe.json"]) fs.copyFileSync(path.join(d, "voix", fn), path.join(bk, fn));
  fs.copyFileSync(path.join(d, "words.json"), path.join(bk, "words.json")); fs.copyFileSync(specPath, path.join(bk, "vo.json"));
  writePcm(out, wav);
  // the whole text follows the take
  const first = words.find(w => w.s >= t0 - 0.01);
  const tail = toEnd ? null : words.find(w => w.s >= t1 - 0.02);
  const nthPos = (txt, tok, nth) => {
    let k = 0;
    for (const m of txt.matchAll(/\S+/g)) {
      if (m[0].startsWith("[")) continue;
      if (norm(m[0]) === norm(tok) && ++k === nth) return m.index;
    }
    return -1;
  };
  const count = w => words.filter(v => norm(v.w) === norm(w.w) && v.s <= w.s + 1e-6).length;
  let full = spec.text;
  let k0 = nthPos(full, first.w.split(/[\s ]/)[0], count(first)), k1 = tail ? nthPos(full, tail.w.split(/[\s ]/)[0], count(tail)) : full.length;
  const tag0 = /\[[^\]]*\]\s*$/.exec(full.slice(0, k0)); if (tag0) k0 = tag0.index;   // the play tag goes with its passage
  if (tail) { const tag1 = /\[[^\]]*\]\s*$/.exec(full.slice(0, k1)); if (tag1) k1 = tag1.index; }
  const old = words.filter(w => w.s >= t0 - 0.01 && (toEnd || w.s < t1 - 0.01)).map(w => w.w).join(" ");
  spec.text = full.slice(0, k0) + text.trim() + (tail ? " " + full.slice(k1) : "");
  (spec.patches ||= []).push({ from: aFrom, to: aTo, old, new: text, seed: best.sd });
  writeJSON(specPath, spec);
  const sc = await scribe(wav, lang(spec));
  writeJSON(path.join(d, "voix", "scribe.json"), sc);
  const w2 = retime(spec.text, sc);
  writeJSON(path.join(d, "words.json"), w2);
  console.log(`seed ${best.sd} kept; cut ${(c0 / SR).toFixed(2)}–${(c1 / SR).toFixed(2)} s; the take is now ${(out.length / SR).toFixed(1)} s; the one before is in ${path.relative(process.cwd(), bk)}`);
  report(sc, w2, d);
}

// ── choosing a voice ────────────────────────────────────────────────────────────────────────────
export async function audition(out, text, pairs, { stability = 0.5, language = null } = {}) {
  fs.mkdirSync(out, { recursive: true });
  const n = writtenWords(text).length, done = [];
  for (const [name, id] of pairs) {
    let r;
    try { r = await tts(id, spoken(text), { stability, seed: 7, language }); }
    catch (e) { console.log(`${name}: failed (${e.message})`); continue; }
    // a plain file name (the app plays it: letters, digits, dots and dashes only)
    const mp3 = path.join(out, `${name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "voice"}.mp3`);
    fs.writeFileSync(mp3, Buffer.from(r.audio_base64, "base64"));
    const end = r.alignment?.character_end_times_seconds?.at(-1) || 0;
    console.log(`${name.padEnd(28)} ${end.toFixed(1).padStart(5)} s  ${(n / Math.max(end, 0.1)).toFixed(2)} words/s  → ${mp3}`);
    done.push({ name, voice: id, file: path.basename(mp3), seconds: +end.toFixed(2), rate: +(n / Math.max(end, 0.1)).toFixed(2) });
  }
  writeJSON(path.join(out, "audition.json"), { text, voices: done, at: new Date().toISOString() });
  return done;
}
export async function voices() {
  const r = await call(`${API}/voices`, { headers: { "xi-api-key": needKey() } }, "ElevenLabs voices");
  const j = await r.json();
  return (j.voices || []).map(v => ({ id: v.voice_id, name: v.name, category: v.category, labels: v.labels || {}, preview: v.preview_url || null }));
}
export async function library({ language = null, gender = null, use = null, n = 12 } = {}) {
  const q = new URLSearchParams({ page_size: String(n), sort: "trending" });
  if (language) q.set("language", language);
  if (gender) q.set("gender", gender);
  if (use) q.set("use_cases", use);
  const r = await call(`${API}/shared-voices?${q}`, { headers: { "xi-api-key": needKey() } }, "ElevenLabs library");
  const j = await r.json();
  return (j.voices || []).map(v => ({ id: v.voice_id, owner: v.public_owner_id, name: v.name, gender: v.gender, age: v.age, accent: v.accent, language: v.language, use: v.use_case, description: v.descriptive || v.description || "", preview: v.preview_url || null }));
}

// the voice made better: the whole take through ElevenLabs' audio isolation (billed by ElevenLabs per minute of sound),
// laid back at 48 kHz on the take's exact length; a video keeps its picture stream untouched
export async function clean(input, out = null) {
  const src = path.resolve(input);
  if (!fs.existsSync(src)) throw new Error(`not found: ${input}`);
  const ext = path.extname(src), video = /^\.(mp4|mov|m4v|mkv|webm)$/i.test(ext);
  out = path.resolve(out || src.replace(/(\.\w+)$/, "-voice$1"));
  const probe = (args, f) => spawnSync("ffprobe", ["-v", "error", ...args, "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }).stdout.trim();
  const dur = +probe(["-show_entries", "format=duration"], src);
  const ch = +probe(["-select_streams", "a:0", "-show_entries", "stream=channels"], src) || 1;
  if (!dur) throw new Error(`no sound in ${input}`);
  const tmp = fs.mkdtempSync(path.join(path.dirname(out), ".voice-"));
  try {
    const flac = path.join(tmp, "in.flac");
    let r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "48000", "-c:a", "flac", flac]);
    if (r.status) throw new Error("the sound could not be read");
    const form = new FormData();
    form.set("audio", new Blob([fs.readFileSync(flac)], { type: "audio/flac" }), "take.flac");
    console.log(`isolating the voice of ${(dur / 60).toFixed(1)} min of sound (ElevenLabs)…`);
    const res = await call(`${API}/audio-isolation`, { method: "POST", headers: { "xi-api-key": needKey() }, body: form }, "ElevenLabs voice isolator");
    const iso = path.join(tmp, "iso.mp3");
    fs.writeFileSync(iso, Buffer.from(await res.arrayBuffer()));
    // the take's length to the sample, its channels; then the picture copied beside it
    const snd = path.join(tmp, "voice.wav");
    r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", iso, "-af", `aresample=48000,apad,atrim=0:${dur.toFixed(6)}`, "-ac", String(Math.min(2, ch)), "-c:a", "pcm_s16le", snd]);
    if (r.status) throw new Error("the isolated voice could not be laid back");
    r = video
      ? spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-i", snd, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out])
      : spawnSync("ffmpeg", ["-v", "error", "-y", "-i", snd, ...(/\.wav$/i.test(out) ? ["-c:a", "pcm_s16le"] : ["-c:a", "libmp3lame", "-b:a", "256k"]), out]);
    if (r.status) throw new Error(`could not write ${path.basename(out)}`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  writeJSON(out + ".voice.json", { from: path.basename(src), isolated: "elevenlabs audio-isolation", seconds: +dur.toFixed(3), at: new Date().toISOString() });
  console.log(`→ ${path.relative(process.cwd(), out)}: the voice without the room's echo nor the noise, ${dur.toFixed(1)} s like the take`);
  return out;
}

// ── the command line ────────────────────────────────────────────────────────────────────────────
const opt = (a, k, d = null) => { const i = a.indexOf(k); return i >= 0 && i + 1 < a.length ? a[i + 1] : d; };
async function main(a) {
  const cmd = a[0];
  if (cmd === "take") return take(a[1]);
  if (cmd === "words") return wordsOnly(a[1]);
  if (cmd === "patch") return patch(a[1], a[2], a[3], a[4], (opt(a, "--seeds") || "7,11,23").split(",").map(Number));
  if (cmd === "audition") {
    const pairs = a.slice(3).filter(x => x.includes("=") && !x.startsWith("--")).map(x => [x.slice(0, x.indexOf("=")), x.slice(x.indexOf("=") + 1)]);
    return audition(a[1], a[2], pairs, { stability: +(opt(a, "--stability") || 0.5), language: opt(a, "--lang") });
  }
  if (cmd === "voices") { for (const v of await voices()) console.log(`${v.id}  ${v.name}  (${v.category}${v.labels.accent ? `, ${v.labels.accent}` : ""}${v.labels.gender ? `, ${v.labels.gender}` : ""})`); return; }
  if (cmd === "library") {
    const l = await library({ language: opt(a, "--lang"), gender: opt(a, "--gender"), use: opt(a, "--use"), n: +(opt(a, "--n") || 12) });
    for (const v of l) console.log(`${v.id}  ${v.name} · ${[v.gender, v.age, v.accent, v.use].filter(Boolean).join(", ")}${v.description ? ` · ${v.description}` : ""}${v.preview ? `\n    preview: ${v.preview}` : ""}`);
    return;
  }
  if (cmd === "scribe") {
    const sc = await scribe(a[1], opt(a, "--lang"));
    if (opt(a, "--out")) writeJSON(opt(a, "--out"), sc);
    console.log(sc.text);
    return;
  }
  if (cmd === "clean") return clean(a[1], opt(a, "--out"));
  if (cmd === "anchors") {
    const words = readJSON(path.join(a[1], "words.json")), only = new Set(a.slice(2).map(norm));
    for (const w of anchorList(words)) if (!only.size || only.has(norm(w.word))) console.log(`${w.t.toFixed(2).padStart(7)}  ${w.anchor.padEnd(24)} ${w.word}${w.approx ? "  *" : ""}`);
    return;
  }
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 26).map(l => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(cmd ? 2 : 0);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(e => { console.error(`✗ ${e.message}`); process.exit(1); });
}
