#!/usr/bin/env node
// The long take, heard once: every word with its time (Whisper on this Mac by default: no key, nothing sent; Scribe only
// when the user has an ElevenLabs key and asks for it, --asr scribe), each word's end measured on the voice, then the
// take is laid out for the judgment step: every sentence numbered, timed, with what makes a short of it marked.
//
//   node listen.mjs <run-dir> [--lang en] [--asr whisper|scribe]
//
// When another run already heard the same file (the YouTube video editor started on it at the same time, or a shorts
// run before), its transcript is taken: nothing is heard twice (nothing paid twice with Scribe). The YouTube editor's
// take.mjs does the hearing (the same transcript.json, words.json and sentences.json).
// Writes take/audio.mp3, take/transcript.json, take/words.json, take/sentences.json and take/moments.md: each sentence
//   #n  start  length  marks  text
// marks: ? a question · # a number · ! a strong claim (never, always, nobody, the best, a mistake…) · « a story (when I,
// I remember, last week…) · > a turn (but, here's the thing, the truth is…) · ~ a filler or a restart (« uh », said twice)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ROOT } from "../../../motion/brand.mjs";
import { step } from "../../../motion/progress.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const run = readJSON(path.join(RUN, "run.json"), {});
const src = path.resolve(ROOT, run.video || "");
if (!run.video || !fs.existsSync(src)) { console.error(`✗ the long take is not found: ${run.video || "(run.json has no video)"}`); process.exit(2); }
const lang = opt("lang") || run.language || "en";
const ASR = opt("asr") || run.asr || null;    // null: whichever heard it already, else Whisper
const T = path.join(RUN, "take");
fs.mkdirSync(T, { recursive: true });

// ── a transcript of the same file, made by another run ────────────────────────────────────────────────────────
const same = (() => {
  const real = fs.realpathSync(src), st = fs.statSync(src);
  const P = path.join(ROOT, "workspace", "projects");
  let found = null;
  for (const d of fs.existsSync(P) ? fs.readdirSync(P) : []) {
    const dir = path.join(P, d);
    if (dir === RUN) continue;
    const r = readJSON(path.join(dir, "run.json"));
    // its transcript: transcript.json (any engine), or the scribe.json of a run made before it existed
    const tr = path.join(dir, "take", "transcript.json"), old = path.join(dir, "take", "scribe.json");
    const sc = fs.existsSync(tr) ? tr : fs.existsSync(old) ? old : null;
    if (!r?.video || !sc) continue;
    // the engine asked for (--asr / run.json › asr): a transcript of the other one is not taken
    const eng = sc === old ? "scribe" : readJSON(sc, {}).engine;
    if (ASR && eng !== ASR) continue;
    const v = path.resolve(ROOT, r.video);
    let match = false;
    try { const vs = fs.statSync(v); match = fs.realpathSync(v) === real || (vs.size === st.size && path.basename(v) === path.basename(src)); } catch {}
    // a run that sped its take up first (the YouTube editor's face-x11.mp4) heard another clock: not the same
    if (match && (r.language || "en") === lang && (!found || fs.statSync(sc).mtimeMs > fs.statSync(found).mtimeMs)) found = sc;
  }
  return found;
})();
const ownT = path.join(T, "transcript.json"), ownS = path.join(T, "scribe.json");
// ── the words the app heard as the video arrived (the editor's .prep/, the engine's prep.mjs: Whisper large-v3 on this
// Mac, the language detected): taken as this take's transcript when they are of this very file and in the language asked,
// so a take dropped in the Short video editor is never heard twice (OPTIMISATION-SKILLS.md § 17)
{
  const pw = path.join(RUN, ".prep", "words.json"), pm = path.join(RUN, ".prep", "words.meta.json");
  const meta = readJSON(pm), pre = readJSON(pw);
  let same = false;
  try { same = !!meta && fs.realpathSync(meta.source?.path || "") === fs.realpathSync(src) && meta.source.size === fs.statSync(src).size; } catch {}
  if (!fs.existsSync(ownT) && !fs.existsSync(ownS) && (!ASR || ASR === "whisper") && same && meta.language === lang && Array.isArray(pre) && pre.length) {
    const words = pre.filter(w => w && String(w.w || "").trim()).map(w => ({ w: String(w.w).trim(), s: +(+w.s).toFixed(3), e: +(+w.e).toFixed(3) }));
    fs.writeFileSync(ownT, JSON.stringify({ engine: "whisper", model: meta.model || "large-v3", language: lang, source: { path: fs.realpathSync(src), size: fs.statSync(src).size },
      seconds: 0, from: ".prep (heard by the app as the video arrived)", text: words.map(w => w.w).join(" "), words }));
    console.log(`the app heard this take as it arrived (.prep/, ${meta.model || "large-v3"}, ${lang}): its words are used (nothing heard again)`);
  } else if (meta && same && meta.language && meta.language !== lang) console.log(`(.prep/ heard « ${meta.language} », not « ${lang} »: heard again in ${lang})`);
}
const reuse = f => (/scribe\.json$/.test(f) ? ["--scribe", f] : ["--transcript", f]);
const args = [path.join(HERE, "..", "..", "voiceover-video", "scripts", "take.mjs"), RUN, "--lang", lang, ...(ASR ? ["--asr", ASR] : [])];
const ownEng = fs.existsSync(ownT) ? readJSON(ownT, {}).engine : fs.existsSync(ownS) ? "scribe" : null;
if (ownEng && (!ASR || ownEng === ASR)) args.push(...reuse(fs.existsSync(ownT) ? ownT : ownS));
else if (same) { args.push(...reuse(same)); console.log(`the same take was heard by ${path.relative(ROOT, path.dirname(path.dirname(same)))}: its transcript is used (nothing heard again)`); }
const r = spawnSync(process.execPath, args, { encoding: "utf8" });
if (r.status) { process.stderr.write(r.stderr || ""); process.stdout.write(r.stdout || ""); process.exit(r.status); }
// take.mjs prints the whole transcript and the first 40 s; keep its first line (the take's numbers)
console.log(String(r.stdout).split("\n").find(l => /^take:/.test(l)) || "");

