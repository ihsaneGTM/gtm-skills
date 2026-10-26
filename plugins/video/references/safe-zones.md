# The feed's safe zones: every style

Instagram, TikTok and YouTube Shorts draw their own interface over the video:
- their tabs at the top;
- the account, the caption, the music and the progress bar at the bottom;
- the like, comment, share and send buttons in a column on the right.

On 2026-10-05, Ihsane brought two screenshots of a Reel with these zones painted in red and said:
"je crois que nous, on a fait cette erreur-là". Our headlines were "tout collés en haut", over the
tabs.

The zones were measured on those screenshots (923 × 2000, the video filling the screen). Values
are fractions of the frame; the px values are for a 1080 × 1920 frame. The code is
`plugins/video/skills/short-editor/scripts/safezones.mjs` (`SAFE`, `FORBIDDEN`, `zoneOf`,
`clampToSafe`).

| Zone | Where | Rule |
|---|---|---|
| **Safe** | x 0.095 – 0.905, y 0.128 – 0.774 (103–977 px, 246–1486 px) | Text and what matters go here. |
| **Forbidden** | the bottom band, y ≥ 0.79 (≥ 1517 px), full width | Never a text, never an important element. |
| **Forbidden** | the buttons, x ≥ 0.84 (≥ 907 px) from y 0.425 (816 px) down | The same. |
| **Danger** | the rest: the top band under the tabs, the side margins | A small part of an element may overflow into it when the framing forces it (a very tight shot). Never a whole line of text, and never as the rule. |

## The consequences

- **Below y 0.425, a centred element is at most 0.68 of the width wide** (x 0.16 – 0.84). Above
  that height it can be 0.81 wide.
- **What counts:**
  - every text: headlines, captions, subtitles, titles, the typed record, labels and tags, numbers;
  - every important element: logos, stickers, GIFs and polaroids, screens, the next-video frame;
  - **the speaker's face**.
- **What may pass under the feed's interface:** the speaker's body and the background. Every
  talking-head video has its chest under the caption.
- **When the speaker's head fills the top of the safe area** (a tight shot, the head starting
  around y 0.13–0.15), there is no room above it.
  - The words go **below the head**, in front of the speaker (the over layer), the block's bottom
    on the safe area's (y 0.765).
  - They are never squeezed against the top edge.
  - Overflowing a little on the sides or the top is only for a very tight shot, and only a little.

## What each style does now (2026-10-05)

### 1 · Dynamic text (short-editor)

- **Headlines** (`headline.mjs` `layoutHeadline`, used by `headlines` and `proHeadlines`):
  - The block's top is never above 0.132.
  - Each line is no wider than the safe area leaves it at its height.
  - `anchor: "bottom"` sets `y` as the block's bottom, for the words below the head.
  - `safe: false` turns this off, only for an effect meant to run off the frame.
- **The gate:** `occlusion.mjs` measures every headline line against the zones before it measures
  what the head hides. A line in a forbidden zone fails; a line out of the safe area warns.
- **The countdown** (`paperend.mjs`): it now sits at y 0.64 by default, with `scale` to shrink it
  under the chin.
- **The logos and the next video** are placed inside the safe area by the plan.
- **The Pipecorn generic**: its slot sits at y 0.385, so its words end above 0.425 and may take
  the safe area's whole width; the wordmark is 720 px wide.

### 2 · Cold call transcript (cold-call-editor)

- **The typed record**: the newest line at y 0.755 (it was 0.80), from x 0.10 to 0.84 (it was
  0.07 – 0.93).
- **The voice line**: x 0.10 – 0.84.
- **The ringing stickers**: at x 0.30 and 0.69, 260 px (they were 0.235 and 0.765, 300 px).

### 3 · Scrapbook (scrapbook-editor)

- **The captions**: centred on y 0.725 (it was 0.765), chunks at most 0.66 of the width.
- **The polaroids**: their picture is 0.62 of the width at most, 0.26 of the height (it was 0.80 /
  0.30).
  - `card()` fits the turned print between x 0.095 and 0.84 and inside the safe height.
  - The slot is centred on x 0.4675, the middle of that band, at the same height as before
    (0.44 – 0.50, under the face).
- **Every sticker and its tag** is moved inside the safe area by `sticker()`.
- **Titles and headers**: the rows are fitted to the room they have at their height, the first row
  at 0.158 at least, the section header at 0.168, the paper label at 0.155, the mascot at 0.16.

### 4 · Split explainer (explainer-editor)

- **The speaker's frame**: it rises to y 0.64 (1229 px; it was 0.731), so the face ends above
  the feed's caption. The frame still runs past the bottom edge.
- **The title**: its first baseline at 0.156 (it was 0.086).
- **The stage**: a figure placed by hand is moved inside the safe area at rest (`Node`, `safe: false`
  to opt out).
- **The next-video frames and their captions** sit between x 0.16 and 0.84 and above 0.774.
- **The take's framing**: after changing the frame, run `layout.mjs --measure --write` again (the
  caption's height follows the frame).

## Checking it

- **On any video:** `node $S/safezones.mjs --overlay in.mp4 out.mp4` draws the zones over it, as
  on the screenshots: danger in light red, forbidden in strong red, the safe area outlined in white.
  It also works on a still (`.jpg`, `.png`).
- **For an option or a review**, show the moment with the zones drawn on it.
