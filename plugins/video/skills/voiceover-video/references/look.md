# The look « Document »

The first style of `/video-voiceover`, settled on one real video over twelve rounds of review (2026-10-12/13): « Waterfall
enrichers », `workspace/videos/waterfall-complete-2d.mp4` (3:45, « quasiment parfait »). Its code is the reference:
[`example-intro-story.js`](example-intro-story.js), [`example-story-part1.js`](example-story-part1.js),
[`example-cutback-story.js`](example-cutback-story.js), [`example-story-part2.js`](example-story-part2.js). The reason of
every rule below, with Ihsane's words and dates: [`decisions.md`](decisions.md). The media: [`media.md`](media.md).

It is the article video's language (the same engine, [`engine.md`](engine.md)) without its episode formula: a white desk
with a fine grid, grain and window light; real pages read with ink; real logos on white tiles; cards with soft shadows;
one type family (the brand's title and text faces); ink and greys, the brand's yellow as fills and markers; the yellow V
chapter page for a new part; real stock shots in a frame on the paper and a few GIFs as pinned prints.

## The structure of a video

```
the intro (filmed, dressed) → part 1 (the clone) → cutback 1 (filmed, dressed) → part 2 (the clone) → … → the end card
   22.1 s at ×1.1               56.8 s: the agenda,      2.8 s: « So now,           143.4 s: the benchmark, the reasons,
   « …called Waterfall           then the first idea      which waterfall? »         the method, the tool, the end
   Enrichers. » + music
```
- The intro is cut right after the hook (the sentence that names the subject or the promise); the plan of the video (the
  agenda) is the first thing the clone says.
- A **cutback** is a short real line of the user at a change of part, best a question (« So now, which one should you
  use? »); between two motion parts. None when the take has none.
- **One story per motion part** (`film/story-<n>.js`), its own take, its own page; the last part ends on the end card.

## The motion parts: the settled rules

1. **The junctions are fast.** IN: the previous filmed clip's last frame is the part's first frame and snaps into a
   pinned print in 0.42 s (motion blur, a whoosh); the clone's voice starts at 0.25 s. OUT: the next clip's first frame
   snaps from a print to full screen in 0.33 s, ending 0.07 s before the cut; the part ends 0.3 s after its last word. No
   dead air. The post (grain, vignette, light) is off on those frames: they ARE the real frames (PSNR ≥ 40 dB at the
   joins; the reference: 43 to 51). The junction PNGs carry no colour chunk (`png.mjs`).
2. **The user's print leaves within 1 to 2 s and never comes back** (part 1: when the waterfall shot covers the screen;
   part 2: at 1 s). From then on **every** element is laid out without it: centred (x 960), its exit computed so it
   really leaves the screen (`offAt`), not only the next one. (The user's print may come back at the very end, for the
   call to subscribe: their own end, not a junction.)
