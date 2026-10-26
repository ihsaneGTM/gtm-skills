#!/usr/bin/env node
// Your versions, read aloud: you hear each one instead of reading it (Ihsane, 2026-10-07: "j'ai la
// flemme de lire, donc avec ElevenLabs il me fait directement l'audio").
//
//   node voice.mjs <memo>                     every version without its audio yet
//   node voice.mjs <memo> --short s2 [--version 3] [--again]
//   node voice.mjs --check                    is a voice ready (key and voice id), without spending anything
//
// ElevenLabs text-to-speech, with the voice and the model of workspace/studio/profile.json (voice.voiceId,
// voice.model); the key is ELEVENLABS_API_KEY, from the environment or .env.local, never printed. Each
// version becomes audio/<short>-v<n>.mp3 and memo.json says so (versions[].audio). Billed by ElevenLabs
// to your account, per character read: the script prints how many it sends before it sends them.
import fs from "node:fs";
import path from "node:path";
import { ROOT, memoDir, readJSON, writeJSON, profile, ensureProfile, rel } from "./lib.mjs";

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : null; };

function key() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  try {
    for (const l of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = l.match(/^\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*(.*)\s*$/);
      if (m) return m[1].replace(/^(['"])(.*)\1$/, "$2").trim();
    }
  } catch {}
  return "";
}
const P = profile() || ensureProfile();
const voice = P.voice || {};
const ready = () => !!key() && !!voice.voiceId;

if (args[0] === "--check") {
  console.log(JSON.stringify({ key: !!key(), voiceId: !!voice.voiceId, model: voice.model || null, ready: ready() }));
  process.exit(ready() ? 0 : 1);
}
if (!key()) { console.error("No ElevenLabs key: add ELEVENLABS_API_KEY in .env.local (Settings › Connectors › Add key, in the app)."); process.exit(3); }
if (!voice.voiceId) { console.error(`No voice yet: set voice.voiceId in ${rel(path.join(ROOT, "workspace", "studio", "profile.json"))} (your own voice cloned in ElevenLabs is best).`); process.exit(3); }

const dir = memoDir(args[0]);
const file = path.join(dir, "memo.json");
const M = readJSON(file);
if (!M) { console.error(`no memo.json in ${rel(dir)}`); process.exit(2); }
const onlyShort = flag("--short"), onlyV = flag("--version") ? +flag("--version") : null, again = args.includes("--again");
const jobs = [];
for (const s of M.shorts || []) for (const v of s.versions || []) {
  if (onlyShort && s.id !== onlyShort) continue;
  if (onlyV && v.n !== onlyV) continue;
  const out = path.join(dir, "audio", `${s.id}-v${v.n}.mp3`);
  if (!again && fs.existsSync(out)) continue;
  if (v.script) jobs.push({ s, v, out });
}
if (!jobs.length) { console.log("Every version has its audio already (--again to make it again)."); process.exit(0); }
const chars = jobs.reduce((a, j) => a + j.v.script.length, 0);
console.log(`${jobs.length} version${jobs.length > 1 ? "s" : ""} to read, ${chars} characters, voice ${voice.voiceId}, model ${voice.model}`);
fs.mkdirSync(path.join(dir, "audio"), { recursive: true });

const status = path.join(dir, "voice.json");
const st = { state: "running", startedAt: Date.now(), total: jobs.length, done: 0, chars, error: null };
writeJSON(status, st);
let failed = 0;
for (const j of jobs) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice.voiceId)}?output_format=mp3_44100_128`;
  let ok = false, why = "";
  for (let t = 0; t < 3 && !ok; t++) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "xi-api-key": key(), "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text: j.v.script, model_id: voice.model || "eleven_v4", ...(voice.settings ? { voice_settings: voice.settings } : {}) }),
      });
      if (!r.ok) { why = `ElevenLabs answered ${r.status}: ${(await r.text()).slice(0, 200)}`; if (r.status < 500 && r.status !== 429) break; await new Promise(z => setTimeout(z, 1500 * (t + 1))); continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1000) { why = "an empty answer"; continue; }
      fs.writeFileSync(`${j.out}.part`, buf); fs.renameSync(`${j.out}.part`, j.out);
      ok = true;
    } catch (e) { why = e.message; await new Promise(z => setTimeout(z, 1500 * (t + 1))); }
  }
  // memo.json may have moved on while this ran (a pick, a text edited): read it again, then mark
  const now = readJSON(file);
  const v = now?.shorts?.find(x => x.id === j.s.id)?.versions?.find(x => x.n === j.v.n);
  if (v) {
    if (ok) { v.audio = rel(j.out).replace(/^workspace\/memos\/[^/]+\//, ""); v.audioOf = j.v.script.length; delete v.audioError; }
    else v.audioError = why;
    writeJSON(file, now);
  }
  if (ok) { st.done += 1; console.log(`${j.s.id} v${j.v.n} · ${rel(j.out)}`); } else { failed += 1; console.error(`${j.s.id} v${j.v.n} · failed: ${why}`); }
  writeJSON(status, st);
}
st.state = failed ? (st.done ? "partial" : "error") : "done"; st.doneAt = Date.now(); st.error = failed ? `${failed} could not be read` : null;
writeJSON(status, st);
process.exit(failed && !st.done ? 1 : 0);
