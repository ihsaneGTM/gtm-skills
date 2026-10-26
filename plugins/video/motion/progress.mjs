#!/usr/bin/env node
// Where a motion video is, for the app's thread: one small file, <run-dir>/progress.json, that the
// skill's steps and its renderers keep up to date. The app draws each step from it (and from the
// files the step leaves); nothing else is needed for the user to follow the run.
//
//   node progress.mjs <run-dir> <step> <state> ["what it did, one line"]
//        state: running | done | failed | waiting (waits for the user) | skipped
//   node progress.mjs <run-dir> --render <frames done> <frames total> ["format"]
//   node progress.mjs <run-dir> --show
//
// progress.json: { "skill": "article-video", "steps": { "<step>": { "state", "line", "at" } },
//                  "render": { "done", "total", "format", "at" } | null, "updatedAt" }
// The steps of each skill, in order (the app shows them in this order; SKILL.md says when each starts):
export const STEPS = {
  "article-video": ["article", "script", "voice", "documents", "media", "story", "render", "checks"],
  "motion-short": ["script", "voice", "shots", "edit", "render", "checks"],
  "motion-trailer": ["brand", "story", "scenes", "sound", "render", "checks"],
  "voiceover-video": ["take", "intro", "script", "voice", "material", "media", "story", "render", "assemble", "checks"],
  "shorts": ["take", "moments", "cut", "edit", "render", "checks"],
};
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STATES = ["running", "done", "failed", "waiting", "skipped"];
const file = d => path.join(d, "progress.json");
export function read(dir) { try { return JSON.parse(fs.readFileSync(file(dir), "utf8")); } catch { return { steps: {}, render: null }; } }
function write(dir, p) {
  const f = file(dir), tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ ...p, updatedAt: Date.now() }, null, 1));
  fs.renameSync(tmp, f);
}
// the skill a run belongs to: the app's run.json says it
const skillOf = dir => { try { return JSON.parse(fs.readFileSync(path.join(dir, "run.json"), "utf8")).skill || null; } catch { return null; } };

export function step(dir, id, state, line = "") {
  if (!STATES.includes(state)) throw new Error(`state must be one of ${STATES.join(", ")}`);
  const p = read(dir);
  p.skill ||= skillOf(dir);
  p.steps = { ...(p.steps || {}), [id]: { state, line: String(line || "").slice(0, 200), at: Date.now() } };
  if (id === "render" && state === "done") p.render = { ...(p.render || {}), done: p.render?.total ?? p.render?.done ?? 0 };
  write(dir, p);
}
// a renderer's beat: every few seconds at most, so the file is not rewritten on every frame
let last = 0;
export function render(dir, done, total, format = null, force = false) {
  if (!force && Date.now() - last < 2000 && done < total) return;
  last = Date.now();
  const p = read(dir);
  p.render = { done, total, format, at: Date.now() };
  if (!p.steps?.render || p.steps.render.state !== "running") p.steps = { ...(p.steps || {}), render: { state: "running", line: format ? `Rendering ${format}` : "Rendering", at: Date.now() } };
  write(dir, p);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, a, b, c, d] = process.argv.slice(2);
  if (!dir) { console.log("usage: node progress.mjs <run-dir> <step> <state> [line] | --render <done> <total> [format] | --show"); process.exit(2); }
  if (a === "--show") console.log(JSON.stringify(read(dir), null, 1));
  else if (a === "--render") render(dir, +b, +c, d || null, true);
  else step(dir, a, b, c || "");
}
