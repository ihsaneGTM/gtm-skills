// THE CALL'S DATA — shared by plan.mjs, edl.mjs and the figures of this skill.
//
// Three clocks, and every time in a project lives on one of them:
//   RAW       the source as shot: words.json, assets/words-fixed.json, the turns
//   ASSEMBLY  source/assembly.mov (assemble.py): the hook, the ringing, then the call
//   OUTPUT    the assembly played at project.json `speed`: the camera, the beats, the cues
//
// project.json `assembly` (raw seconds, except `gap`):
//   hookFrom / hookTo   the hook's VOICE: the most suspenseful line of the call, from its
//                       first breath to the measured end of its last syllable (+40 ms)
//   hookVideoTo         its PICTURE may run on past the voice (never a freeze under the text)
//   gap                 the ringing, in ASSEMBLY seconds (2.18 s of output, × speed)
//   resume              where the call starts (0, or past a hook already copied at the head
//                       of the source, as on the reference take)
//   end                 where the call ends (null: the end of the source)
//   breathe             output seconds between the end of the hook line and the sheet (0.15)
import fs from "node:fs";
import path from "node:path";

const r3 = x => +x.toFixed(3);
export const RINGBACK = { dur: 1.4633, tones: [[0, 0.80], [1.18, 1.4633]] };   // sounds.py writes it

export function project(file = "project.json") {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"));
}

// the two voices: A is the caller (the user's side, yellow), B is the person called (white)
export function speakers(P = project()) {
  const S = P.speakers ?? {};
  return {
    names: { A: (S.A?.name ?? "ME").toUpperCase(), B: (S.B?.name ?? "PROSPECT").toUpperCase() },
    colors: { A: S.A?.color ?? "#FFD90D", B: S.B?.color ?? "rgba(255,255,255,.90)" },
    label: { A: S.A?.label ?? "rgba(255,217,13,1)", B: S.B?.label ?? "rgba(255,255,255,.80)" },
  };
}

export function timeline(P = project()) {
  const A = P.assembly;
  if (!A) throw new Error("project.json has no `assembly`: choose the hook, then run assemble.py (SKILL.md § 4)");
  const SP = P.speed ?? 1;
  const hookLen = A.hookTo - A.hookFrom;
  const atHook = t => r3((t - A.hookFrom) / SP);
  const at = t => r3((t - A.resume + hookLen + A.gap) / SP);
  const HOOK_END = r3(hookLen / SP);
  const C0 = r3((hookLen + A.gap) / SP);                       // BAM: the call starts
  const PLATE_AT = r3(HOOK_END + (A.breathe ?? 0.15));          // the ringing sheet drops
  const RING_AT = r3(C0 - RINGBACK.dur);                        // the ringback ENDS on the bam
  const RINGS = RINGBACK.tones.map(([a, b]) => [r3(RING_AT + a), r3(Math.min(C0, RING_AT + b))]);
  const inHook = t => t >= A.hookFrom - 1e-6 && t < A.hookTo;
  const inCall = t => t >= A.resume - 1e-6 && (A.end == null || t < A.end);
  return { A, SP, hookLen, at, atHook, HOOK_END, C0, PLATE_AT, RING_AT, RINGS, END: P.duration, inHook, inCall };
}

// the words, their measured onsets (assets/words-fixed.json, onsets.py, with the onsets
// pinned by hand in project.json `onsetFix`) and who said them (diarize.py, speakerFix).
// FIX overrides an onset for one look only (a comparison): { index: raw seconds }.
export function words(FIX = {}, file = "assets/words-fixed.json") {
  const D = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"));
  const W = D.words;
  const on = i => {
    if (FIX[i] != null) return FIX[i];
    if (!W[i]) throw new Error(`word ${i} does not exist (words.json has ${W.length})`);
    return W[i].a;
  };
  return { W, on, who: i => W[i].who, turns: D.turns ?? [] };
}

// the voice levels per OUTPUT frame, one array per side (levels.py → assets/call.json)
export function loadLevels(file = "assets/call.json") {
  const d = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), file), "utf8"));
  const val = (arr, t) => {
    const f = t * d.fps; if (f <= 0) return arr[0] ?? 0;
    const i = Math.floor(f), u = f - i;
    if (i + 1 >= arr.length) return arr[arr.length - 1] ?? 0;
    return arr[i] + (arr[i + 1] - arr[i]) * u;
  };
  return { ...d, A: t => val(d.a, t), B: t => val(d.b, t) };
}

// dialogue.json (dialogue.mjs --draft, then read and mended) → utterances on the OUTPUT
// clock: one per turn, { who, session, words: [{ i, disp, t }], from, to }. Session 0 is the
// hook, session 1 the call: the record starts again at the bam.
export function utterances(D, { tl, on, end }) {
  const mk = (turns, map, session) => (turns ?? []).filter(u => u.words?.length).map(u => {
    const ws = u.words.map(([i, text]) => ({ i, disp: String(text), t: map(on(i)) })).sort((a, b) => a.t - b.t);
    return { who: u.who, session, words: ws, from: r3(ws[0].t - 0.02) };
  });
  const H = mk(D.hook, tl.atHook, 0), Cc = mk(D.call, tl.at, 1);
  // a line is on until the next one starts; the hook's last one stays until the sheet
  // covers it, the call's last one until the end
  H.forEach((u, i) => { u.to = H[i + 1] ? r3(H[i + 1].from + 0.06) : r3(tl.PLATE_AT + 0.30); });
  Cc.forEach((u, i) => { u.to = Cc[i + 1] ? r3(Cc[i + 1].from + 0.06) : r3(end); });
  return [...H, ...Cc];
}
