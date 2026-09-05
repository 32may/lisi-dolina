export type RiddleKind = "word" | "choice";

export interface RiddleDef {
  id: string;
  title: string;
  prompt: string;
  kind: RiddleKind;
  answer: string[];
  options?: string[];
  keyName: string;
  color: string;
  doorLevel: number;
  secretLevel: number;
}

export interface RiddlePrompt {
  bankId: string;
  title: string;
  prompt: string;
  kind: RiddleKind;
  answer: string[];
  options?: string[];
}

export const RIDDLE_SLOTS = ["mapa", "tma", "jmeno", "houba", "mesic"] as const;
export type RiddleSlotId = (typeof RIDDLE_SLOTS)[number];

/** Pool of hádanky. Each new game picks 5 at random for the five papers. Alenčina stays fixed. */
export const RIDDLE_BANK: RiddlePrompt[] = [
  {
    bankId: "mapa",
    title: "List v jantaru",
    prompt: "Ležím ti na kolenou, ukážu hory i řeky, a přece neudělám krok. Co jsem?",
    kind: "word",
    answer: ["mapa", "mapka"],
  },
  {
    bankId: "tma",
    title: "Jiskrový lístek",
    prompt: "Čím víc mě je, tím míň vidíš. Co jsem?",
    kind: "word",
    answer: ["tma", "temnota"],
  },
  {
    bankId: "jmeno",
    title: "Útesový chyták",
    prompt: "Patří jen tobě, ale ostatní to říkají častěji než ty. Co to je?",
    kind: "word",
    answer: ["jmeno", "jméno", "moje jmeno", "moje jméno"],
  },
  {
    bankId: "houba",
    title: "Mechová hádanka",
    prompt: "Jsem plná dírek, a přece nasaju vodu. Co jsem?",
    kind: "word",
    answer: ["houba", "houbicka", "houbička"],
  },
  {
    bankId: "mesic",
    title: "Korunní otázka",
    prompt: "Kolik měsíců v roce má alespoň 28 dní?",
    kind: "choice",
    answer: ["12"],
    options: ["1", "2", "6", "11", "12"],
  },
  {
    bankId: "stin",
    title: "Stínový list",
    prompt: "Chodím s tebou ve dne, v noci mizím. Co jsem?",
    kind: "word",
    answer: ["stin", "stín"],
  },
  {
    bankId: "echo",
    title: "Ozvěna v rokli",
    prompt: "Mluvím, až když ty dořekneš, a říkám totéž. Co jsem?",
    kind: "word",
    answer: ["ozvena", "ozvěna", "echo"],
  },
  {
    bankId: "svicka",
    title: "Voskový chyták",
    prompt: "Čím víc jím, tím menší jsem. Co jsem?",
    kind: "word",
    answer: ["svicka", "svíčka", "svice", "svíce", "prskavka"],
  },
  {
    bankId: "klic",
    title: "Zubaté tajemství",
    prompt: "Mám zuby a nekousnu, otvírám bez rukou. Co jsem?",
    kind: "word",
    answer: ["klic", "klíč"],
  },
  {
    bankId: "reka",
    title: "Tekutá hádanka",
    prompt: "Běžím bez nohou, mám koryto bez slámy. Co jsem?",
    kind: "word",
    answer: ["reka", "řeka", "potok"],
  },
  {
    bankId: "hodiny",
    title: "Tikající list",
    prompt: "Mám ruce a neobjímám, obličej bez očí. Co jsem?",
    kind: "word",
    answer: ["hodiny", "hodinky", "orloj"],
  },
  {
    bankId: "vejce",
    title: "Skořápkový chyták",
    prompt: "Bez oken, bez dveří, uvnitř zlatý palác. Co je to?",
    kind: "word",
    answer: ["vejce", "vajicko", "vajíčko"],
  },
  {
    bankId: "sul",
    title: "Mořská otázka",
    prompt: "Jsem v moři, ve slze i na stole. Co jsem?",
    kind: "word",
    answer: ["sul", "sůl"],
  },
  {
    bankId: "vitr",
    title: "Šumící list",
    prompt: "Slyšíš mě, nevidíš mě, stromy se přede mnou klaní. Co jsem?",
    kind: "word",
    answer: ["vitr", "vítr", "vane"],
  },
  {
    bankId: "zrcadlo",
    title: "Stříbrný chyták",
    prompt: "Vidíš v něm sebe, ale ono tě nevidí. Co je to?",
    kind: "word",
    answer: ["zrcadlo", "zrcadlo"],
  },
  {
    bankId: "hreben",
    title: "Zubatý list",
    prompt: "Mám zuby v řadě, a přece nic nesním. Vlasy učešu. Co jsem?",
    kind: "word",
    answer: ["hreben", "hřeben"],
  },
  {
    bankId: "most",
    title: "Spojovací otázka",
    prompt: "Spojím dva břehy, a přece nikam nejdu. Co jsem?",
    kind: "word",
    answer: ["most"],
  },
  {
    bankId: "dny",
    title: "Týdenní chyták",
    prompt: "Kolik dní má týden?",
    kind: "choice",
    answer: ["7"],
    options: ["5", "6", "7", "8", "10"],
  },
];

