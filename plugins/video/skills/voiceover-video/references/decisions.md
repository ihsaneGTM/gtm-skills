# Decisions: every review that made the format, with its reason

The format of `/video-voiceover` was built on one real video, « Waterfall enrichers » (Pipecorn), from 2026-10-12 to
2026-10-13, over twelve rounds of Ihsane's review. Each rule of `look.md` comes from one of them. Read this whole before a
first video: a rule looks arbitrary until you know what it fixed. Quotes are Ihsane's own words.

The reference: `workspace/videos/waterfall-complete-2d.mp4` (3:45, 1080p, « quasiment parfait », 2026-10-13) and its
4K copy `waterfall-complete-4k.mp4`; the code: `workspace/projects/waterfall-intro` (the dressed intro),
`waterfall-v1-media` (part 1), `waterfall-cutback-dressed` (the cutback), `waterfall-v1-part2` (part 2), `waterfall-media`
(the stock shots and GIFs), `waterfall-shared/assemble-full-2d.sh` and `-4k.sh` (the assembly), `waterfall-4k` (the 4K).

## 2026-10-12 · the method

- **Film only the intro, the clone does the rest.** Ihsane wanted a faster process: they film the intro, their cloned
  voice reads the rest, illustrated like `/video-article`. The junction between the real voice and the clone: « ça passe ».
- **The clone** (ElevenLabs instant clone, from 3 minutes of an English talking head): `eleven_v4`, stability 0.5,
  similarity 0.85, the text prefixed `[French accent] ` (« it's my voice », though still a little too native; stronger
  tags, French as the language code and `eleven_multilingual_v2` were not better). The prefix is Ihsane's: personal,
  empty by default (`profile.json › voiceClone.prefix`). The account is below Creator: 192 kbps was refused, the voice is
  128 kbps MP3. A Professional Voice Clone would need the Creator tier.
- **The intro is cut right after the hook** (here 24 s, « …called Waterfall Enrichers. »): the agenda and everything
  after it is the clone.

## 2026-10-12 · the style: « Document »

- Three styles were made of the same cut (Document, Kinetic depth, Product UI). **V1 « Document » was chosen**: « clearly
  the best ». Kinetic depth is kept aside to improve some day; Product UI was not retained.
- **The yellow V chapter page: « perfect »**. Keep it as it is.
- Wanted after round 1, all kept since: **LinkedIn-like profile headers with real-looking photos** on every contact card
  (fictional people, Nano Banana 2), **real logos**, **a pixelated mystery card** for the tool not named yet, **no AI-slop
  stamps** (a stamp « 1 SUBSCRIPTION » was the example), **crafted text entrances** (a counter 0 → 100), **fast junctions
  with the filmed parts, no dead air**.
- **Round 2 → 3: the 3D push-throughs and dives were refused as ugly** and removed (round 3 = the depth cuts of the
  engine). `verify.mjs` warns on a 3D move.
- **A « Studio 3D » style was refused overall** (« je préfère largement mon skill de base »); only its 3D line-art plans
  were liked, which led to the 3D shots below.

## 2026-10-12 · the intro, dressed

- **Round 1 refused**: the footage snapping into a print on the desk, single editorial lines; « super lente » (frames
  were dropped: the footage went through Chrome), too far from the landscape editor's text, no screenshot behind the user,
  no zoom, no music. **Since then the footage never goes through Chrome**: ffmpeg composes it at 30 fps, Chrome draws only
  the layer behind the user.
- **Round 2**: the punches « très mal gérés » (zoompan rounds to whole pixels, the release trembled) → drawn by
  `perspective` at the sub-pixel. A second window on the other side was refused: ONE window in the intro, at one place.
  The tools named = their own square app icons, never a wordmark on a white chip.
- **The speed**: « je parle trop lentement… » → ×1.2 was tried and found too fast: **×1.1** (`profile.json ›
  voiceover.introSpeed`).
- **The grade**: the intro graded with `/video-color-grade` first; the music starts on the hook.

## 2026-10-12/13 · the 3D shots, tried and SET ASIDE

