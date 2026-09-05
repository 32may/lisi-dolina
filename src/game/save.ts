import { CHARACTERS, isCharacterId, type CharacterId } from "./characters.ts";
import { MAIN_LEVELS } from "./constants.ts";
import { coinId } from "./progress.ts";
import type { HudState, LegitSnap } from "./types.ts";

export function emptyN(n: number) {
  return Array.from({ length: n }, () => 0);
}

export function newRunId() {
  const a = Date.now().toString(36);
  const b = Math.random().toString(36).slice(2, 10);
  return `r${a}-${b}`;
}

export function emptySnap(): LegitSnap {
  return {
    best: emptyN(MAIN_LEVELS),
    banked: emptyN(MAIN_LEVELS + 8),
    unlocked: 1,
    character: "fox",
    owned: ["fox"],
    keys: [],
    solved: [],
    levers: [false, false, false, false, false],
    openedDoors: [],
    purse: 0,
    score: 0,
    collectedCoins: {},
    claimedEvents: [],
  };
}

export function snapFrom(s: {
  best: number[];
  banked: number[];
  unlocked: number;
  character: CharacterId;
  owned: CharacterId[];
  keys: string[];
  solved: string[];
  levers: boolean[];
  openedDoors: string[];
  purse: number;
  score: number;
  collectedCoins: Record<string, string[]>;
  claimedEvents: string[];
}): LegitSnap {
  return {
    best: [...s.best],
    banked: [...s.banked],
    unlocked: s.unlocked,
    character: s.character,
    owned: [...s.owned],
    keys: [...s.keys],
    solved: [...s.solved],
    levers: [...s.levers],
    openedDoors: [...s.openedDoors],
    purse: s.purse,
    score: s.score,
    collectedCoins: Object.fromEntries(
      Object.entries(s.collectedCoins).map(([k, v]) => [k, [...v]]),
    ),
    claimedEvents: [...s.claimedEvents],
  };
}

/** Honest max purse is well below 999 (IDKFA/IAAAY). Keys do not imply a cheat. */
export function looksCheated(s: { purse: number; cheated?: boolean }) {
  return s.purse >= 999;
}

export function cloneCoins(src: Record<string, string[]> | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!src) return out;
  for (const [k, v] of Object.entries(src)) {
    if (Array.isArray(v)) out[k] = v.map(String);
  }
  return out;
}

/** v3 stored only a count per level. Treat the first N coins as collected. */
export function coinsFromBanked(banked: number[], coinCounts: number[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (let i = 0; i < coinCounts.length; i++) {
    const n = Math.max(0, Math.min(coinCounts[i] ?? 0, banked[i] ?? 0));
    if (!n) continue;
    out[String(i)] = Array.from({ length: n }, (_, k) => coinId(i, k));
  }
  return out;
}

export function normalizeOwned(raw: unknown): CharacterId[] {
  const owned = (Array.isArray(raw) ? raw : ["fox"]).filter(isCharacterId);
  if (!owned.includes("fox")) owned.unshift("fox");
  return owned;
}

export function readLegit(data: Partial<HudState>, current: LegitSnap): LegitSnap {
  const raw = data.legit;
  if (raw && Array.isArray(raw.owned)) {
    const owned = normalizeOwned(raw.owned);
    return {
      best: emptyN(MAIN_LEVELS).map((n, i) => Math.max(0, raw.best?.[i] ?? n)),
      banked: emptyN(MAIN_LEVELS + 8).map((n, i) => Math.max(0, raw.banked?.[i] ?? n)),
      unlocked: Math.max(1, Math.min(MAIN_LEVELS, raw.unlocked ?? 1)),
      character: isCharacterId(raw.character) && owned.includes(raw.character) ? raw.character : "fox",
      owned,
      keys: Array.isArray(raw.keys) ? raw.keys : [],
      solved: Array.isArray(raw.solved) ? raw.solved : [],
      levers: [0, 1, 2, 3, 4].map((i) => Boolean(raw.levers?.[i])),
      openedDoors: Array.isArray(raw.openedDoors) ? raw.openedDoors : [],
      purse: Math.max(0, raw.purse ?? 0),
      score: Math.max(0, raw.score ?? 0),
      collectedCoins: cloneCoins(raw.collectedCoins),
      claimedEvents: Array.isArray(raw.claimedEvents) ? raw.claimedEvents.map(String) : [],
    };
  }
  if (looksCheated(current) || data.cheated) {
    return {
      ...emptySnap(),
      best: emptyN(MAIN_LEVELS).map((n, i) => Math.max(0, data.best?.[i] ?? current.best[i] ?? n)),
      banked: emptyN(MAIN_LEVELS + 8).map((n, i) => Math.max(0, data.banked?.[i] ?? current.banked[i] ?? n)),
      purse: Math.min(Math.max(0, data.purse ?? 0), (data.banked ?? current.banked).reduce((a, n) => a + n, 0)),
      collectedCoins: cloneCoins(current.collectedCoins),
    };
  }
  return current;
}

export function allCharacterIds(): CharacterId[] {
  return CHARACTERS.map((c) => c.id);
}
