import source from "../../hadanky.md?raw";
import { parseHadanky, type RiddleKind, type RiddlePrompt } from "./parse-hadanky";

export type { RiddleKind, RiddlePrompt };

const parsed = parseHadanky(source);

export const RIDDLE_BANK: RiddlePrompt[] = parsed.bank;
const ALENCINA = parsed.alencina;

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

export const RIDDLE_SLOTS = ["mapa", "tma", "jmeno", "houba", "mesic"] as const;
export type RiddleSlotId = (typeof RIDDLE_SLOTS)[number];

const SLOT_META: Record<
  RiddleSlotId,
  { keyName: string; color: string; doorLevel: number; secretLevel: number }
> = {
  mapa: { keyName: "Jantarový klíč", color: "#e0a04a", doorLevel: 3, secretLevel: 9 },
  tma: { keyName: "Jiskrový klíč", color: "#c45cff", doorLevel: 6, secretLevel: 10 },
  jmeno: { keyName: "Zrcadlový klíč", color: "#7ec8c4", doorLevel: 4, secretLevel: 11 },
  houba: { keyName: "Mechový klíč", color: "#7aaf4a", doorLevel: 1, secretLevel: 12 },
  mesic: { keyName: "Korunní klíč", color: "#f0c35a", doorLevel: 7, secretLevel: 13 },
};

const BANK_BY_ID = Object.fromEntries(RIDDLE_BANK.map((r) => [r.bankId, r])) as Record<
  string,
  RiddlePrompt
>;

function slotDef(id: RiddleSlotId, prompt: RiddlePrompt): RiddleDef {
  const meta = SLOT_META[id];
  return {
    id,
    title: prompt.title,
    prompt: prompt.prompt,
    kind: prompt.kind,
    answer: prompt.answer,
    options: prompt.options ? [...prompt.options] : undefined,
    ...meta,
  };
}

const defaultMapa = BANK_BY_ID.mapa ?? RIDDLE_BANK[0];
const defaultTma = BANK_BY_ID.tma ?? RIDDLE_BANK[1];
const defaultJmeno = BANK_BY_ID.jmeno ?? RIDDLE_BANK[2];
const defaultHouba = BANK_BY_ID.houba ?? RIDDLE_BANK[3];
const defaultMesic = BANK_BY_ID.mesic ?? RIDDLE_BANK[4];

export const RIDDLES: RiddleDef[] = [
  slotDef("mapa", defaultMapa),
  slotDef("tma", defaultTma),
  slotDef("jmeno", defaultJmeno),
  slotDef("houba", defaultHouba),
  slotDef("mesic", defaultMesic),
  {
    id: "alencina",
    title: ALENCINA.title,
    prompt: ALENCINA.prompt,
    kind: ALENCINA.kind,
    answer: ALENCINA.answer,
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
  const used = new Set<string>();
  const roll: Record<string, string> = {};
  RIDDLE_SLOTS.forEach((slot, i) => {
    let pick = ids[i];
    let k = i;
    while (used.has(pick) && k < ids.length - 1) {
      k += 1;
      pick = ids[k];
    }
    used.add(pick);
    roll[slot] = pick;
  });
  return roll;
}

export function isCompleteRoll(roll: unknown): roll is Record<string, string> {
  if (!roll || typeof roll !== "object") return false;
  const r = roll as Record<string, string>;
  const vals = RIDDLE_SLOTS.map((id) => r[id]);
  if (vals.some((v) => typeof v !== "string" || !BANK_BY_ID[v])) return false;
  return new Set(vals).size === RIDDLE_SLOTS.length;
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
