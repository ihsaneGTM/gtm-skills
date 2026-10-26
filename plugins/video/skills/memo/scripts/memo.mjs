#!/usr/bin/env node
// The memo skill's tools: read the memo, see what you already made, check what was written.
//
//   node memo.mjs profile                 your memo profile (made from its template the first time) and your pace
//   node memo.mjs read <memo> [--from 1:20] [--to 3:05]   the memo, one sentence a line, [m:ss] before each
//   node memo.mjs past [<memo>]           what you already have (other memos' shorts, scripts, finished videos):
//                                         the only things a "link" feedback may point to
//   node memo.mjs check <memo>            memo.json checked and measured: every version's length at your pace,
//                                         the lead magnet in every version, the quotes found in the memo, the
//                                         ranges inside it, at most 3 feedbacks, links that exist. Exit 1 if not.
//
// <memo> is its folder (workspace/memos/<slug>) or its slug.
import fs from "node:fs";
import path from "node:path";
import { MEMOS, ROOT, memoDir, readJSON, writeJSON, ensureProfile, profile, pace, countWords, mmss, rel, bigWords, sentencesOf } from "./lib.mjs";

const [cmd, arg, ...rest] = process.argv.slice(2);
const flag = n => { const i = rest.indexOf(n); return i > -1 ? rest[i + 1] : null; };
const secs = v => { if (v == null) return null; const m = /^(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(v); return m ? +m[1] * 60 + +m[2] : +v; };
const norm = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
// a script is laid out as it is said, for the teleprompter: the hook alone, then its beats (one idea
// each, 4 sentences at most), a blank line between two beats, a sentence a line (references/versions.md)
function beatsOk(script, hook, where, err) {
  const B = String(script || "").trim().split(/\n\s*\n/).map(b => sentencesOf(b));
  if (countWords(script) > 40 && B.length < 2) return err(where, "written in beats: the hook alone, then a blank line between two beats, a sentence a line (the teleprompter shows them)");
  if (hook && B.length > 1 && norm(B[0].join(" ")) !== norm(hook)) err(where, "the hook alone in the first beat, a blank line after it");
  B.forEach((b, i) => { if (b.length > 4) err(where, `beat ${i + 1} holds ${b.length} sentences: 4 at most, cut it where the talk turns`); });
}

if (cmd === "profile") {
  const p = ensureProfile(), pc = pace();
  console.log(JSON.stringify(p, null, 1));
  console.log(`\npace: ${pc.wps} words a second · ${pc.measured ? `measured on ${pc.on}` : pc.on}`);
  process.exit(0);
}

if (cmd === "read") {
  const dir = memoDir(arg);
  const segs = readJSON(path.join(dir, "segments.json"));
  if (!segs) { console.error("not prepared yet: run prepare.mjs first"); process.exit(2); }
  const a = secs(flag("--from")) ?? 0, b = secs(flag("--to")) ?? Infinity;
  const m = readJSON(path.join(dir, "media.json")) || {};
  console.log(`${rel(dir)} · ${mmss(m.duration || 0)} · ${segs.length} sentences${m.recordedAt ? ` · recorded ${m.recordedAt}` : ""}\n`);
  for (const s of segs) if (s.end > a && s.start < b) console.log(`[${mmss(s.start)}–${mmss(s.end)}] ${s.text}`);
  process.exit(0);
}

// what you already have: the shorts of your other memos, the scripts of the script writer, the
// finished videos. An id each, so a feedback can point to one; nothing else exists for it.
function past(except) {
  const out = [];
  try {
    for (const d of fs.readdirSync(MEMOS, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === except) continue;
      const j = readJSON(path.join(MEMOS, d.name, "memo.json"));
      for (const s of j?.shorts || []) out.push({ id: `memo:${d.name}/${s.id}`, kind: "short", title: s.title, core: s.core || "" });
    }
  } catch {}
  try {
    const dir = path.join(ROOT, "workspace", "ideas", "scripts");
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
      const j = readJSON(path.join(dir, f));
      if (j?.title) out.push({ id: `script:${f.replace(/\.json$/, "")}`, kind: "script", title: j.title, core: j.idea?.line || j.line || "" });
    }
  } catch {}
  try {
    const dir = path.join(ROOT, "workspace", "videos");
    for (const f of fs.readdirSync(dir).filter(f => /\.(mp4|mov)$/i.test(f))) out.push({ id: `video:${f}`, kind: "video", title: f.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), core: "" });
  } catch {}
  return out;
}
if (cmd === "past") {
  const l = past(arg ? path.basename(arg) : null);
  if (!l.length) console.log("Nothing yet: no other memo, script or finished video. A link feedback has nothing to point to.");
  for (const x of l) console.log(`${x.id}\n  ${x.title}${x.core ? ` — ${x.core}` : ""}`);
  process.exit(0);
}

