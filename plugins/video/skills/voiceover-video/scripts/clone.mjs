#!/usr/bin/env node
// The user's cloned voice (an ElevenLabs instant voice clone), made ONCE and kept for every video in
// workspace/motion/profile.json › voiceClone = { id, name, model, language, prefix, stability, similarity }.
//
//   node clone.mjs <run-dir> [--name "<their name> (GTM)"] [--prefix "<tag> "] [--language en]
//                            → the clone made from the take's sound (take/audio.mp3, 3 minutes of speech or more)
//   node clone.mjs <run-dir> --use <voice_id> [--name …] [--prefix …] [--similarity 0.85]
//                            → a clone the user already has, kept as theirs (nothing is sent)
//   node clone.mjs --show    → the clone kept, if any
//   node clone.mjs --choices → the voices this user can pick (JSON): clone, premade, pipecorn (offered once voices.json has
//                            its ids), and the one kept
//   node clone.mjs <run-dir> --premade <voice_id> --name "Brian"   → an ElevenLabs default voice, kept (nothing sent)
//   node clone.mjs <run-dir> --pipecorn  → Ihsane's voice (« Ihsane · Pipecorn »): the voice shared from Ihsane's account
//                            added to the user's own (POST /v1/voices/add/{public_user_id}/{voice_id}, their key), with
//                            its prefix and settings (voices.json); free, no character read
//   --dry: says the request it would send (no key needed, nothing sent)
//
// The choice is the user's, on their first video (run.json › voice: "clone" | "premade" | "pipecorn"; asked in Claude
// Code): their own clone by default. profile.json › voiceClone › kind says which one is kept; another choice replaces it.
//
// Never a second clone: when the profile has one, it is used (every vo/part-<n>/vo.json of the run gets it) and nothing
// is sent.
// --prefix: a play tag put before every text the clone reads, e.g. "[French accent] " for a user who wants their accent
// kept. Personal: empty unless the user asks for it.
// Settings settled 2026-10-12 on a real case: eleven_v4, stability 0.5, similarity 0.85, the language of the video.
// The key: ELEVENLABS_API_KEY (environment or .env.local), never printed. The account must allow instant voice
// cloning (ElevenLabs' Starter plan or above).
import fs from "node:fs";
import path from "node:path";
import { key } from "../../../motion/voice.mjs";
import { profile, setProfile } from "../../../motion/brand.mjs";
import { step } from "../../../motion/progress.mjs";
import { fileURLToPath } from "node:url";

const a = process.argv.slice(2);
const opt = (k, d = null) => { const i = a.indexOf("--" + k); return i < 0 ? d : a[i + 1]; };
const has = (k) => a.includes("--" + k);
if (has("show")) { console.log(JSON.stringify(profile().voiceClone || null, null, 1)); process.exit(0); }
const VOICES = (() => { try { return JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "voices.json"), "utf8")); } catch { return {}; } })();
const PC = VOICES.pipecorn || {};
const pipecornReady = !!(PC.publicUserId && PC.voiceId);
if (has("choices")) {
  const kept = profile().voiceClone;
  console.log(JSON.stringify({
    clone: { name: "Your own voice, cloned from your take", needs: "an ElevenLabs plan that allows Instant Voice Cloning (Starter or above)" },
    premade: { name: "A voice of ElevenLabs", needs: "any ElevenLabs plan" },
    pipecorn: pipecornReady ? { name: PC.name, needs: "a paid ElevenLabs plan (a shared voice is not available to free accounts through the API)" } : null,
    kept: kept?.id ? { kind: kept.kind || "clone", name: kept.name } : null,
  }, null, 1));
  process.exit(0);
}
const DRY = has("dry");
const RUN = a[0] && !a[0].startsWith("--") ? path.resolve(a[0]) : null;
const readJSON = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return d; } };
const run = RUN ? readJSON(path.join(RUN, "run.json"), {}) : {};

// the run's voices: the clone, its settings, its prefix in every part's vo.json (vo/part-<n>/; part 1 at least); their
// text is each part's script, written after
function intoRun(vc) {
  if (!RUN) return;
  const VO = path.join(RUN, "vo");
  const parts = fs.existsSync(VO) ? fs.readdirSync(VO).filter(d => /^part-\d+$/.test(d)) : [];
  for (const d of parts.length ? parts : ["part-1"]) {
    const f = path.join(VO, d, "vo.json"), vo = readJSON(f, {});
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify({ seed: 7, text: "", say: {}, pauses: [], ...vo, voice: vc.id, voice_name: vc.name, model: vc.model, stability: vc.stability, similarity: vc.similarity, language: vc.language, prefix: vc.prefix || "" }, null, 1) + "\n");
  }
}

