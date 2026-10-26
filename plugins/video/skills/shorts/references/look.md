# The look of a short

## Decisions (Ihsane's reviews, do not reopen)

- **2026-10-14, round 1 refused** (Document · Headline / Captions / Desk, `workspace/videos/shorts-leads-{1,2,3}-*.mp4`):
  « j'aime pas du tout les styles ». Three rules came out of it:
  1. **Your face from the first frame.** The hook is you saying it; never an intro screen (a voice line on the paper as
     the opening was refused). A voice line is a bridge in the middle, over a cutaway.
  2. **The base is Dynamic text** (`/video-short-editor`'s vertical language: Impact capitals, the payoff in yellow, one
     Sacramento accent, two-layer shadows, the glitch, the opening de-zoom, the SFX pack and its flash), « vraiment pas
     mal »; not a new type system.
  3. **Add the long video's pictures and their effects**: GIFs sometimes, stock videos sometimes, with the shadows, the
     screen effect (the fine grid, grain, vignette), the motion blur that the shorts did not have.
- **2026-10-14, the framing**: « on est très zoomé sur ma tête » → a landscape take is sliced ×1.25 wider than 9:16
  (`cut.mjs --zoom`, picked on stills among ×1.0 / ×1.25 / ×1.45), the speaker at the bottom, the wall prolonged above
  them (its top rows stretched and softened, a 90 px fade: a blurred copy of the frame showed a blurred head, refused
  before it was shown). The room above the head takes the Prints style's pictures.
- **2026-10-14, the words go back to the top**: « normalement il met les sous-titres au-dessus de moi, un peu derrière
  moi » → with the zoom, the words sit in the room above the head (y 0.135), behind it (the matte), the top of the room
  in shadow, TWO lines at most a screen (a third sank behind the head with its yellow word), checked by the engine's
  `occlusion.mjs` (0 word over 30 %). The pictures moved out of that zone: Prints on the chest, Behind you at the
  shoulders. Over a cutaway the words come in front of it.