if (cmd === "check") {
  const dir = memoDir(arg), slug = path.basename(dir);
  const M = readJSON(path.join(dir, "memo.json"));
  if (!M) { console.error(`no memo.json in ${rel(dir)}`); process.exit(2); }
  const P = profile() || ensureProfile(), pc = pace();
  const media = readJSON(path.join(dir, "media.json")) || {};
  const segs = readJSON(path.join(dir, "segments.json"), []);
  const errors = [], notes = [];
  const err = (where, m) => errors.push(`${where}: ${m}`);
  const lm = (P.leadMagnet?.keywords?.length ? P.leadMagnet.keywords : [P.leadMagnet?.line || ""]).map(norm).filter(Boolean);
  const ids = new Set(past(slug).map(x => x.id));
  const lo = P.lengths?.min ?? 30, hi = P.lengths?.max ?? 180;
  if (!M.title) err("memo", "a title");
  // the cut is a proposal: shorts, and the whole memo as one long video; a cut the user asked for
  // ("custom": true) may be one long video only, or parts longer than a short
  if (!Array.isArray(M.shorts) || (!M.shorts.length && !M.custom)) err("memo", "at least one short (or \"custom\": true when the user asked for the long video only)");
  if ((M.shorts || []).length > 12) err("memo", "12 shorts at most in one memo");
  if (M.first != null && !(M.shorts || []).some(s => s.id === M.first)) err("memo", `first names a short it does not have: ${JSON.stringify(M.first)}`);
  // what a video really brings: its strong arguments, said plainly (2 to 4), the shorts' and the long one's
  const argsOk = (a, where) => {
    if (!Array.isArray(a) || a.length < 2 || a.length > 4) return err(where, "arguments: the 2 to 4 strong arguments of the video, { point, why }");
    for (const x of a) { if (!x?.point) err(where, "an argument says its point in one line"); if (!x?.why) err(where, `the argument « ${x?.point || "?"} » says why it is worth hearing`); }
  };
  const seen = new Set();
  for (const [i, s] of (M.shorts || []).entries()) {
    const w = `short ${s?.id || i + 1}`;
    if (!/^s\d{1,2}$/.test(s?.id || "")) err(w, `an id s1, s2… (got ${JSON.stringify(s?.id)})`);
    if (seen.has(s.id)) err(w, "two shorts with the same id"); seen.add(s.id);
    if (!s.title || s.title.length > 80) err(w, "a title of 80 signs at most");
    if (!s.core) err(w, "its core: the point, in one sentence");
    // where it comes from in the memo: real ranges, and quotes the memo really holds
    if (!Array.isArray(s.from) || !s.from.length) err(w, "from: the ranges of the memo it comes from");
    for (const r of s.from || []) {
      if (!(r && r.start >= 0 && r.end > r.start && (!media.duration || r.end <= media.duration + 0.5))) err(w, `a range outside the memo: ${JSON.stringify(r)}`);
    }
    const said = norm((s.from || []).map(r => segs.filter(x => x.end > r.start - 2 && x.start < r.end + 2).map(x => x.text).join(" ")).join(" "));
    for (const q of s.quotes || []) {
      const qw = norm(q).split(" ").filter(x => x.length > 2);
      const found = qw.filter(x => said.includes(x)).length;
      if (qw.length && found / qw.length < 0.7) err(w, `a quote the memo does not hold in its ranges: « ${q} »`);
    }
    // what the video really brings: its strong arguments, said plainly (2 to 4), and its lead magnet
    argsOk(s.arguments, w);
    const mg = s.magnet;
    if (P.leadMagnet?.line && (!mg?.offer || !mg?.line)) err(w, "magnet: the lead magnet of this video, { offer, line } (the profile's, or one that fits it better)");
    // the words that must be said: the video's own lead magnet, else the profile's
    const lmS = (mg?.keywords?.length ? mg.keywords : null)?.map(norm).filter(Boolean) || lm;
    // three versions, each one measured at your pace, each one ending on the lead magnet
    if (!Array.isArray(s.versions) || s.versions.length !== 3) err(w, "exactly 3 versions");
    const missing = [];
    for (const v of s.versions || []) {
      const vw = `${w} v${v?.n}`;
      if (![1, 2, 3].includes(v?.n)) err(vw, "n is 1, 2 or 3");
      if (!v.name) err(vw, "a name (Straight, Hook first, Story…)");
      if (!v.hook) err(vw, "its hook: the first line said");
      if (!v.script) err(vw, "its script: everything said, the hook first");
      if (v.script && v.hook && !norm(v.script).startsWith(norm(v.hook).slice(0, 24))) err(vw, "the script starts with its hook");
      const n = countWords(v.script);
      v.words = n; v.seconds = Math.round((n / pc.wps) * 10) / 10;
      if (v.seconds < lo * 0.8) notes.push(`${vw}: ${v.seconds} s, short for a ${lo}–${hi} s short`);
      if (v.seconds > hi) (M.custom ? notes : { push: m => err(vw, m) }).push(M.custom ? `${vw}: ${v.seconds} s, longer than a short (the cut you asked for)` : `${v.seconds} s at your pace: more than ${hi} s`);
      // said like to a friend, in simple words (plugins/video/references/how-you-talk.md)
      if (P.speaker?.english !== "native") for (const b of bigWords(v.script)) err(vw, `« ${b.word} »: too big a word to say, use « ${b.use} »`);
      beatsOk(v.script, v.hook, vw, err);
      for (const x of sentencesOf(v.script)) if (countWords(x) > 16) err(vw, `a sentence of ${countWords(x)} words, split it: « ${x.slice(0, 60)}… »`);
      const hook = countWords(v.hook);
      if (hook > 22) err(vw, `a hook of ${hook} words: 22 at most (about 6 s)`);
      if (lmS.length && !lmS.some(k => norm(v.script).includes(k))) missing.push(v.n);
    }
    s.leadMagnet = { ok: !missing.length, missing, line: mg?.line || P.leadMagnet?.line || null, offer: mg?.offer || null, proposed: !!mg?.proposed };
    if (missing.length) err(w, `the lead magnet is missing from version${missing.length > 1 ? "s" : ""} ${missing.join(", ")} (it must say: ${mg?.keywords?.join(" / ") || P.leadMagnet?.keywords?.join(" / ") || P.leadMagnet?.line})`);
    // two or three feedbacks at most: an idea to add, a big inconsistency, a link to what you made
    if ((s.feedback || []).length > (P.feedbackMax ?? 3)) err(w, `${s.feedback.length} feedbacks: ${P.feedbackMax ?? 3} at most`);
    for (const f of s.feedback || []) {
      if (!["add", "consistency", "link"].includes(f.kind)) err(w, `a feedback of an unknown kind: ${f.kind}`);
      if (!f.text) err(w, "a feedback says something");
      if (f.kind === "link" && !ids.has(f.to)) err(w, `a link to ${JSON.stringify(f.to)}, which is not in memo.mjs past`);
    }
  }
  M.measured = { wps: pc.wps, pace: pc.measured ? `your pace, ${pc.wps} words a second, measured on ${pc.on}` : pc.on, at: new Date().toISOString() };
  // the long version: the whole memo, one video, every point in its order
  const L = M.long;
  if (!L?.script) err("long", "the whole memo as one long video: { title, hook, script }");
  else {
    if (!L.title) err("long", "a title");
    argsOk(L.arguments, "long");
    if (P.leadMagnet?.line && (!L.magnet?.offer || !L.magnet?.line)) err("long", "magnet: its lead magnet, { offer, line }");
    if (!L.hook) err("long", "its hook: the first line said");
    else if (!norm(L.script).startsWith(norm(L.hook).slice(0, 24))) err("long", "the script starts with its hook");
    L.words = countWords(L.script); L.seconds = Math.round((L.words / pc.wps) * 10) / 10;
    if (lm.length && !lm.some(k => norm(L.script).includes(k))) err("long", "the lead magnet is missing");
    if (P.speaker?.english !== "native") for (const b of bigWords(L.script)) err("long", `« ${b.word} »: too big a word to say, use « ${b.use} »`);
    beatsOk(L.script, L.hook, "long", err);
    for (const x of sentencesOf(L.script)) if (countWords(x) > 16) err("long", `a sentence of ${countWords(x)} words, split it: « ${x.slice(0, 60)}… »`);
  }
  M.checked = errors.length ? null : new Date().toISOString();
  M.memo = { slug, duration: media.duration || null, recordedAt: media.recordedAt || null, language: readJSON(path.join(dir, "prepare.json"))?.steps?.words?.language || null };
  writeJSON(path.join(dir, "memo.json"), M);
  for (const s of M.shorts || []) console.log(`${s.id} · ${s.title} · ${(s.versions || []).map(v => `v${v.n} ${v.seconds} s`).join(", ")} · ${!s.leadMagnet?.line ? "no lead magnet" : `lead magnet ${s.leadMagnet?.ok ? "in every version" : "MISSING"}`} · ${(s.feedback || []).length} feedback`);
  for (const n of notes) console.log(`note: ${n}`);
  if (errors.length) { console.error(`\n${errors.length} to fix:\n- ${errors.join("\n- ")}`); process.exit(1); }
  if (M.long?.seconds) console.log(`long · ${M.long.title} · ${M.long.seconds} s`);
  console.log(`\nchecked: ${M.shorts.length} short${M.shorts.length > 1 ? "s" : ""}, measured at ${M.measured.pace}`);
  process.exit(0);
}

console.error("usage: memo.mjs profile | read <memo> [--from m:ss] [--to m:ss] | past [<memo>] | check <memo>");
process.exit(2);
