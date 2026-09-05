import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "hadanky.md"), "utf8").replace(/```[\s\S]*?```/g, "");

const ID_RE = /^[a-z][a-z0-9-]*$/;
const chunks = source.split(/^## /m).slice(1);
const bank = [];
let alencina = null;
const seen = new Set();

for (const chunk of chunks) {
  const lines = chunk.split(/\r?\n/);
  const head = (lines[0] ?? "").trim();
  const m = /^(bank|fixed):([a-z0-9-]+)$/.exec(head);
  if (!m) continue;
  const kindHead = m[1];
  const id = m[2];
  if (!ID_RE.test(id)) throw new Error(`hadanky.md [${id}]: špatné id`);
  if (seen.has(id)) throw new Error(`hadanky.md [${id}]: duplicitní id`);
  seen.add(id);
  const fields = {};
  for (const line of lines.slice(1)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("```") || t.startsWith("---")) continue;
    const colon = t.indexOf(":");
    if (colon < 1) continue;
    fields[t.slice(0, colon).trim()] = t.slice(colon + 1).trim();
  }
  if (!fields.title || !fields.prompt || !fields.answer) {
    throw new Error(`hadanky.md [${id}]: chybí title/prompt/answer`);
  }
  if (fields.kind !== "word" && fields.kind !== "choice") {
    throw new Error(`hadanky.md [${id}]: kind musí být word nebo choice`);
  }
  if (kindHead === "fixed") alencina = id;
  else bank.push(id);
}

if (bank.length < 25) throw new Error(`hadanky.md: potřeba 25 hádanek, je ${bank.length}`);
if (alencina !== "alencina") throw new Error("hadanky.md: chybí fixed:alencina");
console.log(`OK ${bank.length} bank + ${alencina}`);
