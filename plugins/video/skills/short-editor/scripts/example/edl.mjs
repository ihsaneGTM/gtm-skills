// Reproduction of v14 of the GTM OS short, to validate the pipeline port.
const STEPS = [
  [0.00, 1.10, 0.00], [1.70, 1.04, 0.50], [4.30, 1.08, 0.35],
  [7.60, 1.03, 0.40], [12.30, 1.09, 0.30], [14.00, 1.14, 0.22],
  [15.25, 1.04, 0.35], [19.05, 1.09, 0.30], [20.90, 1.14, 0.20],
  [21.90, 1.05, 0.30], [23.75, 1.12, 0.22], [24.90, 1.06, 0.35],
  [27.45, 1.11, 0.28], [28.35, 1.03, 0.40], [30.70, 1.08, 0.35],
  [34.35, 1.04, 0.40], [38.20, 1.09, 0.30], [41.45, 1.05, 0.35],
  [45.80, 1.11, 0.30], [48.05, 1.15, 0.25], [50.10, 1.04, 0.30],
  [58.50, 1.07, 0.35], [65.10, 1.03, 0.40], [70.20, 1.08, 0.30],
  [74.50, 1.12, 0.25], [76.90, 1.04, 0.35], [79.20, 1.08, 0.30],
  [84.80, 1.04, 0.35], [85.50, 1.08, 0.30], [89.40, 1.11, 0.28],
  [94.90, 1.04, 0.30], [95.75, 1.16, 0.12], [96.90, 1.05, 0.45],
  [101.60, 1.09, 0.30], [105.50, 1.04, 0.35], [111.30, 1.10, 0.30],
  [113.90, 1.14, 0.25], [117.30, 1.06, 0.35], [119.60, 1.11, 0.30],
  [121.80, 1.05, 0.35], [124.20, 1.12, 0.30], [128.00, 1.06, 0.40],
];
const DAMP = 0.85, SLOW = 1.15;
export function cameraSteps() {
  return STEPS.map(([t, z, r]) => [t, 1 + (z - 1) * DAMP, Math.max(0.001, r * SLOW)]);
}

export const MAP = {
  acts: [
    { in: 37.05, out: 98.60, outEnd: 99.90, build: true },
    { in: 113.15, out: 119.10, outEnd: 120.30, build: false },
  ],
  centerPop: 37.45, branch0: 37.75, branchGap: 0.16, chromeFrom: 49.10,
  focus: [
    { node: "linkedin_content", in: 58.55, out: 61.70, zoom: 1.34 },
    { node: "youtube", in: 85.55, out: 94.60, zoom: 1.34 },
    { node: "root", in: 113.20, out: 119.45, zoom: 1.46 },
  ],
  badges: [
    { node: "linkedin_content", from: 60.30, to: 61.55, text: "5 posts / week" },
    { node: "youtube", from: 86.15, to: 91.15, text: "views this week" },
    { node: "youtube", from: 91.30, to: 94.60, text: "UTM → signups" },
    { node: "root", from: 114.55, to: 119.10, text: "API · MCP" },
  ],
  pulseFrom: 78.40, pulseTo: 85.20,
  boom: 95.85,
};

export const MAC = { wake: 35.10, bounce: 36.86, open: 37.05, pushFrom: 49.10, pushTo: 50.30 };

export const SKILLS = {
  in: 61.75, row0: 61.95, rowGap: 0.40, group: "LinkedIn",
  skills: ["/linkedin-weekly-prod", "/linkedin-story-telling", "/linkedin-spam-roast",
           "/linkedin-use-case", "/linkedin-x-to-post"],
  pick: 0,
  select: 70.98, termIn: 71.30, prompt: 71.62, promptEnd: 72.12,
  line0: 72.35, lineGap: 0.26,
  lines: [
    { text: "reading voice reference — ihsane" },
    { text: "5 posts to schedule this week" },
    { text: "Mon   story telling", ok: true },
    { text: "Tue   use case", ok: true },
    { text: "Wed   roast", ok: true },
    { text: "Thu   customer win", ok: true },
    { text: "Fri   x-to-post", ok: true },
  ],
  summary: 74.05, summaryText: "5 posts ready  ·  30 min",
  termOut: 75.55, termEnd: 76.35, sidebarOut: 71.45,
};

export const BLUR_WINDOWS = [[7.52, 15.25], [22.05, 25.40], [28.15, 49.55]];

export function sfxCues() {
  const c = [];
  const add = (t, kind, gain) => c.push({ t, kind, gain });
  add(7.58, "swoosh_in", -18);
  [8.66, 9.68, 10.52, 11.05, 12.95].forEach(t => add(t, "tap", -20));
  add(14.02, "rattle", -16);
  add(15.05, "whoosh_out", -21);
  add(22.30, "swoosh_in", -19);
  [22.60, 22.80, 23.00].forEach((t, i) => add(t, `tick${i}`, -22));
  add(23.82, "whoosh_out", -19); add(24.06, "pop", -14);
  add(28.40, "impact_soft", -14);
  for (let i = 0; i < 15; i++) add(32.34 + i * 0.093, "type", -16);
  add(34.70, "whoosh_out", -22);
  add(35.10, "swoosh_in", -17);
  add(36.86, "tap", -17); add(37.05, "pop", -15); add(37.45, "impact_soft", -17);
  for (let i = 0; i < 8; i++) add(37.75 + i * 0.16, "tap", -22);
  add(39.60, "chime", -21);
  add(48.05, "riser", -20); add(49.05, "swoosh_in", -14); add(50.30, "impact_soft", -14);
  add(58.41, "swoosh_in", -16); add(60.30, "blip", -17); add(61.60, "swoosh_out", -19);
  add(61.75, "swoosh_in", -19);
  for (let i = 0; i < 5; i++) add(61.95 + i * 0.40, "tap", -22);
  add(70.98, "pop", -15); add(71.30, "swoosh_in", -17);
  for (let i = 0; i < 7; i++) add(71.64 + i * 0.068, "type", -20);
  [0, 2, 4, 6].forEach(i => add(72.35 + i * 0.26, "blip", -24));
  add(74.05, "pop", -16); add(75.55, "whoosh_out", -20);
  [1.2, 3.4, 5.6].forEach(d => add(78.40 + d, "blip", -23));
  add(85.41, "swoosh_in", -16); add(91.30, "tick2", -18); add(94.50, "swoosh_out", -19);
  add(94.70, "riser", -18); add(95.85, "impact_big", -13);
  [0.10, 0.20, 0.30].forEach((d, i) => add(95.85 + d, `tick${i}`, -20));
  add(98.60, "whoosh_out", -18);
  add(113.07, "swoosh_in", -16); add(113.90, "impact_soft", -19);
  add(119.10, "whoosh_out", -19);
  return c.filter(x => x.t >= 0).sort((a, b) => a.t - b.t);
}

export const SUB_STYLE = "clean";
