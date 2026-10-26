// THE HOOK'S GLITCH BURSTS — assets/hookfx.json, read by assemble.py (the footage), plan.mjs
// (the camera's jolts, the lettering) and edl.mjs.
//
//   node bursts.mjs 1:0.8 6:1 10:0.6 12@3.22:1
//
// One burst per STRESSED word of the hook line — `index:strength[:duration]`, the strength
// 0.6-1.1 (1 is the line's key word), the duration 0.19 s by default; `index@onset` when the
// word's onset is pinned in plan.mjs FIX — plus the break into the sheet, always (from the
// end of the line to just before the sheet drops, strength 1.1). Each burst starts 13 ms
// before its word, on the OUTPUT clock. On the reference: WHERE · NUMBER? · NUMBER · NOT,
// then the break. Four or five bursts in a 3-4 s line; more and it stops reading as a
// line that breaks up and becomes noise.
import fs from "node:fs";
const { timeline, words } = await import(new URL("./call.mjs", import.meta.url).href);

const args = process.argv.slice(2);
if (!args.length) { console.error("which words? node bursts.mjs <index>:<strength>[:<duration>] …"); process.exit(1); }
const TL = timeline();
const { on } = words();
const r2 = x => Math.round(x * 100) / 100;
const bursts = args.map(s => {
  const m = s.match(/^(\d+)(?:@([\d.]+))?:([\d.]+)(?::([\d.]+))?$/);
  if (!m) { console.error(`not a burst: ${s} (index[@onset]:strength[:duration])`); process.exit(1); }
  const i = +m[1], t = TL.atHook(m[2] != null ? +m[2] : on(i)), dur = m[4] != null ? +m[4] : 0.19;
  if (t < 0 || t > TL.HOOK_END) { console.error(`word ${i} is not in the hook (${t.toFixed(2)} s of output)`); process.exit(1); }
  return [r2(Math.max(0, t - 0.013)), r2(t - 0.013 + dur), +m[3]];
});
bursts.push([r2(TL.HOOK_END), r2(TL.PLATE_AT - 0.03), 1.1]);          // the break into the sheet
bursts.sort((a, b) => a[0] - b[0]);
const file = "assets/hookfx.json";
const H = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
H._note = "The hook's glitch: [from, to, strength] in OUTPUT seconds, on the stressed words, then the break into the sheet. node bursts.mjs writes it; assemble.py, plan.mjs and edl.mjs read it.";
H.glitch = { bursts };
fs.writeFileSync(file, JSON.stringify(H, null, 1) + "\n");
console.log(`${file}: ${bursts.map(b => `[${b.join(", ")}]`).join(" ")}`);
