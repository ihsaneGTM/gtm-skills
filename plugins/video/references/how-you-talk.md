# How you talk on camera

Every script the video skills write (`/video-memo`) is said out loud by the user, in
one take, looking at the camera. It has to sound like them talking, not like a text read aloud
(Ihsane, 2026-10-07: "comme si je parlais à un pote en face de moi, simple… je ne suis pas natif
d'anglais, donc il faut utiliser des mots simples").

The profile says who speaks (`workspace/studio/profile.json` › `speaker`): their own language, how
simple the words must be, how they talk. Read it first; what follows is the default.

## Like talking to a friend sitting in front of you

- **You tell, you don't present.** "So here's what I do now." / "Honestly, it changed everything for
  me." Not "Here is my process", not "Step one:". A friend never numbers their sentences out loud;
  "first… then… and after that…" is how people list.
- **Small spoken words are welcome**: so, okay, honestly, basically, the thing is, you know, look,
  and, but. One now and then, the way the user says them in the memo; never one per sentence.
- **"I" and "you"**, contractions always (I'm, it's, don't, that's, you'll).
- **Short sentences**, 12 words most of the time, 16 at most. One idea each. A fragment is fine
  ("Every single time.").
- **Say what happens, not what it is.** "I just talk into my phone" beats "I record a voice memo".
  "It cuts every time I mess up" beats "it removes the hesitations".
- **Keep the user's own way of saying things** from the memo: their expressions, their jokes,
  their opinions, their "honestly". The memo is the best guide to how they talk.

## Simple English (the user is not a native speaker)

Write with the words a good B1 speaker uses every day. If a 15-year-old learning English would not
know the word, use another one.

- **Common short words.** use, not utilize; help, not facilitate; show, not demonstrate; start, not
  initiate; easy, not seamless; big, not significant; fast, not efficient; really good, not
  exceptional.
- **No idioms or slang a learner would trip on**: no "game-changer", "low-hanging fruit",
  "move the needle", "nail it", "on the fly", "double down", "under the hood", "the secret sauce",
  "it's a no-brainer".
- **No marketing words**: leverage, unlock, elevate, streamline, empower, robust, crucial,
  cutting-edge, revolutionize, delve, harness, supercharge, effortless.
- **No French built into English** (calques): "my visual universe" is "my own style"; "the
  substance" is "what I want to say"; "realize a video" is "make a video"; "a feedback" is
  "some feedback" or "a note"; "actually" never means "right now" ("currently").
- **Words the user can say without tripping**: avoid long words with hard sounds (particularly,
  thoroughly, entrepreneurial, rural, specifically). Pick the short one.
- **Product names and the audience's own words stay** (Claude, Notion, LinkedIn, SDR, cold call):
  they are names, not big words.

## The check

`plain-english.json` (next to this file) lists the words and phrases to avoid. `memo.mjs check` and
`script.mjs check` refuse a script that uses one and say which word to change, with the simple one to
use instead. The list is a floor, not the rule: a sentence can pass the check and still sound
written. Read every script aloud in your head as the user, to a friend, before you keep it.