// ── a compound Whisper heard in pieces (« go », « -to », « -market »): one word on screen, « go-to-market » ──────────
{
  const W0 = readJSON(path.join(T, "words.json"), []), out = [];
  for (const w of W0) { const p = out.at(-1); if (p && /^-[^\s-]/.test(w.w) && /[^\s.,!?;:]$/.test(p.w) && w.s - p.e < 0.15) { p.w += w.w; p.e = w.e; } else out.push({ ...w }); }
  if (out.length < W0.length) {
    fs.writeFileSync(path.join(T, "words.json"), JSON.stringify(out));
    const S0 = readJSON(path.join(T, "sentences.json"), []);
    for (const x of S0) { const ws = out.filter(w => w.s >= x.s - 0.001 && w.e <= x.e + 0.001); if (ws.length) { x.words = ws.length; x.text = ws.map(w => w.w).join(" "); } }
    fs.writeFileSync(path.join(T, "sentences.json"), JSON.stringify(S0, null, 1) + "\n");
    console.log(`${W0.length - out.length} piece(s) of compound words joined (« go -to -market » → « go-to-market »)`);
  }
}

// ── the moments sheet ─────────────────────────────────────────────────────────────────────────────────────────
const S = readJSON(path.join(T, "sentences.json"), []);
const W = readJSON(path.join(T, "words.json"), []);
const NUM = /\d|\b(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion|percent|half|double|twice|deux|trois|cent|mille|million)\b/i;
const CLAIM = /\b(never|always|nobody|no one|everyone|every time|the best|the worst|the only|the biggest|mistake|secret|truth|wrong|stop|don't|forget|insane|crazy|game.?changer|jamais|toujours|personne|erreur|secret|meilleur|pire)\b/i;
const STORY = /\b(when i|i remember|last (week|month|year)|one day|we (had|did|were)|at pipecorn|my first|i was|quand j|je me souviens|on a)\b/i;
const TURN = /^(but|here's the thing|the truth is|the problem|the thing is|and that's|so the|actually|mais|le problème|en fait)\b/i;
const FILL = /\b(uh|um|euh|hum)\b|\b(\w+) \2\b/i;
const marks = x => [/\?$/.test(x.text) && "?", NUM.test(x.text) && "#", CLAIM.test(x.text) && "!", STORY.test(x.text) && "«", TURN.test(x.text) && ">", FILL.test(x.text) && "~"].filter(Boolean).join("");
const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
const lines = S.map(x => `#${String(x.i).padStart(3)}  ${fmt(x.s).padStart(7)}  ${(x.e - x.s).toFixed(1).padStart(5)} s  ${marks(x).padEnd(4)} ${x.text}`);
const dur = W.length ? W.at(-1).e : 0;
fs.writeFileSync(path.join(T, "moments.md"), `# The take, sentence by sentence\n\n${S.length} sentences, ${fmt(dur)} of speech. Marks: ? question · # number · ! strong claim · « story · > turn · ~ filler or restart.\nTimes are the take's own (before the speed).\n\n\`\`\`\n${lines.join("\n")}\n\`\`\`\n`);
console.log(`\n${S.length} sentences · marks: ? question  # number  ! strong claim  « story  > turn  ~ filler or restart\n`);
console.log(lines.join("\n"));
step(RUN, "take", "done", `${S.length} sentences heard`);
console.log(`\n→ take/moments.md. Next: pick the shorts (SKILL.md § 2), write shorts.json, then cut.mjs`);