Rounds 5 to 9 tried full-screen three.js shots between the V1 moments. They were finally set aside by Ihsane: « stock
videos + GIFs look better ». **Do not make 3D shots by default.** What was learned, in case they come back:
- Round 5: 3D plans half-screen beside V1 elements: « un mauvais mélange ». A 3D moment is FULL screen, long enough to
  evolve (5–8 s), the visual says what the voice says (a chip + an orbit of logos for « one subscription » did not).
- Round 6: provider blocks with padlocks stacking into one Pipecorn tower: loved. Stacked cylinders for a « waterfall »:
  refused. A camera placed high or at random, cutting cards off: refused.
- Round 7: the camera never fixed (one continuous designed move per shot, near-frontal, framing everything); a yellow
  ball travelling through the blocks « super moche »; the look « très Blender, basse qualité ».
- Look-dev (2026-10-13), as STILLS: chosen « 05 Editorial line-art » (white volumes, thin ink edges, mono labels on
  leader lines, FIG captions), never raw: the F1 fine screen-door grid, glow, grain, vignette; inside the Fr1 frame (thin
  ink rectangle on the V1 paper, crosshairs, a FIG caption); one yellow light, strong only while a structure builds, then
  calm; a dark screen inside the white page. **Lesson: for a look question, show stills first, not video renders.**

## 2026-10-13 · the media: stock shots and GIFs

- **A professional editor diversifies**: real stock videos and GIFs, not only motion design: « ça fait trop IA sinon ».
  12 free stock shots and 5 GIFs were planned for 3:48 (`waterfall-media/PLAN.md`); 11 shots and 4 GIFs are in the video.
- The shots go **in the frame on the paper** with the F1 grid and one grade for all (they read as one series), 1.5 to
  3 s each, on their words; the GIFs as **pinned prints** with a short caption, never full screen.
- **Free commercial licences only.** Many Mixkit clips carry the « Restricted » licence (720p, personal use): eight good
  candidates were refused for it. Pexels: free for commercial use, never showing people as endorsing a product. GIPHY
  grants no commercial licence: organic use only, said in the delivery.
- The full dark version with stock + GIFs (`waterfall-complete-dark.mp4`, 3:54): « on est vraiment pas mal ». Then the
  version without 3D: **`waterfall-complete-2d.mp4`: « quasiment parfait »**.

## 2026-10-13 · rounds 10 to 12, on the 2d version (the hard rules)

- **The user's pinned photo after a filmed part stays about 1 s, then it leaves** (within 2 s at most) and never comes
  back. A stock shot covering the screen is the best moment to clear it (part 1: the waterfall shot).
- **When an element leaves the layout (the photo), EVERY following element is re-laid** (centred, its exit recomputed
  so it really leaves the screen), not only the next one. A 1200 px slide from the centre had left cards half on screen.
- **Every yellow V page gets a light whoosh** from the packs (`m:deep-light-whoosh`, low): « Ihsane heard nothing » on
  its sweep before.
- **A filmed cutback ends right after its last word**, before the next sentence's mouth movement (0.13 s after it);
  it starts 0.08 s before the user speaks. It is dressed like the intro: the same grade, the same ×1.1, a lockup with the
  yellow marker on the payoff word, at most one punch.
- **The method list slides straight down** from rule to rule, with a vertical motion blur: « it should simply go down, a
  bit with a motion effect; the list tilting back up is too weird ».
- **Websites show the full viewport above the fold** in a browser frame: « show the whole viewport height », never a
  thin top band (1440 × 900 at ×2, banners hidden).
- **Charts: never animate the same bars from one metric to a lower one**: « switching from email to phone, we see the
  stats go down: it makes no sense ». Separate charts, each under its own crafted app-icon tile (the Gmail mark for
  emails, the iOS Phone icon for phones), bars from zero.
- **The junction frames are stripped of their PNG colour chunks**: a cICP chunk made Chrome draw them about 4 % darker
  (junction PSNR 31 dB → 43 dB once stripped).
- **ONE music for the whole video**: it starts in the dressed intro and goes on (the motion parts rendered without
  music, the bed laid once at the assembly, ducked under the voices, faded out over the end card).

## 2026-10-13 · the render

