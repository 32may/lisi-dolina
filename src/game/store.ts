import { create } from "zustand";
import { CHARACTERS, isCharacterId, type CharacterId } from "./characters";
import { MAIN_LEVELS, NAME_MAX, SAVE_KEY } from "./constants";
import { LEVELS } from "./levels";
import { checkRiddle, isCompleteRoll, shuffleRiddleRoll } from "./riddles";
import type { HudState, LegitSnap, Overlay } from "./types";

function emptyN(n: number) {
  return Array.from({ length: n }, () => 0);
}

function snapFrom(s: {
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
  };
}

function looksCheated(s: { owned: CharacterId[]; unlocked: number; purse: number; keys: string[] }) {
  return s.owned.length >= 5 && s.unlocked >= MAIN_LEVELS && (s.purse >= 999 || s.keys.length >= 5);
}

function inferLegit(data: Partial<HudState>, fallbackBest: number[], fallbackBanked: number[]): LegitSnap {
  const best = emptyN(MAIN_LEVELS).map((n, i) => Math.max(0, data.best?.[i] ?? fallbackBest[i] ?? n));
  const banked = emptyN(MAIN_LEVELS + 8).map((n, i) => Math.max(0, data.banked?.[i] ?? fallbackBanked[i] ?? n));
  let unlocked = 1;
  for (let i = 0; i < MAIN_LEVELS; i++) {
    if (best[i] > 0 || banked[i] > 0) unlocked = Math.max(unlocked, Math.min(MAIN_LEVELS, i + 2));
  }
  const fromBank = banked.reduce((a, n) => a + n, 0);
  return {
    best,
    banked,
    unlocked,
    character: "fox",
    owned: ["fox"],
    keys: [],
    solved: [],
    levers: [false, false, false, false, false],
    openedDoors: [],
    purse: Math.min(Math.max(0, data.purse ?? 0), fromBank),
  };
}

function readLegit(data: Partial<HudState>, current: LegitSnap): LegitSnap {
  const raw = data.legit;
  if (raw && Array.isArray(raw.owned)) {
    const owned = raw.owned.filter(isCharacterId);
    if (!owned.includes("fox")) owned.unshift("fox");
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
    };
  }
  if (looksCheated(current)) return inferLegit(data, current.best, current.banked);
  return current;
}

type SaveSlice = Pick<
  HudState,
  | "best"
  | "banked"
  | "unlocked"
  | "muted"
  | "character"
  | "owned"
  | "keys"
  | "solved"
  | "levers"
  | "openedDoors"
  | "fame"
  | "purse"
  | "legendSigned"
  | "seenIntro"
  | "runDeaths"
  | "cheated"
  | "legit"
  | "riddleRoll"
>;

function loadSave(): SaveSlice {
  const fallback: SaveSlice = {
    best: emptyN(MAIN_LEVELS),
    banked: emptyN(MAIN_LEVELS + 8),
    unlocked: 1,
    muted: false,
    character: "fox",
    owned: ["fox"],
    keys: [],
    solved: [],
    levers: [false, false, false, false, false],
    openedDoors: [],
    fame: [],
    legendSigned: false,
    seenIntro: false,
    runDeaths: 0,
    purse: 0,
    cheated: false,
    legit: null,
    riddleRoll: shuffleRiddleRoll(),
  };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw) as Partial<HudState>;
    const owned = (data.owned ?? ["fox"]).filter(isCharacterId);
    if (!owned.includes("fox")) owned.unshift("fox");
    const current = snapFrom({
      best: emptyN(MAIN_LEVELS).map((n, i) => Math.max(0, data.best?.[i] ?? n)),
      banked: emptyN(MAIN_LEVELS + 8).map((n, i) => Math.max(0, data.banked?.[i] ?? n)),
      unlocked: Math.max(1, Math.min(MAIN_LEVELS, data.unlocked ?? 1)),
      character: isCharacterId(data.character) ? data.character : "fox",
      owned,
      keys: Array.isArray(data.keys) ? data.keys : [],
      solved: Array.isArray(data.solved) ? data.solved : [],
      levers: [0, 1, 2, 3, 4].map((i) => Boolean(data.levers?.[i])),
      openedDoors: Array.isArray(data.openedDoors) ? data.openedDoors : [],
      purse: Math.max(0, data.purse ?? 0),
    });
    return {
      ...current,
      muted: Boolean(data.muted),
      fame: Array.isArray(data.fame)
        ? data.fame.map((n) => String(n).slice(0, NAME_MAX)).filter(Boolean).slice(0, 24)
        : [],
      legendSigned: Boolean(data.legendSigned),
      seenIntro: Boolean(data.seenIntro),
      runDeaths: Math.max(0, Number(data.runDeaths) || 0),
      cheated: Boolean(data.cheated) || looksCheated(current),
      legit: readLegit(data, current),
      riddleRoll: isCompleteRoll(data.riddleRoll) ? data.riddleRoll : shuffleRiddleRoll(),
    };
  } catch {
    return fallback;
  }
}