- **2026-10-14, round 9** (« là, c'est vraiment beaucoup mieux… très pédagogique, fais-moi pareil pour les autres »):
  **a white page draws the IDEA as a schema that moves, never cards in a row.** Find the picture of the reasoning (a
  hierarchy, a path, a filter, a flow, a before/after) and animate it on the words: the leads video's three pages are
  the reference (`doc/tree-story.js`: the company's decision tree drawn in ink, the CMO ringed and « Can buy », the
  camera going down to the senior SDR we target, a yellow dot carrying the influence up the branches to the CMO;
  `doc/radar-story.js`: the list of companies swept by a radar on « hiring », the ones hiring lit with their job post,
  the others fading, then their sales rising; `doc/funnel-story.js`: a crowd of leads falling through the three filters,
  most pushed out, the yellow ones landing in « Your list », then the 95 % knockout). The camera of the engine follows
  the action (close, then back, then down to what matters). Labels only, no sentence.
  Round 8 tried six ways to make a page live (A as it was, B the face in a window of the page, C the camera's journey,
  D collage and ink, E a video in the page, F a breathing page): the schema won over all of them.
- **2026-10-14, round 7**: « on gère mal l'espace, on met trop de texte à l'écran pour rien… je l'ai déjà dit à l'oral…
  le but c'est d'illustrer » → **on a page, nothing restates the voice** (no editorial line saying what he says, no
  caption under a GIF): the subtitles carry the words, the page carries a picture of them (people as profile cards,
  companies as job posts, a list as the method list). **Laid for the vertical**: one column, stacked, each page cropped
  to its content so it fills ~0.75 of the width, centred in the free height (0.19-0.77). « Le 95 % en full screen,
  toute la largeur, un effet de transparence… il sert de transition avec la fin de la page » → `whitePage({ knockout })`:
  the number counts in ink across 0.94 of the width, then is knocked out of the paper while the camera pushes in on the
  face (1.9×) so his face shows through the letters, and the page leaves THROUGH the number (it grows from inside a
  letter's stroke) as the camera pulls back to 1.0.
- **2026-10-14, round 6**: « les visuels ne sont pas du tout au niveau de notre skill /video-youtube-editor… la to-do
  list pas pareille… l'étape 2 pixelisée » → **a white page's content is drawn by the long video's own engine**
  (`docpage.mjs`: a Document story per page, `doc/<page>-story.js`, its blocks as they are: B.method with the rules not
  said yet pixelated, ed() lines with the marker, profileCard, the sheet, counters), on a transparent page laid on the
  sheet (`docLayer`), cropped to its content so it fills the width; its own sounds ~19 LU under the voice. A list said
  in a breath is shown whole and still (its overview), its rules unlocking 0.6 s apart, without its slide's motion blur.
  « La musique est peut-être un peu trop forte » → the bed **19 LU under the voice** (was 15).
- **2026-10-14, round 5**: « tout est très bien », the crickets GIF out (« retire le GIF avec le cafard »); « ça manque
  peut-être un peu de plans » → **the white page** (`whitePage`): the long video's yellow V-page move (a torn top edge
  rising in 0.45 s, blurred by its motion, a warm light, leaving upwards by its torn bottom edge), but white with the
  long video's textures, to set an explanation down as a small schema (`pcard`, `parrow`, `pchip`, `pcheck`, `pbig`);
  **2 or 3 in a 1 min 30 at most**. The words on it step down to ink subtitles at the top of the sheet; a phrase never
  runs across a page's edge; the page covers the frame before its first word (it starts 0.45 s before). On the leads
  video: the two kinds of deciders, the hiring signal, the recap with 95 % (`shorts-leads-9-bad-list-90s-pages.mp4`).
- **2026-10-14, round 4**: the hook title (« hook-title ») kept; the 1 min and 1 min 30 versions liked; « au début,
  en plus du hook title, quelques petites images qui donnent le mood… en rapport avec le sujet » → `moodOpen`: on the
  leads video, an empty mail tray, a dartboard, contact cards, a magnifier on a list (Nano Banana 2 stickers) and the
  LinkedIn and Gmail icons, out from behind the head, two columns clear of the face, gone as the words begin.
- **2026-10-14, round 3** (Ihsane): « la 5, c'est la meilleure » → **Behind you is the default style**.
  « tu fais des extraits trop courts… j'ai même pas eu le temps d'expliquer mon propos » → **each subject in three
  lengths**: ~30 s, ~1 min, ~1 min 30 (as the take allows), the longer ones explaining further (more of the take, the
  examples). « La musique n'est pas du tout adaptée… un truc un peu moins commercial » → a calmer bed (a board of the
  shelf's calm tracks, Ihsane picks). « Un hook visuel… du texte qui explique le sujet, la problématique… ce qu'on va
  lire en premier quand on scroll » → **the visual hook**, the first ~3 s before the words begin: the problem as a title
  above the head (`hookTitle`) and/or a designed card on the chest (`hookPanel`: a yellow tag, the problem in Impact with
  the marker, one line); the three ways shown as slices, waiting for the pick. A picture every 3 to 6 s holds in the
  long versions too.
- **2026-10-14, round 2** (`workspace/videos/shorts-leads-{4,5,6}-bad-list-*.mp4`): Prints / Behind you / Cutaways,
  waiting for Ihsane's verdict.

## What every short has (round 2)
- The hook: the take's own strongest line, the face from frame 0, the de-zoom 1.30 → 1.00 with its whoosh, the words in
  Dynamic text, the glitch (picture and the pack's sound) on the hook's first yellow word.
- The words all along, phrase by phrase (`dtHeadlines`): never one or two words left alone, a phrase leaves before the
  next lands. A landscape take reframed has the head at the top: the words below it, in front (the validated tight-shot
  rule, anchor bottom 0.765); under a picture over the face, they stay small.
- The pictures (`dt.mjs`, `doc.mjs › print`): a stock shot as a floating screen (rounded corners, a white rim, two
  shadows lifting while it flies, the screen grid, grain, vignette, a light sweep across the glass, an entrance blurred
  by its motion); a GIF as a pinned print (white border, the yellow pin, two shadows, motion blur); a stock shot over
  the whole frame (`cutaway`: the screen effect, a slow push, the pack's flash on the cut). Where they go is the style
  (styles.json): over the top of the frame, out from behind the head (the matte), or over the whole frame.
- A voice line is ALWAYS under a cutaway. The camera: the jump cuts alternate wide / close, a punch on a payoff word;
  the riser ends on the payoff number.

## Round 10 (2026-10-14): motion pages, After Effects level
Ihsane: the tree's schema got cropped top and bottom when the page zoomed (the 16:9 engine's column); the radar's cards and
the falling-balls funnel and the knocked-out 95% « pas fou… on peut faire 100 fois mieux… très osées, très dans la brand,
très style After Effects ». Answer: `scripts/motionpage.mjs` + `motion-kit/` — a page is a gsap scene over the WHOLE vertical
frame (1080×1920, transparent, no inner frame, so nothing is cut but by the frame's edge), laid on the sheet by
docLayer({ y: 0, w: 1 }); a last page can take the paper over (`handoff`) and cut it to open onto the face, with its own
camera steps. Nine variants made in parallel (shorts-leads short 9, motion/tree|radar|recap/*-a|b|c.html), awaiting review:
tree a 3D floor / b type tree / c elevator; radar a job feed / b isometric city / c signal wave; recap a rows / b odometer
+ blade split / c three rings → portholes, dive onto the eye.
Review (2026-10-15): tree **B** (type tree) and recap **B** (odometer + blade split) chosen; « j'aime énormément » all three
trees: keep a, b, c as references (references/pages/motion/, with all nine). Radar: B and C liked; D asked = B's city, then
the platform itself TRANSFORMS (no floating island) into C's team stage, and a FULL layered chart taking the whole bottom of
the screen (C's was « timide »); B's sound levels are right.

## Round 11 (2026-10-15): the end card of an extract
Ihsane: a short cut from a long video ends with its call to action: the screen turns off (a screen-off sound, layered
from the packs), then « Watch the entire video », the long video's thumbnail in a YouTube-like player that looks
clickable (play button, red bar, its real length), a tilted YouTube logo above it. An OPAQUE motion page starting on the
short's last frame (motion/cta/<v>.html, img/last.png + img/thumb.jpg), joined by `scripts/endcard.mjs` (its sounds at
the short's level, the music powering down with the screen). Three made, awaiting the choice: a the CRT off → player
powering on; b the screen is a phone falling onto the Pipecorn paper desk; c glitch off → the dot becomes the scrubber,
the bar the hinge the player swings up from (« this was a clip of the long one »). References: references/pages/motion/cta-*.html.
Round 12 (2026-10-15): card **B** chosen, with the channel shown (« Pipecorn », round logo, under the player); the end card
is an OPTION the skill offers at the start of a run from a long video. (2026-10-15: for any other user the channel row is their brand's name and logo, from Your brand, never « Pipecorn ».) A ~30 s version made with the edit as it stands
(short 10: hook, turn, « three things », the recap page and 95%, card B).
