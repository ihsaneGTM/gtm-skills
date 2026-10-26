#!/usr/bin/env node
// The filmed take, heard: its sound taken out, transcribed with every word's time, each word's onset and end measured on
// the voice (hear.mjs), cut into sentences, then what the cut needs listed: the sentences of the first 40 s (the hook ends
// on one of them), and the short lines that open a new part (a cutback can take one).
//
//   node take.mjs <run-dir> [--lang en] [--asr whisper|scribe] [--transcript <transcript.json>] [--scribe <scribe.json>]
//
// --lang        the language of the take (default: run.json's). Always given: a model guesses French on an English take
//               said with a French accent, and Whisper then TRANSLATES it.
// --asr         who hears it (default run.json › asr, else whisper):
//               whisper  on the Mac (large-v3, its GPU), free, no key, nothing sent: the default (Ihsane, 2026-10-15)
//               scribe   ElevenLabs Scribe, only when the user has a key and asks for it (it hears brand names a little
//                        better: OPTIMISATION-SKILLS.md › Transcription without a key)
// --transcript  a transcript already made of this very take (take/transcript.json of another run): nothing heard again
// --scribe      a Scribe answer already made for this take (nothing is sent)
// Writes take/audio.mp3 (mono 44.1 kHz: the clone's source too), take/transcript.json ({ engine, model, language, text,
// words: as heard }), take/scribe.json (Scribe only), take/words.json ([{w, s, e}], seconds of the take, measured on the
// voice), take/sentences.json ([{ i, text, s, e, words, next }]: next = the start of the next word).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { whisper, measure, MODEL } from "./hear.mjs";
import { step } from "../../../motion/progress.mjs";
import { ROOT } from "../../../motion/brand.mjs";

const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const RUN = path.resolve(a[0] && !a[0].startsWith("--") ? a[0] : ".");
const run = JSON.parse(fs.readFileSync(path.join(RUN, "run.json"), "utf8"));
const src = path.resolve(ROOT, run.video || "");
if (!run.video || !fs.existsSync(src)) { console.error(`✗ the filmed take is not found: ${run.video || "(run.json has no video)"}`); process.exit(2); }
const lang = opt("lang") || run.language || "en";
const ASR = opt("scribe") ? "scribe" : (opt("asr") || run.asr || "whisper").toLowerCase();
if (!["whisper", "scribe"].includes(ASR)) { console.error(`✗ --asr ${ASR}: whisper or scribe`); process.exit(2); }
const T = path.join(RUN, "take");
fs.mkdirSync(T, { recursive: true });
const probe = (f, what) => String(spawnSync("ffprobe", ["-v", "error", ...what, "-of", "default=nw=1:nk=1", f], { encoding: "utf8" }).stdout).trim();