function persist(s: HudState) {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        best: s.best,
        banked: s.banked,
        unlocked: s.unlocked,
        muted: s.muted,
        character: s.character,
        owned: s.owned,
        keys: s.keys,
        solved: s.solved,
        levers: s.levers,
        openedDoors: s.openedDoors,
        fame: s.fame,
        legendSigned: s.legendSigned,
        seenIntro: s.seenIntro,
        runDeaths: s.runDeaths,
        purse: s.purse,
        cheated: s.cheated,
        legit: s.legit,
        riddleRoll: s.riddleRoll,
        v: 3,
      }),
    );
  } catch {
    /* ignore */
  }
}

const saved: SaveSlice =
  typeof window !== "undefined"
    ? loadSave()
    : {
        best: emptyN(MAIN_LEVELS),
        banked: emptyN(MAIN_LEVELS + 8),
        unlocked: 1,
        muted: false,
        character: "fox",
        owned: ["fox"],
        keys: [],
        solved: [],
        levers: [false, false, false, false, false],
        openedDoors: [],
        fame: [],
        legendSigned: false,
        seenIntro: false,
        runDeaths: 0,
        purse: 0,
        cheated: false,
        legit: null,
        riddleRoll: shuffleRiddleRoll(),
      };

export const useHud = create<
  HudState & {
    patch: (p: Partial<HudState>) => void;
    setOverlay: (overlay: Overlay) => void;
    setCharacter: (character: CharacterId) => void;
    toggleMute: () => void;
    recordWin: (levelId: number, coins: number) => void;
    buyCharacter: (id: CharacterId) => boolean;
    solveRiddle: (id: string, answer: string) => boolean;
    openDoor: (keyId: string) => void;
    pullLever: (id: number) => void;
    addFame: (name: string) => void;
    signLegend: (name: string, score: number, coins: number) => void;
    ownAll: () => void;
    devUnlock: () => void;
    mayOff: () => void;
    addDeath: () => void;
    newGame: () => void;
    markIntroSeen: () => void;
  }
