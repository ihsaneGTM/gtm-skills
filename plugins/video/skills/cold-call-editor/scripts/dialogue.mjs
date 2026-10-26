// THE WORDS OF THE RECORD — dialogue.json: what is typed, turn by turn.
//
//   node dialogue.mjs --draft     # writes dialogue.json from assets/words-fixed.json
//   node dialogue.mjs             # prints it back, with the times, for reading
//
// A recorded call is typed VERBATIM, cleaned of what nobody would write down: the
// hesitations ("uh", "um", "ah") and the false starts ("I, I'm" → "I'm", "me me" → "me",
// a word whisper cut with a hyphen). The draft does that and nothing else, then it is READ:
// the punctuation a question needs ("?"), a name the transcript spelt wrong (`"Kyles"` for
// "kyle's"), a false start the rules missed ("that- is that you"). Never a word rewritten,
// never one added; a word left out is listed in `dropped`, and the delivery message says how
// many and which kind.
//
// One turn per run of one speaker (diarize.py); a word said OVER the other voice ("Absolutely."
// under the prospect) is a turn of its own, so it gets its own line, as in a real record.
// The hook is its own session: the words of project.json assembly [hookFrom, hookTo); the
// call is [resume, end). Each word is [index in words.json, the text typed]: the index
// gives its onset (plan.mjs `on`, with `FIX`), the text is typed as it stands.
import fs from "node:fs";

const P = JSON.parse(fs.readFileSync("project.json", "utf8"));
const FW = JSON.parse(fs.readFileSync("assets/words-fixed.json", "utf8"));
const W = FW.words;
const A = P.assembly;

if (process.argv.includes("--draft")) {
  if (!A) { console.error("project.json has no `assembly`: choose the hook first (SKILL.md § 4)"); process.exit(1); }
  if (fs.existsSync("dialogue.json") && !process.argv.includes("--force")) {
    console.error("dialogue.json exists and may hold corrections: --draft --force to start it again"); process.exit(1);
  }
  const FILLERS = new Set(["uh", "uhh", "uhm", "um", "umm", "ah", "er", "erm", "hmm", "hm", "euh", "heu", "hum"]);
  // a word said twice in a row is a false start when doubling it cannot be grammar ("me me",
  // "the the"); "do do" can be ("unless you do. Do you know…"): kept, and flagged for reading
  const STUTTER = new Set(["i", "me", "my", "the", "a", "an", "to", "it", "we", "he", "she", "they", "of", "in", "on", "and", "but", "or", "is", "je", "le", "la", "les", "un", "une", "de", "et"]);
  const norm = w => w.toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");
  const names = new Set([P.speakers?.A?.name, P.speakers?.B?.name, ...(P.names ?? [])].filter(Boolean).map(s => s.toLowerCase()));
  const dropped = [], repeats = [];
  const keep = (q, i, list) => {
    const n = norm(q.w), next = list[i + 1] ? norm(list[i + 1].w) : null;
    if (FILLERS.has(n)) return "hesitation";
    if (/-$/.test(q.w)) return "false start";
    if (next && next.startsWith(n + "'")) return "false start";                    // "i i'm"
    if (next && next === n) { if (STUTTER.has(n)) return "false start"; repeats.push([q.i, q.w]); }
    return null;
  };
  const session = (from, to) => {
    const ws = W.filter(q => q.a >= from - 1e-6 && (to == null || q.a < to));
    const turns = [];
    for (const q of ws) {
      const last = turns[turns.length - 1];
      if (last && last.who === q.who) last.q.push(q); else turns.push({ who: q.who, q: [q] });
    }
    return turns.map(t => {
      const kept = [];
      t.q.forEach((q, i) => { const why = keep(q, i, t.q); if (why) dropped.push([q.i, q.w, why]); else kept.push(q); });
      // the case: whisper's when it gave one, else sentence case, "I", and the names
      let start = true;
      const words = kept.map((q, j) => {
        let s = q.w;
        if (s === s.toLowerCase()) {
          if (/^i('|$)/.test(s)) s = "I" + s.slice(1);
          else if (names.has(norm(s).replace(/'s$/, ""))) s = s[0].toUpperCase() + s.slice(1);
          else if (start) s = s[0].toUpperCase() + s.slice(1);
        }
        start = /[.?!]$/.test(s);
        if (j === kept.length - 1 && !/[.?!,]$/.test(s)) s += ".";
        return [q.i, s];
      });
      return { who: t.who, words };
    }).filter(t => t.words.length);
  };
  const D = {
    _note: "Typed as it stands, word by word on its onset. Mend the punctuation (a question takes ?), a misspelt name, a false start the draft missed; never rewrite or add a word. `dropped` is what is not on screen.",
    hook: session(A.hookFrom, A.hookTo),
    call: session(A.resume, A.end ?? null),
    dropped,
  };
  // the hook is cut out of the call, so its words also live in the call when the hook was
  // copied from inside it: that is expected, not a duplicate
  fs.writeFileSync("dialogue.json", JSON.stringify(D, null, 1).replace(/\[\n\s+(\d+),\n\s+("(?:[^"\\]|\\.)*")\n\s+\]/g, "[$1, $2]") + "\n");
  console.log(`dialogue.json: hook ${D.hook.length} turn(s), call ${D.call.length} turns · dropped ${dropped.length} word(s): `
    + Object.entries(dropped.reduce((m, [, , why]) => ((m[why] = (m[why] ?? 0) + 1), m), {})).map(([k, v]) => `${v} ${k}`).join(", "));
  if (repeats.length) console.log(`kept, to read: a word said twice in a row, grammar or a false start? ${repeats.map(([i, w]) => `${w}(${i})`).join(" · ")}`);
}

// read it back
const D = JSON.parse(fs.readFileSync("dialogue.json", "utf8"));
const names = { A: (P.speakers?.A?.name ?? "ME").toUpperCase(), B: (P.speakers?.B?.name ?? "PROSPECT").toUpperCase() };
for (const [label, turns] of [["HOOK", D.hook ?? []], ["CALL", D.call ?? []]]) {
  console.log(`\n── ${label}`);
  for (const t of turns) {
    const first = t.words[0][0];
    console.log(`${names[t.who].padEnd(10)} ${W[first].a.toFixed(2).padStart(6)}  [${first}-${t.words[t.words.length - 1][0]}]  ${t.words.map(w => w[1]).join(" ")}`);
  }
}
if (D.dropped?.length) console.log(`\nnot on screen (${D.dropped.length}): ${D.dropped.map(([i, w, why]) => `${w}(${i}, ${why})`).join(" · ")}`);
