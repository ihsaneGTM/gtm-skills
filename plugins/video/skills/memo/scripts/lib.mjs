// What the memo scripts share: where a memo keeps its files, your profile, your pace, the words.
//
// A memo is a folder, workspace/memos/<slug>/:
//   source/<file>      the voice memo as you recorded it (an audio file, or a video), never changed
//   memo.task.json     its name and where it comes from, when the interface made it
//   media.json         the recording, measured (duration, when it was recorded)
//   words.json         every word with its time (asr.py: the GPU, else faster-whisper)
//   segments.json      the words grouped into sentences, with their times
//   transcript.txt     the same, one line a sentence, [m:ss] before each: what Claude reads
//   prepare.json       how far the preparation went (the interface shows it)
//   memo.json          what Claude made of it: the shorts inside, three versions each, the feedback
//   audio/<short>-v<n>.mp3   each version read aloud (voice.mjs, ElevenLabs), when a voice is set
//   board.json         where each short is now (picked, recorded, derushed, edited, planned): the
//                      interface writes it, Claude never does
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = process.env.GTM_OS_ROOT ? path.resolve(process.env.GTM_OS_ROOT) : path.resolve(HERE, "..", "..", "..", "..", "..");
// the engine the video skills share: its bootstrap provisions faster-whisper and mlx-whisper (~/.venv/whisper)
export const ENGINE = path.join(ROOT, "plugins", "video", "skills", "short-editor", "scripts");
// the whisper runner (a copy of the derush skill's, so the memo needs no other skill): every word, its onset and end,
// the language detected
export const TRANSCRIBE = path.join(HERE, "transcribe.py");
export const MEMOS = path.join(ROOT, "workspace", "memos");
export const STUDIO = path.join(ROOT, "workspace", "studio");
export const PROFILE = path.join(STUDIO, "profile.json");
export const IDEAS_PROFILE = path.join(ROOT, "workspace", "ideas", "profile.json");