>((set, get) => ({
  overlay: "title",
  coins: 0,
  total: LEVELS[0].coins.length,
  purse: saved.purse,
  levelId: 0,
  levelName: LEVELS[0].name,
  deaths: 0,
  hasCheckpoint: false,
  best: saved.best,
  banked: saved.banked,
  unlocked: saved.unlocked,
  muted: saved.muted,
  ready: false,
  character: saved.character,
  owned: saved.owned,
  keys: saved.keys,
  solved: saved.solved,
  levers: saved.levers,
  openedDoors: saved.openedDoors,
  fame: saved.fame,
  legends: [],
  legendSigned: saved.legendSigned,
  seenIntro: saved.seenIntro,
  runDeaths: saved.runDeaths,
  riddleId: null,
  riddleRoll: saved.riddleRoll,
  pendingLevel: 0,
  hint: CHARACTERS.find((c) => c.id === saved.character)?.hint ?? "Chytrost",
  pickMode: "play" as const,
  banner: null as string | null,
  epilogueStep: 0,
  cheated: saved.cheated,
  legit: saved.legit,
  patch: (p) => set(p),
  setOverlay: (overlay) => set({ overlay }),
  setCharacter: (character) => {
    if (!get().owned.includes(character)) return;
    const def = CHARACTERS.find((c) => c.id === character);
    set({ character, hint: def?.hint ?? "" });
    persist(get());
  },
  toggleMute: () => {
    set({ muted: !get().muted });
    persist(get());
  },
  recordWin: (levelId, coins) => {
    const best = [...get().best];
    const banked = [...get().banked];
    if (levelId < MAIN_LEVELS) best[levelId] = Math.max(best[levelId] ?? 0, coins);
    const prev = banked[levelId] ?? 0;
    const gain = Math.max(0, coins - prev);
    banked[levelId] = Math.max(prev, coins);
    const unlocked =
      levelId < MAIN_LEVELS
        ? Math.max(get().unlocked, Math.min(MAIN_LEVELS, levelId + 2))
        : get().unlocked;
    set({
      best,
      banked,
      unlocked,
      purse: get().purse + gain,
    });
    const s = get();
    if (!s.cheated) set({ legit: snapFrom(s) });
    persist(get());
  },
  buyCharacter: (id) => {
    const def = CHARACTERS.find((c) => c.id === id);
    if (!def || def.price <= 0) return false;
    const s = get();
    if (s.owned.includes(id) || s.purse < def.price) return false;
    set({ purse: s.purse - def.price, owned: [...s.owned, id] });
    const next = get();
    if (!next.cheated) set({ legit: snapFrom(next) });
    persist(get());
    return true;
  },
  solveRiddle: (id, answer) => {
    if (!checkRiddle(id, answer, get().riddleRoll)) return false;
    const s = get();
    if (s.solved.includes(id)) return true;
    const keys = id === "alencina" ? s.keys : s.keys.includes(id) ? s.keys : [...s.keys, id];
    set({
      solved: [...s.solved, id],
      keys,
      banner: id === "alencina" ? "Tajný level otevřen" : s.banner,
    });
    const next = get();
    if (!next.cheated) set({ legit: snapFrom(next) });
    persist(get());
    return true;
  },
  openDoor: (keyId) => {
    const s = get();
    if (s.openedDoors.includes(keyId)) return;
    const ok = keyId === "hall" ? s.solved.includes("alencina") : s.keys.includes(keyId);
    if (!ok) return;
    set({ openedDoors: [...s.openedDoors, keyId] });
    const next = get();
    if (!next.cheated) set({ legit: snapFrom(next) });
    persist(get());
  },
  pullLever: (id) => {
    if (id < 0 || id > 4) return;
    const levers = [...get().levers];
    levers[id] = true;
    set({ levers });
    const next = get();
    if (!next.cheated) set({ legit: snapFrom(next) });
    persist(get());
  },
  addFame: (name) => {
    const n = name.trim().slice(0, NAME_MAX);
    if (!n) return;
    const fame = [...get().fame.filter((x) => x !== n), n].slice(-16);
    set({ fame });
    persist(get());
  },
  signLegend: (name, score, coins) => {
    const n = name.trim().slice(0, NAME_MAX);
    if (!n || get().legendSigned) return;
    const cheated = get().cheated;
    const entry = {
      id: Date.now(),
      name: n,
      score: cheated ? 0 : score,
      coins: cheated ? 0 : coins,
      createdAt: new Date().toISOString(),
      cheater: cheated,
    };
    set({
      legendSigned: true,
      fame: [...get().fame.filter((x) => x !== n), n].slice(-16),
      legends: [...get().legends, entry],
    });
    persist(get());
  },
  ownAll: () => {
    const s = get();
    const legit = s.legit ?? (looksCheated(s) ? inferLegit(s, s.best, s.banked) : snapFrom(s));
    set({
      owned: CHARACTERS.map((c) => c.id),
      purse: Math.max(s.purse, 999),
      banner: "Všichni hrdinové",
      cheated: true,
      legit,
    });
    persist(get());
  },
  devUnlock: () => {
    const s = get();
    const legit = s.legit ?? (looksCheated(s) ? inferLegit(s, s.best, s.banked) : snapFrom(s));
    const keys = ["mapa", "tma", "jmeno", "houba", "mesic"];
    set({
      owned: CHARACTERS.map((c) => c.id),
      purse: Math.max(s.purse, 999),
      unlocked: MAIN_LEVELS,
      keys,
      solved: [...keys, "alencina"],
      levers: [true, true, true, true, true],
      openedDoors: [...keys, "hall"],
      banner: "Vývojářský mód",
      cheated: true,
      legit,
    });
    persist(get());
  },
  mayOff: () => {
    const s = get();
    const L = s.legit ?? inferLegit(s, s.best, s.banked);
    const character = L.owned.includes(L.character) ? L.character : "fox";
    const def = CHARACTERS.find((c) => c.id === character);
    set({
      best: L.best,
      banked: L.banked,
      unlocked: L.unlocked,
      character,
      owned: L.owned,
      keys: L.keys,
      solved: L.solved,
      levers: L.levers,
      openedDoors: L.openedDoors,
      purse: L.purse,
      hint: def?.hint ?? "Chytrost",
      cheated: false,
      legit: L,
      banner: "Kódy vypnuty",
    });
    persist(get());
  },
  addDeath: () => {
    set({ runDeaths: get().runDeaths + 1 });
    persist(get());
  },
  markIntroSeen: () => {
    set({ seenIntro: true });
    persist(get());
  },
  newGame: () => {
    const legends = get().legends;
    const fresh = snapFrom({
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
    });
    set({
      overlay: "intro",
      coins: 0,
      total: LEVELS[0].coins.length,
      purse: 0,
      levelId: 0,
      levelName: LEVELS[0].name,
      deaths: 0,
      hasCheckpoint: false,
      best: fresh.best,
      banked: fresh.banked,
      unlocked: 1,
      character: "fox",
      owned: ["fox"],
      keys: [],
      solved: [],
      levers: [false, false, false, false, false],
      openedDoors: [],
      fame: [],
      legends,
      legendSigned: false,
      seenIntro: false,
      runDeaths: 0,
      riddleId: null,
      riddleRoll: shuffleRiddleRoll(),
      pendingLevel: 0,
      hint: CHARACTERS[0].hint,
      pickMode: "play",
      banner: null,
      epilogueStep: 0,
      cheated: false,
      legit: fresh,
    });
    persist(get());
  },
}));
