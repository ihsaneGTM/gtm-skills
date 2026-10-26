// A key, read the way the GTM by Pipecorn interface reads it (os/lib/status.mjs): the environment
// first, then .env.local at the root of the GTM by Pipecorn folder. A key is never printed, never
// written anywhere else, never put in a URL that is logged.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
export function key(name) {
  if (process.env[name]) return process.env[name];
  const f = path.join(process.env.GTM_OS_ROOT || ROOT, ".env.local");
  try {
    for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && m[1] === name) {
        const v = m[2].replace(/^(['"])(.*)\1$/, "$2");
        if (v && !/^(your[_-]|xxx|changeme|<)/i.test(v)) return v;
      }
    }
  } catch {}
  return null;
}