export const AUDIO = /\.(m4a|mp3|wav|aac|caf|aif|aiff|flac|ogg|opus|webm|mp4|mov|m4v)$/i;
export const readJSON = (p, d = null) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return d; } };
export function writeJSON(p, v) {
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(v, null, 1));
  fs.renameSync(tmp, p);
}
export const rel = p => path.relative(ROOT, p).split(path.sep).join("/");
export function memoDir(arg) {
  if (!arg) throw new Error("which memo? give its folder (workspace/memos/<slug>) or its slug");
  const direct = path.resolve(arg);
  if (fs.existsSync(path.join(direct, "source"))) return direct;
  const bySlug = path.join(MEMOS, path.basename(arg));
  if (fs.existsSync(bySlug)) return bySlug;
  throw new Error(`no memo at ${arg}`);
}
export function sourceOf(dir) {
  const s = path.join(dir, "source");
  const f = fs.existsSync(s) ? fs.readdirSync(s).filter(n => AUDIO.test(n) && !n.startsWith(".")).sort()[0] : null;
  if (!f) throw new Error(`no recording in ${rel(s)}/`);
  return path.join(s, f);
}
export const mmss = t => { const s = Math.max(0, Math.round(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// the recording, as ffprobe reads it: its length, and when the phone says it was recorded
export function probe(src) {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:format_tags=creation_time:stream=codec_type,codec_name,sample_rate,channels", "-of", "json", src], { encoding: "utf8", timeout: 20000 });
  if (r.status !== 0) throw new Error(`ffprobe could not read ${path.basename(src)}`);
  const j = JSON.parse(r.stdout || "{}");
  const a = (j.streams || []).find(s => s.codec_type === "audio");
  if (!a) throw new Error("this file has no sound");
  return {
    duration: Math.round(+j.format?.duration * 1000) / 1000 || 0,
    recordedAt: j.format?.tags?.creation_time || null,
    codec: a.codec_name || null, sampleRate: +a.sample_rate || null, channels: +a.channels || null,
    video: (j.streams || []).some(s => s.codec_type === "video"),
  };
}

// ── your profile: the language your videos are in, your lead magnet, the voice that reads ─────────
export const PROFILE_TEMPLATE = {
  about: "What the memo skill needs to know, on top of workspace/ideas/profile.json (who you are, your audience). Edit it any time, or ask Claude to. Nothing in it leaves this Mac, except the text sent to ElevenLabs to be read aloud.",
  videoLanguage: "en",
  // asked in the memo's window of the app before each memo (empty: no lead magnet, the versions end on
  // the point)
  leadMagnet: { line: "", keywords: [] },
  voice: {
    provider: "elevenlabs",
    voiceId: null,
    model: "eleven_v4",
    auto: true,
    note: "The voice that reads your versions aloud. Best: your own voice cloned in ElevenLabs (Voices › Add a voice), then its id here. The key goes in .env.local as ELEVENLABS_API_KEY (Settings › Connectors in the app).",
  },
  lengths: { min: 30, max: 180, note: "a short of 1 to 3 minutes at most; most land between 40 and 90 s" },
  feedbackMax: 3,
  speaker: {
    english: "simple",
    how: "Like talking to a friend sitting in front of me: common words, short sentences, no idioms. Shorts that go straight to the point.",
    note: "Who says the scripts, and how: plugins/video/references/how-you-talk.md. english: simple (a B1 speaker's words) or native.",
  },
};
// words a script should not use, each with the simple one (plugins/video/references/plain-english.json)
const PLAIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "references", "plain-english.json");
export function bigWords(text) {
  const avoid = readJSON(PLAIN)?.avoid || {}, t = ` ${String(text || "").toLowerCase().replace(/[’]/g, "'").replace(/[^a-z' -]+/g, " ").replace(/\s+/g, " ")} `;
  return Object.entries(avoid).filter(([w]) => t.includes(` ${w} `)).map(([w, use]) => ({ word: w, use }));
}
export const sentencesOf = s => String(s || "").split(/(?<=[.!?…])\s+|\n+/).map(x => x.trim()).filter(Boolean);
export function profile() {
  const p = readJSON(PROFILE);
  return p ? { ...PROFILE_TEMPLATE, ...p, leadMagnet: { ...PROFILE_TEMPLATE.leadMagnet, ...(p.leadMagnet || {}) }, voice: { ...PROFILE_TEMPLATE.voice, ...(p.voice || {}) }, speaker: { ...PROFILE_TEMPLATE.speaker, ...(p.speaker || {}) } } : null;
}
export function ensureProfile() {
  if (!fs.existsSync(PROFILE)) { fs.mkdirSync(STUDIO, { recursive: true }); writeJSON(PROFILE, PROFILE_TEMPLATE); }
  return profile();
}

// ── your pace: words a second, measured on your own takes (the same measure as the script writer) ──
export function pace() {
  const P = readJSON(IDEAS_PROFILE) || {};
  const takes = P.pace?.takes || [];
  let words = 0, secs = 0; const used = [];
  for (const t of takes) {
    const w = readJSON(path.join(ROOT, "workspace", "projects", t, "words.json"));
    const a = Array.isArray(w) ? w : w?.words;
    if (!a?.length) continue;
    let s = 0;
    for (let i = 0; i < a.length; i++) { s += a[i].e - a[i].s; if (i + 1 < a.length) s += Math.min(Math.max(0, a[i + 1].s - a[i].e), 0.6); }
    words += a.length; secs += s; used.push(`${t} (${a.length} words)`);
  }
  if (words >= 40) return { wps: Math.round((words / secs) * 100) / 100, measured: true, on: used.join(", ") };
  return { wps: 3, measured: false, on: "no take of yours measured yet: 3 words a second until one is" };
}
export const countWords = s => (String(s || "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

// ── the words, grouped into sentences: at a full stop, or at a pause longer than 0.8 s ───────────
export function segmentsOf(words) {
  const out = [];
  let cur = null;
  // the words joined as written: no space before a mark, none around an elision (j'ai, l'idée, don't)
  // nor inside a hyphenated word (peut-être, est-ce, là-dessus)
  const join = ws => ws.map(w => w.w).join(" ").replace(/\s+([,.!?;:…])/g, "$1").replace(/(\p{L})\s*(['’])\s*(\p{L})/gu, "$1$2$3").replace(/(\p{L})\s+-(\p{L})/gu, "$1-$2");
  const flush = () => { if (cur?.words.length) out.push({ start: cur.words[0].s, end: cur.words.at(-1).e, text: join(cur.words) }); cur = null; };
  for (let i = 0; i < words.length; i++) {
    const w = words[i], prev = words[i - 1];
    if (cur && prev && (w.s - prev.e > 0.8 || (w.s - cur.words[0].s > 22 && /[,;:]$/.test(prev.w)))) flush();
    cur ||= { words: [] };
    cur.words.push(w);
    if (/[.!?…]$/.test(w.w) && w.s - cur.words[0].s > 1.2) flush();
  }
  flush();
  return out.map((s, i) => ({ i, ...s, start: Math.round(s.start * 100) / 100, end: Math.round(s.end * 100) / 100 }));
}