const BANK_BY_ID = Object.fromEntries(RIDDLE_BANK.map((r) => [r.bankId, r])) as Record<
  string,
  RiddlePrompt
>;

export const RIDDLES: RiddleDef[] = [
  {
    id: "mapa",
    title: "List v jantaru",
    prompt: RIDDLE_BANK[0].prompt,
    kind: "word",
    answer: ["mapa", "mapka"],
    keyName: "Jantarový klíč",
    color: "#e0a04a",
    doorLevel: 3,
    secretLevel: 9,
  },
  {
    id: "tma",
    title: "Jiskrový lístek",
    prompt: RIDDLE_BANK[1].prompt,
    kind: "word",
    answer: ["tma", "temnota"],
    keyName: "Jiskrový klíč",
    color: "#c45cff",
    doorLevel: 6,
    secretLevel: 10,
  },
  {
    id: "jmeno",
    title: "Útesový chyták",
    prompt: RIDDLE_BANK[2].prompt,
    kind: "word",
    answer: ["jmeno", "jméno", "moje jmeno", "moje jméno"],
    keyName: "Zrcadlový klíč",
    color: "#7ec8c4",
    doorLevel: 4,
    secretLevel: 11,
  },
  {
    id: "houba",
    title: "Mechová hádanka",
    prompt: RIDDLE_BANK[3].prompt,
    kind: "word",
    answer: ["houba", "houbicka", "houbička"],
    keyName: "Mechový klíč",
    color: "#7aaf4a",
    doorLevel: 1,
    secretLevel: 12,
  },
  {
    id: "mesic",
    title: "Korunní otázka",
    prompt: RIDDLE_BANK[4].prompt,
    kind: "choice",
    answer: ["12"],
    options: ["1", "2", "6", "11", "12"],
    keyName: "Korunní klíč",
    color: "#f0c35a",
    doorLevel: 7,
    secretLevel: 13,
  },
  {
    id: "alencina",
    title: "Alenčina",
    prompt: "Proč je havran jako psací stůl?",
    kind: "word",
    answer: ["nevim", "nevím"],
    keyName: "Alenčin klíč",
    color: "#c4a060",
    doorLevel: 8,
    secretLevel: 14,
  },
];

export const RIDDLE_BY_ID = Object.fromEntries(RIDDLES.map((r) => [r.id, r])) as Record<
  string,
  RiddleDef
>;

export function shuffleRiddleRoll(): Record<string, string> {
  const ids = RIDDLE_BANK.map((b) => b.bankId);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = ids[i];
    ids[i] = ids[j];
    ids[j] = tmp;
  }
  const roll: Record<string, string> = {};
  RIDDLE_SLOTS.forEach((slot, i) => {
    roll[slot] = ids[i];
  });
  return roll;
}

export function isCompleteRoll(roll: unknown): roll is Record<string, string> {
  if (!roll || typeof roll !== "object") return false;
  const r = roll as Record<string, string>;
  return RIDDLE_SLOTS.every((id) => typeof r[id] === "string" && r[id].length > 0);
}

export function resolveRiddle(id: string, roll?: Record<string, string> | null): RiddleDef | undefined {
  const slot = RIDDLE_BY_ID[id];
  if (!slot) return undefined;
  if (id === "alencina") return slot;
  const bankId = roll?.[id] ?? id;
  const bank = BANK_BY_ID[bankId] ?? BANK_BY_ID[id];
  if (!bank) return slot;
  return {
    ...slot,
    title: bank.title,
    prompt: bank.prompt,
    kind: bank.kind,
    answer: bank.answer,
    options: bank.options ? [...bank.options] : undefined,
  };
}

export function normalizeAnswer(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function checkRiddle(id: string, given: string, roll?: Record<string, string> | null) {
  const r = resolveRiddle(id, roll);
  if (!r) return false;
  const g = normalizeAnswer(given);
  return r.answer.some((a) => normalizeAnswer(a) === g);
}
