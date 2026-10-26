# Three versions of one short

The memo holds the **substance** (le fond): what the user really had to say. It is the most
important part and it is theirs. The versions only change the **form**: the order, the opening, the
rhythm, the words to say it out loud in the video's language. Three, so the user hears them side
by side and keeps the one that sounds like them (Ihsane: "il ne va pas me faire juste une
retranscription restructurée, il va m'en faire trois").

## The three shapes

Every short gets these three, in this order, so they can be compared from one short to the next:

1. **Straight** (`name: "Straight"`): the memo's own order, tightened. Everything that wanders goes;
   the logic and the examples stay where the user put them. The closest to what was said.
2. **Hook first** (`name: "Hook first"`): opens on the strongest line of the point (a claim, a number
   the memo gives, a contrast), then why, then how, then the end. The same facts, in the order that
   keeps a scroller.
3. **The third shape fits the point** (pick one, and name it):
   - **Story**: a moment of the user's (what I tried, what went wrong, what I do now), told in the
     past, ending on the lesson. When the memo tells an experience.
   - **Contrarian**: opens against what people usually believe or do, then why the user does it
     otherwise. When the memo pushes back on something.
   - **List**: "3 things…", one line each, in the memo's order. When the memo enumerates.

Each version has a `how` of a few words saying what it does ("your order, tightened", "opens on the
claim", "the story of your first try").

## Writing for the mouth

The user reads the script once, in one take, on camera, and is free to say it in their own words
(Ihsane: "faut pas être trop strict sur le script… ça reste naturel"). So:

- **Like talking to a friend, in simple words**: read `plugins/video/references/how-you-talk.md`
  first, and the profile's `speaker` (the user is not a native English speaker: a B1 speaker's words,
  no idioms, no marketing words, no French built into English). `memo.mjs check` refuses the words
  of `plain-english.json`. The memo is the best guide to how they talk: keep their "honestly", their
  "so basically", their jokes. Never "Step one:", never a sentence that sounds written.
- **In the video's language** (profile `videoLanguage`, English unless it says otherwise), whatever
  language the memo is in. Translate the user's voice, not their words: their expressions, their
  directness, their humour, as a native speaker of that language would say them.
- Short sentences, 12 words most of the time and 16 at most (checked), one idea each. Contractions. "I" and "you". No jargon the memo
  does not use. No "In today's video", no "Let's dive in", no em dashes, nothing a person would not say.
- **The hook** (`hook`) is the first line said, 6 seconds at most (22 words), and the script starts
  with it. It makes a promise the body keeps.
- **The body** moves forward: each sentence gives a reason to hear the next ("but", "so", "here's
  the thing"). Cut what repeats.
- **The end** lands the point in one line, then the lead magnet.

## Laid out for the teleprompter

The user reads the script on the teleprompter, so write it the way it is said (Ihsane, 2026-10-08:
"je sais pas trop quand est-ce que je dois prendre des pauses, faire des sauts de ligne"):

- **A sentence a line** (`\n` between two): a new line is a breath.
- **Beats, a blank line between two** (`\n\n`): a beat is one idea, 1 to 4 sentences; a new beat
  where the talk turns ("But…", "So…", "Then…"), and the blank line is a real pause. The teleprompter
  and the script reader show it.
- **The hook alone** as the first beat, **the lead magnet** as the last.

```
Here's how I make my videos right now, from my phone to LinkedIn.

It starts with a voice memo.
I have an idea, I swipe up, I talk into my phone.

But it's messy.
Often too long, not very lively.
```

`memo.mjs check` refuses a script of more than 40 words in one block, a hook that is not alone, and a
beat of more than 4 sentences. The same for the long version.

## The lead magnet, in every version

Every version ends on the lead magnet of the profile (`leadMagnet.line`, its `keywords` must be in
the script): said naturally, in one or two sentences, tied to the point when it can be ("I put the
skill that does this in…"). `memo.mjs check` refuses a version without it. If the profile's lead
magnet is still `toConfirm`, use it as it is and say so once in your final message.

**No lead magnet** (`leadMagnet.line` empty: the user left it blank in the memo's window): the
versions end on the point, with no offer, and `magnet` is left out. Never make one up.

## Nothing invented

- No number, name, result, client, tool or claim that the memo does not say. A version may say less
  than the memo, never more. If a point needs a proof the memo does not give, say it in a feedback
  ("add a number here"), do not make one up.
- `quotes`: 1 to 3 short quotes of the memo, in its language, word for word, that the short stands
  on. `memo.mjs check` looks for them in the short's ranges.
- Keep the user's opinions as theirs, even the strong ones. Soften nothing, sharpen nothing they
  did not mean.
