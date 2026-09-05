export type RiddleKind = "word" | "choice";

export interface RiddlePrompt {
  bankId: string;
  title: string;
  prompt: string;
  kind: RiddleKind;
  answer: string[];
  options?: string[];
}

export interface ParsedHadanky {
  bank: RiddlePrompt[];
  alencina: RiddlePrompt;
}

const ID_RE = /^[a-z][a-z0-9-]*$/;

function fail(id: string, msg: string): never {
  throw new Error(`hadanky.md [${id}]: ${msg}`);
}

export function parseHadanky(source: string): ParsedHadanky {
  const stripped = source.replace(/```[\s\S]*?```/g, "");
  const chunks = stripped.split(/^## /m).slice(1);
  const bank: RiddlePrompt[] = [];
  let alencina: RiddlePrompt | null = null;
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/);
    const head = (lines[0] ?? "").trim();
    const m = /^(bank|fixed):([a-z0-9-]+)$/.exec(head);
    if (!m) continue;
    const kindHead = m[1];
    const id = m[2];
    if (!ID_RE.test(id)) fail(id, "id smí obsahovat jen a-z, 0-9 a pomlčku");
    if (seen.has(id)) fail(id, "duplicitní id");
    seen.add(id);

    const fields: Record<string, string> = {};
    for (const line of lines.slice(1)) {
      const t = line.trim();
      if (!t || t.startsWith("#") || t.startsWith("```") || t.startsWith("---")) continue;
      const colon = t.indexOf(":");
      if (colon < 1) continue;
      const key = t.slice(0, colon).trim();
      const val = t.slice(colon + 1).trim();
      if (key && val) fields[key] = val;
    }

    const title = fields.title;
    const prompt = fields.prompt;
    const kind = fields.kind as RiddleKind;
    const answer = (fields.answer ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!title) fail(id, "chybí title");
    if (!prompt) fail(id, "chybí prompt");
    if (kind !== "word" && kind !== "choice") fail(id, "kind musí být word nebo choice");
    if (!answer.length) fail(id, "chybí answer");

    let options: string[] | undefined;
    if (kind === "choice") {
      options = (fields.options ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (options.length !== 5) fail(id, "choice potřebuje právě 5 options");
      const norm = (s: string) => s.toLowerCase();
      if (!answer.some((a) => options!.some((o) => norm(o) === norm(a)))) {
        fail(id, "ani jedna odpověď není v options");
      }
    }

    const item: RiddlePrompt = { bankId: id, title, prompt, kind, answer, options };
    if (kindHead === "fixed") {
      if (id !== "alencina") fail(id, "fixed smí být jen alencina");
      alencina = item;
    } else {
      bank.push(item);
      if (id === "alencina" && !alencina) alencina = item;
    }
  }

  if (bank.length < 5) fail("bank", `potřeba alespoň 5 hádanek na pět papírů, je ${bank.length}`);
  if (!alencina) fail("alencina", "chybí bank:alencina nebo fixed:alencina");
  return { bank, alencina };
}
