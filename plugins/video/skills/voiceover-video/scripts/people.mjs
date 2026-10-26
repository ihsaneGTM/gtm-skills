#!/usr/bin/env node
// The video's fictional people, DRAWN in the brand's own illustration hand (Ihsane, 2026-10-15: the AI headshots « se voit
// que c'est des fausses photos »; « renforcer la brand plutôt que des images générées par IA moches »). Each person a bust
// in the hand of the references, recognisable by a prop of their role (the CMO signs with a pen, the SDR has a phone at the
// ear…), on the cream of the cards, written as film/img/people/<key>.jpg: every block that shows a person (profileCard,
// dmCard, sheet, the motion scenes) takes it as it took the photo.
// The references: Your brand's illustrations (workspace/brand/illustrations/*.png|jpg, when the user has some), else
// Pipecorn's own (plugins/video/assets/illustrations/pipecorn/: Frame 48, Frame 49, the hero drawings). Nano Banana 2, one
// person per call (a sheet of several drifts to a clean cartoon), about $0.07 each.
//
//   node people.mjs <run> <key> "<the person: age, hair, role, the prop of their role, clothes>" [--try 2]
//   e.g. node people.mjs workspace/projects/x david "an older man, the CMO: grey hair, he signs a document with a big yellow fountain pen, a dark suit, a yellow tie"
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generate } from "../../../motion/nb2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../../..");
const a = process.argv.slice(2);
const [runArg, KEY, WHO] = a;
if (!runArg || !KEY || !WHO || !/^[a-z0-9-]+$/.test(KEY)) { console.error('✗ node people.mjs <run> <key> "<the person>"'); process.exit(2); }
const RUN = path.resolve(runArg);
const imgs = d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => /\.(png|jpe?g)$/i.test(f)).map(f => path.join(d, f)) : [];
const own = imgs(path.join(ROOT, "workspace/brand/illustrations"));
const refs = (own.length ? own : imgs(path.resolve(HERE, "../../../assets/illustrations/pipecorn"))).slice(0, 4);
const accent = (() => { try { return JSON.parse(fs.readFileSync(path.join(RUN, "brand/theme.json"), "utf8")).accent; } catch { return null; } })() || "#FFD90D";

const PROMPT = `Draw ONE person, a BUST (head, shoulders, top of the chest, and the hand with the prop), in EXACTLY the hand of the attached illustrations (the same illustrator):
- loose gestural brush-pen ink: THICK black outlines #1A1A1A of IRREGULAR weight, rough and slightly wobbly, big simplified shapes, CHUNKY simplified hands;
- the face is almost FEATURELESS like the references: the nose is only the bump of the face's outline (three-quarter or profile view), the eye a single small black dot or a closed curved line, a tiny mouth line or none; never detailed eyes, eyebrows, teeth or lips;
- hair = BIG SOLID BLACK flat blobs with rounded volumes (grey or blond hair = a white shape with a grey halftone dot screen);
- skin = flat cream off-white #FBF6EF;
- clothes have NO outline on their outer edge: a dark grey HALFTONE DOT texture (round print dots) with a rough edge and white highlights left blank, like the references;
- the ONLY colour is ${accent} on the person's prop, shaded with halftone dots like the references;
- no gradient, no flat grey fill, no drop shadow, nothing else in the picture.
The bust is centred, about 80% of the square's width, its bottom cut by the bottom edge of the picture.
BACKGROUND: flat warm cream #F3F0E9 everywhere, nothing on it. NO text, NO letters, NO logo.

THE PERSON: ${WHO}.`;
const out = path.join(RUN, "film/img/people", `${KEY}.jpg`);
await generate(PROMPT, out, { aspect: "1:1", size: "1K", refs });
spawnSync("sips", ["-Z", "800", out], { encoding: "utf8" });
console.log(`→ film/img/people/${KEY}.jpg (${own.length ? "Your brand's illustrations" : "Pipecorn's illustrations"} as the hand). Look at it: the hand of the references, the prop, nothing written`);