- **The 1080p draft for review, the 4K only when the user says so**: « only once I tell you, we'll do the 4K render ».
  A 720p preview (crf 24) goes with the draft: the big file would not open in a chat.
- **4K, learned on the reference**: the motion parts drawn natively at 4K (deviceScaleFactor 2; the F1 cells then 8 px);
  frames captured as JPEG quality 95 (one CDP message over about 4 MB hangs); full Google Chrome (the headless shell
  stalls on the second 4K frame, and draws no WebGL); the intro and cutbacks composed again from the 4K take (their
  1080p masks upscaled smoothly: they are feathered); the stock shots' frames upscaled with lanczos; H.264 High crf 15
  slow, AAC 320k. The loudness measured on the sound alone (`-vn`): a measure over the whole 4K file took 1 h 45; then
  ONE encode.
- **Never delete the user's files without asking** (Ihsane declined deleting old test videos to free disk space: work
  within the space). A bounded job may run directly when Portly hangs: say so.

## 2026-10-13 · round 13: real figures, from one study

- **Figures come from a study, or they are not shown**: Pipecorn's feedback (validated by Ihsane) on the benchmark. The
  waterfalls' numbers are the Hyperline phone & email test (2026, published at pipecorn.com/pipecorn-vs-fullenrich);
  the single providers' email rates come from Pipecorn's site; their phone rates had been invented in the draft: removed,
  the phones chart shows the three waterfalls only. « Illustrative figures » removed; each chart carries
  « Source: Hyperline phone & email test, 2026 · pipecorn.com/pipecorn-vs-fullenrich », mono, discreet.
- **The voice says who ran the test and how**: « in a test made by Hyperline, an independent start-up. Their reps called
  every number, and a number only counted if it reached the right person » (a voice patch; a wording with « several
  teams » and « the link in the description » was cancelled: « actually what you had is fine »).
- **The screen shows the study itself**: its real page in a browser frame with its URL, Hyperline's real logo with
  « Independent test · Hyperline », the agents on the phone on « their reps called every number », then « Counted only
  if it reached the right person ».
- **Transparency in the description**: the study's page says Hyperline is a Pipecorn customer; the description says so
  too (« Hyperline is a Pipecorn customer »), with the study's link and the free trial as the first link.


## 2026-10-14 · the YouTube video editor: three ways

- **One skill, three ways** (Ihsane): the skill is now « YouTube video editor » (`/video-youtube-editor`;
  `/video-voiceover` kept as an alias; the folder and the id stay `voiceover-video`, so the runs already made still show
  in Activity). A complete edit of horizontal, often long videos: **facecam** (the whole video filmed, the real voice),
  **AI voice** (no filming), **hybrid** (the filmed intro and cutbacks, the cloned voice: the reference's way).
- **Facecam**: the real voice runs all along; the face carries the moments that need it, the motion design the rest, in
  that same voice; cut tight as the derush does (a retake, a filler, a pause over 0.5 s cut out), at the face shots'
  speed so the voice never changes pace between a face shot and a part. Proved on 0:44–1:34 of Ihsane's « Trouvez plus
  de leads qualifiés » take (`workspace/videos/yt-facecam-proof.mp4`, 44.6 s).
- **AI voice**: no junction, the parts follow each other; the music from the first frame, 12 LU under the voice before
  the master. Proved on the same passage's text with Ihsane's clone (`workspace/videos/yt-ai-proof.mp4`, 40.0 s).

## 2026-10-14 · a long facecam video: chapters, the marker, the music

On « Créer le meilleur système d'acquisition B2B » (Nico, 12:13 filmed with Tella, his face and his screen share of the
same take; `workspace/projects/acquisition-b2b`, 11:09 at ×1.1):
- **The real voice runs all along** (« pas besoin de faire une voix avec Eleven Labs »); the whole take at ×1.1, picture
  and voice together, so a face shot and a drawn screen never change pace; 18 dressed face shots and 17 drawn parts,
  cut in the silences between sentences.
- **His slides were the reference, never on screen**: « refaire les visuels avec un meilleur design, déplacer la caméra
  dessus, zoomer au bon endroit, entourer, highlighter ». The complete map built node for node (×2 in the cam, read at
  0.5), unreadable at first, readable when the camera goes in, built piece by piece on its words at level 3.