try {
  step(RUN, "take", "running", "Listening to your take");
  const dur = +probe(src, ["-show_entries", "format=duration"]);
  const vs = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,color_transfer", "-of", "json", src], { encoding: "utf8" }).stdout || "{}").streams?.[0] || {};
  const [w, h, trc] = [vs.width, vs.height, vs.color_transfer || ""], fr = `${Math.round(((n, d) => n / (d || 1))(...String(vs.r_frame_rate || "0/1").split("/").map(Number)))} fps`;
  const audio = path.join(T, "audio.mp3");
  if (!fs.existsSync(audio)) {
    const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", audio], { encoding: "utf8" });
    if (r.status) throw new Error(`the sound could not be taken out: ${String(r.stderr).slice(-200)}`);
  }
  // the words as heard: a transcript of this take already made, else Whisper on the Mac (default), else Scribe
  let heard, engine, text, model;
  const t0 = Date.now();
  if (opt("transcript")) {
    const tr = JSON.parse(fs.readFileSync(path.resolve(opt("transcript")), "utf8"));
    ({ engine, model } = tr); heard = tr.words; text = tr.text;
  } else if (ASR === "scribe") {
    let sc;
    if (opt("scribe")) sc = JSON.parse(fs.readFileSync(path.resolve(opt("scribe")), "utf8"));
    else {
      const { scribe, key } = await import("../../../motion/voice.mjs");
      if (!key()) throw new Error("Scribe needs an ElevenLabs key (ELEVENLABS_API_KEY): without one, leave --asr out and Whisper hears the take on this Mac");
      console.log(`Scribe (${lang}): ${(dur / 60).toFixed(1)} min of take…`);
      sc = await scribe(audio, lang);
    }
    fs.writeFileSync(path.join(T, "scribe.json"), JSON.stringify(sc));
    engine = "scribe"; model = sc.model_id || "scribe_v1"; text = sc.text;
    heard = (sc.words || []).filter(x => x.type === "word" || x.type == null).map(x => ({ w: x.text.trim(), s: +x.start.toFixed(3), e: +x.end.toFixed(3) })).filter(x => x.w);
  } else {
    console.log(`Whisper on this Mac (${lang}, ${MODEL}): ${(dur / 60).toFixed(1)} min of take…`);
    let last = -1;
    const r = await whisper(src, path.join(T, ".whisper.json"), { lang, onProgress: (t, d) => {
      const pc = Math.floor((t / (d || dur || 1)) * 10) * 10;
      if (pc > last) { last = pc; step(RUN, "take", "running", `Listening to your take · ${Math.min(pc, 99)} %`); }
    } });
    fs.rmSync(path.join(T, ".whisper.json"), { force: true });
    engine = "whisper"; model = MODEL; heard = r.words.filter(x => x.w);
  }
  text = text || heard.map(x => x.w).join(" ");
  if (!opt("transcript")) fs.writeFileSync(path.join(T, "transcript.json"), JSON.stringify({ engine, model, language: lang, source: { path: fs.realpathSync(src), size: fs.statSync(src).size }, seconds: Math.round((Date.now() - t0) / 100) / 10, text, words: heard }));
  else if (path.resolve(opt("transcript")) !== path.join(T, "transcript.json")) fs.copyFileSync(path.resolve(opt("transcript")), path.join(T, "transcript.json"));
  // every word's onset and end measured on the voice (hear.mjs): the cuts never trust a model's end of word
  const m = measure(src, heard, path.join(T, ".measure"), { engine });
  const words = m.words;
  console.log(`heard by ${engine}${opt("transcript") ? " (an earlier transcript of this take: nothing heard again)" : ` in ${((Date.now() - t0) / 1000).toFixed(0)} s`} · ${m.summary.replace(/^words-fixed\.json: /, "")}`);
  fs.writeFileSync(path.join(T, "words.json"), JSON.stringify(words));
  // sentences: a word ending on . ? ! closes one. Whisper sometimes leaves a whole 30 s window without a full stop (an
  // 84 s « sentence » on a real take): with it, a pause of 0.35 s or more (measured on the voice) after 10 s without one closes one too
  const sentences = [];
  let cur = [];
  words.forEach((x, i) => {
    cur.push(x);
    const pause = words[i + 1] ? words[i + 1].s - x.e : 0;
    if (/[.?!]["”»)]?$/.test(x.w) || i === words.length - 1 || (engine === "whisper" && pause >= 0.35 && x.e - cur[0].s >= 10)) {
      sentences.push({ i: sentences.length, text: cur.map(y => y.w).join(" "), s: cur[0].s, e: x.e, words: cur.length, next: words[i + 1]?.s ?? null });
      cur = [];
    }
  });
  fs.writeFileSync(path.join(T, "sentences.json"), JSON.stringify(sentences, null, 1) + "\n");
  // the speech: from the first word to the last, its pauses longer than a second left out
  const speech = words.reduce((n, x, i) => n + (x.e - x.s) + (i ? Math.min(Math.max(0, x.s - words[i - 1].e), 1) : 0), 0);
  console.log(`take: ${dur.toFixed(1)} s, ${w}×${h} at ${fr}${/arib-std-b67|smpte2084/.test(trc) ? ` · HDR (${trc}): cut.mjs tone-maps it to SDR` : ""} · ${words.length} words, ${sentences.length} sentences, ${(speech / 60).toFixed(1)} min of speech${speech < 180 ? "  ⚠ under 3 min: a clone made from it will be thin" : ""}`);
  console.log(`heard: ${text}`);
  console.log("\nThe first 40 s (the hook ends at the end of one of these; the intro is cut there):");
  for (const x of sentences.filter(y => y.s < 40)) console.log(`  #${String(x.i).padStart(2)}  ${x.s.toFixed(2).padStart(6)} → ${x.e.toFixed(2).padStart(6)} s  ${x.text}`);
  const opens = sentences.filter(x => x.s >= 40 && x.words <= 12 && (/\?$/.test(x.text) || /^(so|now|okay|ok|alright|but|and now|let's)\b/i.test(x.text)));
  if (opens.length) {
    console.log("\nShort lines that open a part (a cutback can take one):");
    for (const x of opens) console.log(`  #${String(x.i).padStart(2)}  ${x.s.toFixed(2).padStart(6)} → ${x.e.toFixed(2).padStart(6)} s  ${x.text}`);
  }
  step(RUN, "take", "done", `${Math.round(dur)} s of take, ${sentences.length} sentences`);
} catch (e) {
  step(RUN, "take", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