try {
  const kept = profile().voiceClone;
  const want = has("pipecorn") ? "pipecorn" : has("premade") ? "premade" : has("use") ? "use" : "clone";
  // the voice kept is used when it is the one asked for (a shared voice is never added twice to the account)
  if (kept?.id && ["clone", "pipecorn"].includes(want) && (kept.kind || "clone") === want) {
    intoRun(kept);
    if (RUN) step(RUN, "voice", "running", `Your voice: ${kept.name || kept.id}`);
    console.log(`your clone is kept already: « ${kept.name || kept.id} » (${kept.id}), ${kept.model}, ${kept.language}${kept.prefix ? `, prefix ${JSON.stringify(kept.prefix)}` : ""}: nothing sent${RUN ? " · vo/part-<n>/vo.json have it" : ""}`);
    process.exit(0);
  }
  const base = {
    model: opt("model", "eleven_v4"), language: opt("language", run.language || "en"), prefix: opt("prefix", ""),
    stability: +opt("stability", 0.5), similarity: +opt("similarity", 0.85),
  };
  let vc;
  if (want === "use") {
    vc = { id: opt("use"), name: opt("name", "Your voice"), kind: "clone", ...base };
  } else if (want === "premade") {
    if (!opt("premade")) throw new Error("--premade <voice_id> (one of the account's default voices: voice.mjs voices)");
    vc = { id: opt("premade"), name: opt("name", "ElevenLabs voice"), kind: "premade", ...base, similarity: +opt("similarity", 0.8) };
  } else if (want === "pipecorn") {
    if (!pipecornReady) throw new Error("Ihsane's voice is not available yet (voices.json has no shared voice): pick your own clone or an ElevenLabs voice");
    const url = `https://api.elevenlabs.io/v1/voices/add/${encodeURIComponent(PC.publicUserId)}/${encodeURIComponent(PC.voiceId)}`;
    const p = { model: PC.model || "eleven_v4", language: opt("language", run.language || PC.language || "en"), prefix: PC.prefix ?? "", stability: PC.stability ?? 0.5, similarity: PC.similarity ?? 0.85 };
    if (DRY) { console.log(`dry run: POST ${url} {"new_name": ${JSON.stringify(PC.name)}} with your key; then kept as « ${PC.name} », ${p.model}, prefix ${JSON.stringify(p.prefix)}`); process.exit(0); }
    const k = key();
    if (!k) throw new Error("No ElevenLabs key: add ELEVENLABS_API_KEY in .env.local (in the app: Settings › Connectors › Add key).");
    const r = await fetch(url, { method: "POST", headers: { "xi-api-key": k, "Content-Type": "application/json" }, body: JSON.stringify({ new_name: PC.name }), signal: AbortSignal.timeout(60000) });
    const body = await r.text();
    if (!r.ok) throw new Error(`ElevenLabs refused to add Ihsane's voice: HTTP ${r.status} ${body.slice(0, 240)}${r.status === 401 || r.status === 403 ? " (a free account cannot use a shared voice through the API)" : ""}`);
    vc = { id: JSON.parse(body).voice_id, name: PC.name, kind: "pipecorn", ...base, ...p };
  } else {
    if (!RUN) throw new Error("the run's folder is needed: its take's sound makes the clone");
    const audio = path.join(RUN, "take", "audio.mp3");
    if (!fs.existsSync(audio)) throw new Error("take/audio.mp3 is missing: take.mjs first");
    const words = readJSON(path.join(RUN, "take", "words.json"), []);
    const speech = words.reduce((n, x, i) => n + (x.e - x.s) + (i ? Math.min(Math.max(0, x.s - words[i - 1].e), 1) : 0), 0);
    if (speech < 60) throw new Error(`only ${Math.round(speech)} s of speech in the take: a clone needs 3 minutes (1 at the very least)`);
    if (speech < 180) console.log(`⚠ ${Math.round(speech)} s of speech: under 3 minutes, the clone will sound less like the user`);
    if (DRY) { console.log(`dry run: POST https://api.elevenlabs.io/v1/voices/add (multipart: name, take/audio.mp3, ${Math.round(speech)} s of speech) with your key; then kept as your clone`); process.exit(0); }
    const k = key();
    if (!k) throw new Error("No ElevenLabs key: add ELEVENLABS_API_KEY in .env.local (in the app: Settings › Connectors › Add key).");
    const name = opt("name", "My voice (GTM by Pipecorn)");
    const form = new FormData();
    form.set("name", name);
    form.set("description", `Instant clone made by GTM by Pipecorn from ${path.basename(run.video || "a filmed take")}`);
    form.set("remove_background_noise", "false");
    form.set("files", new Blob([fs.readFileSync(audio)], { type: "audio/mpeg" }), "voice.mp3");
    const r = await fetch("https://api.elevenlabs.io/v1/voices/add", { method: "POST", headers: { "xi-api-key": k }, body: form, signal: AbortSignal.timeout(300000) });
    const body = await r.text();
    if (!r.ok) throw new Error(`ElevenLabs refused the clone: HTTP ${r.status} ${body.slice(0, 240)}${r.status === 401 || r.status === 403 ? " (your ElevenLabs plan does not allow Instant Voice Cloning: Starter or above, or pick an ElevenLabs voice)" : ""}`);
    vc = { id: JSON.parse(body).voice_id, name, kind: "clone", ...base };
  }
  vc.at = new Date().toISOString().slice(0, 10);
  setProfile({ voiceClone: vc });
  intoRun(vc);
  if (RUN) step(RUN, "voice", "running", `Your voice: ${vc.name}`);
  console.log(`${vc.kind === "clone" ? "clone" : "voice"} kept for every video: « ${vc.name} » (${vc.id}), ${vc.model}, ${vc.language}, stability ${vc.stability}, similarity ${vc.similarity}${vc.prefix ? `, prefix ${JSON.stringify(vc.prefix)}` : ""} → workspace/motion/profile.json › voiceClone`);
} catch (e) {
  if (RUN) step(RUN, "voice", "failed", String(e.message).slice(0, 160));
  console.error(`✗ ${e.message}`);
  process.exitCode = 1;
}