- **The junction face ↔ screen**: frequent cuts asked for another transition than the print, « qui se rapporte à la
  transition entre les écrans blancs et jaunes, avec un petit effet sonore »: the yellow torn sheet (`sweep`).
- **Long videos need chapters** (« trop d'informations d'un coup, pas assez découpé »): five chapter screens shown (the
  held V page, a table of contents, the funnel lighting up, a dark plate with a giant number, a collage): **the held V
  page kept**, with the riser of the funnel one (« j'aime bien le SFX riser »). Ten chapters for 11 minutes.
- **The music must change** (« on ne peut pas rester sur la musique d'intro pendant 11 minutes »), the second track a
  little lower (« le but, c'est vraiment d'entendre le propos »).
- **The progress marker**, four rounds: (1) pills, a line of dots, a levels stepper, a corner tab, a breadcrumb; (2)
  between the stepper and the breadcrumb, « plus de design, plus de brand », the next step PIXELATED rather than
  blurred, a mascot on the sign; (3) the official mascots only (`Pipecorn/Assets/Frame 48.svg`, `Frame 49.svg`: « pas
  cette mascotte-là »); (4) the dark breadcrumb kept, made square in the Fr1 frame's language, the mascot never seen
  under the bar, shown only a few seconds after the chapter page, out on mechanical sounds (« appareil photo, clic »).
  « J'aime beaucoup. » Then made in white and in yellow to compare: the yellow first (« on part sur le jaune »), then **the white kept** (« je préfère la version blanche finalement »).

## 2026-10-14 · the same features on « leads-qualifies » (6:48)

- **The yellow sheet on every face ↔ screen cut: « ça fait trop »**. Kept only on the cut into a chapter's yellow page;
  plain cuts elsewhere (chosen over a short blur and a small zoom).
- **Fewer chapters**: 3 for 6:48 (what a good lead is, way 1 LinkedIn, way 2 Pipecorn); the end is « juste une
  explication », not a chapter. The « one every 40 s to 1 min 40 » rule is dropped: the big parts of the plan only.
- **The music change at chapter 1: good**, but Hip Hop 02 after Gimme was too close: a calmer track in another register,
  **Convergence** picked (out of Secret Garden, ridgeclub, Convergence, under his voice).
- **The marker in white.**

## 2026-10-15 · acquisition-b2b v2 → v3

- **The sound « fait n'importe quoi »** at 0:21 and after the yellow pages (5:20): the three parts whose voice got a
  silence for their chapter page came out 8-bit (ffmpeg's `anullsrc` is u8 and the concat took its format): a broadband
  hiss on every word. Every input forced to float: gone (the band over 15 kHz back from -46 to -49 dB, like v1).
- **One music per chapter**, not only at the first: Convergence, then TA1LS « FATIGUE », then alvedon « retire » (the
  last two added to the shelf by Ihsane).

## 2026-10-15 · leads-qualifies v7 → v8 (extracts)

- **Too many clicks, too loud**: the isolated real voice sits near -36 LUFS, the sounds were set for a clone at -28: every
  sound 8 dB too loud. render.mjs now sets the sounds' level from the voice (like intro.mjs); the click is one every 2.5 s
  at most, 4 dB lower, no glitch on a stamp (engine.js › soundPass).
- **The screen shares stuttered**: the frame index used `round()` on a time offset of 0.25 s = 7.5 frames: ties, a frame
  repeated then one skipped. A frame index is always `floor(… + 1e-3)` (F.motionPage does; the project's screen component
  too).
- **Boring cards** → **motion scenes** (`motion-scenes.md`): the shorts' tree-a/b/c techniques in 16:9 (the 3D floor, the
  type tree, the elevator), 2–3 per long video, never the same scene twice for one concept. Approved on the extracts.
- **People drawn, not photographed** (same day): the AI headshots looked fake. Four styles proposed; Ihsane pointed at
  Pipecorn's own illustrations (Frame 48 / 49): the people are now drawn in that hand (`scripts/people.mjs`, the refs in
  plugins/video/assets/illustrations/pipecorn/, Your brand's illustrations first when there are some), a prop per role.