3. **A person is the top of a LinkedIn-like profile** (`profileCard`): a DRAWING of a FICTIONAL person in the brand's
   own illustration hand (`scripts/people.mjs`; never an AI photo: « ça se voit que c'est des fausses photos », 2026-10-15), a fictional name, a fictional company with a small drawn logo (`MARK`, never « Acme »), a role, a
   city, « 500+ connections ». Phone numbers in a range set aside for fiction (UK: +44 20 7946 0xxx, Manchester +44 161
   496 0xxx: Ofcom's drama numbers); emails at the fictional company's domain.
4. **A real tool is its real logo and its real homepage** at the full viewport above the fold (1440 × 900 at ×2) in a
   browser frame with its site's name (`page1`), never a thin top band. A provider the voice does not name stays generic
   (« Provider A–F », « + more »), never another real brand; what a competitor uses inside is not known: generic.
5. **A thing teased but not named yet** is a pixelated card (`lockCard`): its blocks shuffle, it sharpens a little on the
   word that teases it, never enough to read.
6. **No stamps** (they read as AI slop). A conclusion is an **editorial line** (`ed`): its words rise out of their
   masks, a yellow marker passes on the key word (`<u>…</u>`), or a slim bar draws under it (`bar: true`; red for a
   « no »). A short label (`callout`, `chipx`) for a tag.
7. **Crafted text entrances**: every word rises from its mask (`reveal`); a number counts 0 → N on its words, then its
   noun rises (`counter`, `B.big`); a list fills on its words; ten tiles pop one by one.
8. **The yellow V chapter page is perfect**: for each new part (« Reason 1 », « The special tool »…), its photos the
   tools and the user's own print; it carries a light whoosh (`fx.js`). Kept as it is.
9. **No 3D dives, no push-throughs, no tilted cascades.** Moments change by the engine's depth cuts (`B.depth`); the
   camera moves gently (`camTo`, ≤ 1.18×); one move at a time, in its own zone, at a fixed depth.
10. **Charts: one chart per metric** (`chart`), under its crafted app-icon tile (the Gmail mark for emails, the iOS Phone
    icon for phones), the bars growing from zero on their words; never the same bars animated from one metric to a lower
    one (it reads as the stats dropping). The first chart leaves fully off the left edge, the next one slides in.
    **Real numbers say where they come from**: one mono line, discreet, bottom right, « Source: <study>, <year> ·
    <url> » (round 13: « Source: Hyperline phone & email test, 2026 · pipecorn.com/pipecorn-vs-fullenrich »); a second
    source for some rows goes bottom left. A row or a group with no source is left out, never filled with a guess (the
    phones chart lost its single providers); the card is as tall as its rows. « Illustrative figures » only on numbers
    the user marked so. The delivery warns about comparative advertising (naming competitors with numbers).
    **A study is shown as itself**: its real page at the full viewport in a browser frame with its URL, the tester's
    real logo cut out (`capture.mjs --logo`) with an editorial line (« Independent test · <u>Hyperline</u> »), then its
    rule as an editorial line on its words (« Counted only if it reached the <u>right person</u> », the marker on the
    spoken words: `ed(… { markAt })`).
11. **The method** (« check three things: … ») is `B.method`: a big list, straight at every moment, sliding DOWN from
    one rule to the next with a vertical motion blur; the rules not said yet pixelated; never a perspective re-raise.
12. **Only what the voice says**, at that moment; no number the voice does not say; the brand's own tool rebuilt as an
    illustration is marked « Illustration of the flow »; no figure nobody gave (no community size).
13. **Something changes every 1 to 2 s** (an entry, a word rising, ink, a counter, the camera); entries 0.3 to 0.6 s
    with a slight tilt (±1 to 2°) and a bounce; every element has an entrance and an exit; soft shadows.
14. **Media**: 8 to 12 stock shots per 4 minutes in the frame on the paper, 3 to 5 GIFs as pinned prints
    ([`media.md`](media.md)).
15. **Sound**: only the shelf's music and sounds (`sound.mjs`), never a synthesised one; the sounds offset -10 dB (the
    clone is a quiet voice); ONE music under the whole video (see The sound).
16. **No subtitles, no emoji, no title at the top left.**

## Which block for which sentence

| The voice says | On screen | In the story (template skeleton / reference) |
| --- | --- | --- |
| the video's plan (« in this video I'll show you… ») | the chapters as numbered white cards, centred once the print left, each on its words; the teased one pixelated | part 1 § 0 (`w-ag`, `lockCard`) |
| « X vs Y » | two white cards and a dark « vs » disc | part 1 § 0 |
| « my example » | a dark label in the centre | `callout(… cls: 'dark')` |
| a list of people, a file | the sheet (headshots, fictional companies, the columns asked) | `sheet` |
| a number | a counter 0 → N, then its word | `counter`, `B.big` |
| a real tool, named | its logo on a white tile, its homepage dropping in (full viewport, browser frame) | `tile`, `page1` |
| it does not have it | the pages crossed in red ink, a red label | `inkIn(… cls: 'red')` |
| « not getting X » | empty cells turn red « Not found », an editorial « No X » with a red bar | part 1 § 3 |
| « three of them, in a test made by <tester> » | the three logos rise to a row, the study's real page in a browser frame, the tester's logo + « Independent test · <u>Tester</u> », a stock shot on how it was run, its rule as an editorial line | part 2 § 0 |
| a benchmark | one chart per metric under its app icon, bars from zero, its source line | `chart`, part 2 § 1 |
| « how is that possible? » | an editorial question with a marker, a GIF print | part 2 § 2 |
| a new part | the yellow V chapter page | `B.chapter(… style: 'V')` |
| « all of them in one » | the tools fly into dashed slots of one card, then « <u>One</u> subscription » | part 1 § 4 |
| « one by one until… » | tiers as dashed slots that fill, a dot travelling down, ✕ ✕ ✓, the result card | part 1 § 5 |
| a person looked for, someone else's phone | the top of their profile; another profile sliding over it | `profileCard`, part 2 § 5 |
| « not for months » | a calendar whose months run | part 2 § 5 |
| « check three things » | the method list | `B.method` |
| the brand's tool | its homepage (« Yes, our tool »), its record, the flow rebuilt as an illustration | part 2 § 7–8 |
| « picture that with a big community » | a ring of people, then cards popping faster and faster | part 2 § 9 |
| the call to subscribe | the user's print back, Like / Subscribe / Comment pressed on their words | part 2 § 10 |
| « the first link in the description » | the homepage and the description card, the link on a marker | part 2 § 11 |
| « see you in the next one » | the end card on the yellow, held 2.5 s | `endCard` |

