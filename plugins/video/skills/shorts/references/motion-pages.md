# White pages: motion pages at After Effects level

A white page is where a short sets an idea down as an animated schema while the voice goes on (2 or 3 in a 1 min+
version, none in a 30 s one). Since round 10 (2026-10-14/15, references/look.md) it is a **motion page**: one scene,
written with gsap, over the WHOLE vertical frame, rendered with alpha and laid on the short's sheet.

Ihsane's verdicts, which set the bar:
- the round-9 pages (the 16:9 engine's blocks cropped into a column, cards in a grid, balls falling into a funnel, the
  95% knocked out) were « pas fou… on peut faire 100 fois mieux »; a zoom cut their content top and bottom: never again.
- the round-10 pages, made by designer agents in parallel, were loved: « j'aime énormément… les trois, faut les garder
  en référence ». **That is the level of every page from now on**, and **varied**: several good ways exist; do not
  repeat one page's concept in the next short.

## The references (read them before writing a page)
`references/pages/motion/` — the html of each page (they run in a page folder set up by motionpage.mjs):
- the decision tree (who buys / who influences): `tree-a` 3D floor of photo cards, the camera rides a yellow road up;
  **`tree-b` (chosen)** type-only tree, rank = font weight, ink branches, a highlighter climbing; `tree-c` the company
  as a tower, the frame an elevator with a rolling floor counter.
- the signal (companies hiring): `radar-a` job feed at speed, posts lifted in 3D, card flip to the team; `radar-b`
  isometric city whose hiring buildings light up; `radar-c` a field of company marks in depth crossed by one wave, a dive
  into a round table; **`radar-d` (chosen)** B's city, then the platform itself TRANSFORMS into C's round table (no
  floating island), then a full, layered chart filling the bottom of the frame (« pas timide »).
- the recap and the payoff number, the exit onto the face: `recap-a` rows sliced by scanners, the list becomes a band
  that peels into 95%, glyphs lift off, the paper leaves in strips; **`recap-b` (chosen)** 1000 dots filtered to 50,
  an odometer rolling to 95 across the width, the % slash becomes a blade that splits the page into two doors onto the
  face; `recap-c` three filter rings that become the counters of 95%, punched out, a dive through one onto the eye.

## The bar (every page)
- **After Effects, not web**: depth (3D perspective, parallax layers), kinetic type with real techniques (weight axis,
  per letter, masks, odometers, scramble), fast moves with overshoot and motion blur (blur on the motion axis, or
  sub-frame averaging), things that TRANSFORM into the next (a platform into a stage, a rim into a curve, a list into a
  number, a slash into a blade), something changing every 1–2 s, one strong visual idea per page.
- **The whole frame**: the scene uses the vertical space (a chart fills the bottom, bleeding off the edges on purpose);
  nothing small grouped in the centre with empty paper above and below. Only the frame's edge may cut an element.
- **Pedagogy, not words**: the schema makes the idea understood; only short labels (« Can buy », « Hiring · SDR »,
  the criteria). Never his sentence written out: the subtitles carry it.
- **Control**: one move at a time, separate zones, a fixed depth order, hand-offs not crossfades; checked frame by
  frame (every 0.1–0.17 s around each move), in shuffled order too (the renderer starts tabs mid-timeline).
- **Brand**: paper, ink #1A1A1A, yellow #FFD90D as the one accent (the payoff), Bricolage at several weights (Geist Mono
  for small data labels), soft blurred shadows only, fictional people (img/people) and companies.
- **Sound**: 3–6 cues from the packs on the landings, about −16 to −19 (radar-d's are right).
- The frame: subtitles band y 192–450 empty; information inside x 103–977, y 450–1488.

## How
1. Per page: `node scripts/motionpage.mjs <short> --page <name> --from <s> --to <s> --seed <n> [--handoff]` (the page's
   span: from 0.45 s before its first word; `--handoff` for the page that exits onto the face).
2. Write `motion/<name>/<v>.html` (motion-kit/kit.js says the contract), look with `--variant <v> --sheet [--at …]
   [--bg face-frame.png]`, iterate, render with `--variant <v>`.
3. **Several directions, in parallel**: when subagents are available, give each page to a designer agent (one per page,
   in the background) with this file, the page's words and the idea it must make understood; ask for 2–3 different
   concepts per page when the user wants to choose, one when the run goes straight to delivery. Look at what comes
   back yourself (sheets, then the page inside the short with `build.sh --slice`) before showing it.
4. In plan.mjs: `whitePage({ …, children: [docLayer({ id, src: "assets/media/mp-<page>-<v>", y: 0, w: 1 })] })`; for the
   handoff page, `handoff: meta.from + meta.handoff` and its `meta.camera` steps merged into STEPS
   (references/example-plan.mjs, shorts-leads short 9).
