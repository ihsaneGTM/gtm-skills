# Motion scenes: one key idea as an After Effects scene

The parts of a long video are made of the engine's blocks (cards, profiles, callouts, stock shots). Shown one after the
other for 7 minutes, they get repetitive: « la vidéo est un peu ennuyeuse… pas tout le temps faire des cartes comme ça qui
apparaissent à l'écran de manière répétitive » (Ihsane, 2026-10-15, leads-qualifies v7). A **motion scene** tells ONE key
idea of a part as a single After Effects-like scene, over the whole 16:9 frame: the shorts' motion pages
(`plugins/video/skills/shorts/references/motion-pages.md`, the bar and what was refused) brought to the long video. The
first three, made on leads-qualifies, were approved (« j'aime bien les planches que t'as travaillées », 2026-10-15).

## When
- **2 or 3 per long video**, on the ideas that carry the video (who decides, what a signal is, how a feature works), each
  10–25 s. The rest of the parts stay in the blocks: the contrast is what makes a scene land.
- **Never the same scene twice for one concept**, and never the same technique twice in a row: a technique (below) is a
  way of moving; the concept it shows changes from one scene to the next.
- **Never on a screen recording, never on a face shot**: a scene is a screen of its own in a part (`F.screen`), between
  two depth transitions (or after a chapter page).

## The techniques (references/scenes/*.html, each made from a shorts reference)
| Technique | What it is | Made for | Reference |
|---|---|---|---|
| **The 3D floor** | people as photo/illustration cards STANDING on a floor in true perspective, soft contact shadows, the branches drawn on the floor; the camera pulls back, dives to one card (motion blur, a reticle closing), then rides a yellow road along the branches; each card crossed jolts; a card flips to a yellow back | a hierarchy, a path between people (who decides / who influences) | `scenes/floor-a.html` (from shorts `tree-a`) |
| **The type wall / type tree** | only type and ink; relevance or rank read in the FONT WEIGHT (thin → heavy on its word); a yellow highlighter swiping under words, a hand-drawn ink loop, ink strokes drawing themselves, short tags sticking on; the words regroup into a tree | a selection out of a list, a classification, a definition (signals) | `scenes/type-a.html` (from shorts `tree-b`) |
| **The elevator** | a tower of floors, the frame as the shaft; big grey floor numerals in parallax, a product-like floor indicator rolling its digits; the camera FOLLOWS a yellow cable carrying a pill from floor to floor, each floor reacting; the tower folds into one frame at the end | a cascade, a sequence of levels or steps (the Waterfall's providers) | `scenes/elevator-a.html` (from shorts `tree-c`) |

What all of them keep: depth; fast entrances that overshoot a little before settling; motion blur on fast moves; ONE thing
moving at a time, no accidental overlap; soft blurred shadows only (never a hard offset shadow); the brand's accent only on
the key point; one type family in several weights (Geist Mono for small data labels); **never his sentence on screen**, only
short labels inside the schema; something changing every 1–2 s. **Sounds: 3 at most, quiet (−21 to −24 dB), no click or
pop per element** (whooshes on the camera's big moves, one soft landing).

## How
1. **Pick the ideas** with the plan of the parts (step 9): which 2–3 ideas, which technique each (or a new one at the same
   level: then add it to the table above), the span in film seconds (from 0.1–0.4 s before the screen's transition to its end).
2. **Set each scene up**: `node scripts/motionscene.mjs <run> <scene> --part <n> --from <s> --to <s>` → `<run>/motion/<scene>/`
   (the kit `motion-kit/kit.js` says the contract: a paused gsap timeline, `K.A("word")`, everything a function of t).
3. **Write it, in parallel**: when subagents are available, give each scene to a designer agent (background) with this file,
   the reference html, `motion-pages.md`, the scene's words and the idea to make understood; it writes `<v>.html` and
   looks with `--variant <v> --sheet [--at …]` (stills in `<run>/stills/motion/`), frame by frame around each move. Look at
   what comes back yourself before going on. A sheet that hangs for more than 10 minutes: stop it and run it again.
4. **Render**: `node scripts/motionscene.mjs <run> <scene> --variant <v>` → `film/media/mp-<scene>/` (PNG with alpha, about
   25 MB a second: mind the disk).
5. **Lay it in the part's story**: a screen of its own, no camera push, the transition in, the scene on its clock:
   ```js
   const s1 = F.screen('floor', t.for1 - 0.3, F.DUR + 1, { push: 0 });
   B.depth(s0, s1, s1.t0);
   F.motionPage(s1, 'floor', { t0: 8.1 });   // t0 = the --from of the set-up
   ```
   Its sounds join the part's (marked key: the sound pass keeps them). Render the part and look at the transition into the
   scene (no empty paper after the transition: the scene's first 0.3 s already show something).