## Layout and rhythm

- 1920 × 1080; an element is placed by its centre. While the print is there: the print left (520, 520) at 0.4×, the ideas
  on the right column (x ≈ 1390). Once it left: everything centred.
- A GIF print sits on the right (1390, 560); a stock shot fills the frame (160, 64, 1600 × 900).
- Editorial lines under their scene (y 880 to 1035), a question above (y 150).

## The filmed clips, dressed (the intro, every cutback, every facecam face shot)

The facecam mode's face shots follow these rules too (one lockup at a time, held to the cut, at most one light punch in
a face shot after the intro); a face shot of 10 to 20 s may carry two lockups, one after the other, never at once.


1. **The footage stays real**: ffmpeg composes it at 30 fps (`intro.mjs --render`); Chrome draws only the layer behind
   the user, on a transparent page. Never a frame of the footage in Chrome.
2. **Graded first** with `/video-color-grade` (the intro); every cutback takes the intro's LUT (one look for every
   filmed part). **Played at the user's speed** (`profile.json › voiceover.introSpeed`; Ihsane ×1.1), the voice's pitch
   kept; a cutback at the same speed.
3. **The text is the landscape editor's** in this style: a stacked lockup of 2 to 4 rows beside the head, left (x 0.055)
   or right (x 0.945, right-aligned), from y 0.13, ONE side at a time, alternating; each row pops on the onset of the word
   it quotes (a spring, 0.72 → 1, a 44 px rise); the brand's title face heavy (800) and an italic serif (Instrument
   Serif); the payoff word big (130 to 180 px) on the yellow marker; **white words** (Ihsane, 2026-10-15, picked over black words
   and over white words with the payoff word in yellow), the payoff word white too, on its yellow marker; a tight dark halo then
   one wide soft shadow, so the white holds on a light wall; the block leaves in 0.3 s. A counter is laid out on the
   value it shows (a right-aligned one grows to the left, its marker as wide as the value).
   A block is at most 520 px wide (scaled down to fit: the head moves, and a punch makes it bigger; 600 px reached it).
   Verbatim: every word on screen is said at that moment. The intro's last block (the subject's name) comes out from
   behind the head and holds to the last frame; a cutback's one lockup holds to its cut.
4. **Behind the user, always** (their mask on top of everything). A screenshot or a sheet = ONE big white window on the
   side opposite the text, for the few seconds its sentence lasts. The tools named = their own square app icons
   (~210 px, clipped at 26 %), out from behind the shoulders, tilted, no label; never a wordmark on a white chip.
5. **Punches**: two in a 25 s intro, none on its ending, 1.20 in 0.09 s on a payoff word, released linearly over 5 s,
   anchored on the centre of the head (measured on the matte); a cutback: at most one, lighter (1.12). Drawn by
   `perspective` at the sub-pixel, never `zoompan`. The text does not move with them: check the stills at the peak.
6. **The music starts on the hook** (about 12 LU under the voice, ducked) and goes on under everything after (the
   assembly); a cutback has no music of its own. The shelf's sounds: a light whoosh per block, a pop per payoff word,
   clicks under a counter; the camera is silent.
7. **A cutback is cut 0.08 s before the user speaks and 0.13 s after their last word**, before the next sentence's mouth
   movement.
