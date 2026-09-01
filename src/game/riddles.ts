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

export const RIDDLES: RiddleDef[] = [
  {
    id: "mapa",
    title: "List v jantaru",
    prompt: "Ležím ti na kolenou, ukážu hory i řeky, a přece neudělám krok. Co jsem?",
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
    prompt: "Čím víc mě je, tím míň vidíš. Co jsem?",
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
    prompt: "Patří jen tobě, ale ostatní to říkají častěji než ty. Co to je?",
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
    prompt: "Jsem plná dírek, a přece nasaju vodu. Co jsem?",
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
    prompt: "Kolik měsíců v roce má alespoň 28 dní?",
    kind: "choice",
    answer: ["12"],
    options: ["1", "2", "6", "11", "12"],
    keyName: "Korunní klíč",
    color: "#f0c35a",
    doorLevel: 7,
    secretLevel: 13,
  },
];

export const RIDDLE_BY_ID = Object.fromEntries(RIDDLES.map((r) => [r.id, r])) as Record<
  string,
  RiddleDef
>;

export function normalizeAnswer(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function checkRiddle(id: string, given: string) {
  const r = RIDDLE_BY_ID[id];
  if (!r) return false;
  const g = normalizeAnswer(given);
  return r.answer.some((a) => normalizeAnswer(a) === g);
}