8. **The last frame is the junction**: the next part starts on it (a new render of the clip means the parts around it
   rendered again).

## Long videos: chapters, the marker, the music

Settled on « Créer le meilleur système d'acquisition B2B » (facecam, 11:09, 2026-10-14). Ihsane: « sur les vidéos longues,
il faut séquencer plus », « trop d'informations d'un coup, pas assez découpé, on change pas assez de musique ».

- **Cut a long video into chapters: its big parts, FEW of them** (Ihsane, 2026-10-14, on « leads-qualifies »: 6:48 → 3
  chapters: what a good lead is, way 1 LinkedIn, way 2 Pipecorn; « the end is just an explanation », not a chapter).
  One chapter per big part of the plan the voice announces (« we are going to do this in three parts »), usually 3 to 5
  in 6 to 12 minutes; never a chapter for an intro, an ending or a short explanation; no timer (an early « one every
  40 s to 1 min 40 » gave 10 for 11 minutes: far too many). Propose the list to the user with its times BEFORE the
  stories (they confirm it); the same list makes the YouTube chapters of `publication.md`.
- **Every chapter opens on the yellow V page, HELD** (screen « A », kept out of five on 2026-10-14: the held V page, a
  table of contents, the funnel lighting up, a dark plate with a giant number, a collage): `B.chapter(…, { style: 'V',
  over: '<kicker> · chapter n of N', title: '<short title>' })` with `t2` about 2 to 2.5 s after `t0`: the page stays on
  screen 1 to 2 s with NO voice (a pause in the voice: `vo.json › pauses` [["<the title's last word>", 1.6]]; in
  facecam the take's own pause, lengthened the same way), its photos the chapter's own pictures (`film/img/photos/`; a
  name with a dot in it is read as a path: no dot). **A riser** from the shelf into the title (`m:smooth-riser`, the
  assembly lays it at the page's start + 0.5 s: « j'aime le SFX riser »), the page's own whoosh as it leaves.
- **A chapter opens on a drawn screen, never on a face shot**: the marker sits at the top centre, where the head is.
- **The progress marker** (`template/document/film/tracker.html`, `scripts/tracker.mjs`), right AFTER each chapter
  page, **for about 4.5 s, then it goes** (« juste pour affirmer qu'on est passé à une prochaine étape »): square, in the
  Fr1 frame's language (guide lines out to the edges, a thin rectangle, crosshairs, the F1 grid, the bar opening from its
  middle line with a yellow scan line, « CHAPTER n / N » in mono); the brand's logo, an optional kicker, then ALL the
  chapters (up to 5; else 3 around the new one, never fewer: « toujours afficher les trois chapitres pour montrer qu'on
  est bien en troisième »): those done dimmed, the new one in the accent, the next ones **pixelated** (a mosaic, never a blur);
  the update plays 0.75 s after it appears (the new one's pixels resolve). **The brand's mascot** (Pipecorn: Frame 49 of
  `Pipecorn/Assets`, `img/mascot/pipecorn-49.png`; never another character) comes up from BEHIND the bar's top edge,
  clipped there: never seen under the bar (« elle commence en dessous, puis elle monte: c'est moche »). Its sounds (the
  assembly): a click as it comes in, a pop for the mascot; **out on mechanical sounds** (a shutter, two digital clicks, a
  gear). Theme: **white** (Ihsane's choice, 2026-10-14, after a day on the yellow: the white bar with a faint grid, the new chapter in ink on the yellow marker); `yellow` and `dark` stay as options (`run.json › tracker.theme`). While it shows (the 5 s after a
  chapter page), the screen's own text stays under y 260.
- **The music changes at EVERY chapter** (« on ne peut pas rester sur la musique d'intro 11 minutes »; then, 2026-10-15:
  « pour le deuxième chapitre aussi, il faut changer de musique, et pour le troisième aussi »): the intro's track under
  the intro and the plan, then one track per chapter (`run.json › music.sections`: [{ chapter: 1, name:
  "convergence.mp3", offset: -6 }, { chapter: 2, name: "ta1ls-fatigue.mp3", offset: -6 }, { chapter: 3, name:
  "alvedon-retire.mp3", offset: -6 }]: a shelf name, or a file of `plugins/video/assets/music/`), each **in another
  register than the one before, calmer than the intro's, and lower: about 6 dB under the first** (« le but, c'est
  d'entendre le propos »; about 18 LU under the voice). Hip Hop 02 after Gimme was too close in style; Ihsane picked
  Convergence for the first chapter (out of Secret Garden, ridgeclub, Convergence) and added two tracks to the shelf for
  the next ones (TA1LS « FATIGUE », alvedon « retire »). None of those three carries its licence: ask before publishing.
  The old bed fades out as the chapter page comes in, the new one starts as it leaves. With more chapters than tracks,
  ask the user for more (the shelf takes the tracks they add).
- **The junction face ↔ drawn screen is a PLAIN CUT** (Ihsane chose it over a short blur and a small zoom), **except
  the cut into a chapter's yellow V page**, covered by the yellow torn sheet (`template/document/film/sweep.html`,
  `scripts/sweep.mjs`): the V page's paper alone, 21 frames, rising over the last 10 frames of the face shot, covering the
  cut, leaving over the first 10 of the page, a light whoosh and a paper slide. On every cut it was « trop »
  (`run.json › junction`: `"chapters"` the default, `"sweep-all"`, `"cut"`).
- **A diamond, a node, a pill casts its own shadow** (on its shape), never the square box of its element (« tu gères mal
  les ombres » on the yellow MQL diamonds: a `lift` class on the rotated square's box).
- **Drawings only on the whiteboard screens** (« leads-qualifies »): never on a face shot (no white notes behind the
  user), nothing over a screen share (« tu me laisses tranquille »).

## The sound

- The clone at its natural level in each part (no music in the parts); the user's real voice in the clips brought to the
  parts' level by a fixed gain at the assembly (never a per-part loudnorm: it would break the music's continuity).
- **ONE music per section** (a long video changes it with its chapters: § Long videos); the intro's track (`profile.json › voiceover.music`, by default « Gimme That Groove! » from 1.95 s),
  under the voice from the hook; at the assembly it goes on from where the intro stopped it, under every part and
  cutback, its body looped from 12 s with 2 s crossfades, at the intro's level (about 12 LU under the voice), ducked by
  the voices, faded out over the end card.
- Mastered at -14 LUFS, true peak ≤ -2 dBTP (measured on the sound alone, one gain, a limiter at -3.5 dBFS: at -3 the AAC
  encode came out at -1.8 dBTP on an 11-minute video).

## The material

- **Homepages**: `capture.mjs <url> assets/raw/<key>.png` (1440 × 900 at ×2; banners, chat bubbles, modals and open
  menus hidden; never clicked), then `ffmpeg -i assets/raw/<key>.png -q:v 2 film/img/pages/<key>-vp.jpg` and the domain
  in the story's `VP`. Look at it: a banner or the site's own tag over the hero is hidden or cropped by hand.
- **Logos**: cut from the capture (its header), the white made transparent:
  `ffmpeg -i assets/raw/<key>.png -vf "crop=W:H:X:Y,colorkey=white:0.08:0.05,scale=-2:64" film/img/logos/<key>.png`.
  **App icons** for the clips (`film/img/logos/<key>-icon.png`): the brand's own apple-touch icon or SVG from its site,
  or `plugins/video/assets/logos/`.
- **Fictional people**: drawn, never photographed (Ihsane, 2026-10-15): `node scripts/people.mjs <run> <key> "<the person:
  age, hair, role, the PROP of their role, clothes>"` → `film/img/people/<key>.jpg`, a bust in the hand of Your brand's
  illustrations (`workspace/brand/illustrations/`) or of Pipecorn's (Frame 48 / 49 and the hero drawings: loose brush ink,
  faces almost featureless, solid black hair, halftone clothes, the accent only on the prop), about $0.07 each. Each role
  has its prop, so it reads at a glance: the CMO signs with a fountain pen, the Head of Sales lifts a trophy, the SDR holds
  an old phone handset at the ear, Growth a tablet with a rising arrow, Marketing a megaphone. One person per call (a sheet
  of several drifts to a clean cartoon); look at each one.
- **The user's print**: `film/img/photos/<name>.jpg` from the intro's frames (the V pages' photos) and, for the call to
  subscribe, a print of a frame (`film/img/<name>-print.png`).
