import { create } from "zustand";
import { CHARACTERS, isCharacterId, type CharacterId } from "./characters";
import { MAIN_LEVELS, SAVE_KEY } from "./constants";
import { LEVELS } from "./levels";
import { checkRiddle } from "./riddles";
import type { HudState, Overlay } from "./types";

function emptyN(n: number) {
  return Array.from({ length: n }, () => 0);
}

function loadSave(): Pick<
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
> {
  const fallback = {
    best: emptyN(MAIN_LEVELS),
    banked: emptyN(MAIN_LEVELS + 8),
    unlocked: 1,
    muted: false,
    character: "fox" as CharacterId,
    owned: ["fox"] as CharacterId[],
    keys: [] as string[],
    solved: [] as string[],
    levers: [false, false, false, false, false],
    openedDoors: [] as string[],
    fame: [] as string[],
    purse: 0,
  };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw) as Partial<HudState>;
    const owned = (data.owned ?? ["fox"]).filter(isCharacterId);
    if (!owned.includes("fox")) owned.unshift("fox");
    return {
      best: emptyN(MAIN_LEVELS).map((n, i) => Math.max(0, data.best?.[i] ?? n)),
      banked: emptyN(MAIN_LEVELS + 8).map((n, i) => Math.max(0, data.banked?.[i] ?? n)),
      unlocked: Math.max(1, Math.min(MAIN_LEVELS, data.unlocked ?? 1)),
      muted: Boolean(data.muted),
      character: isCharacterId(data.character) ? data.character : "fox",
      owned,
      keys: Array.isArray(data.keys) ? data.keys : [],
      solved: Array.isArray(data.solved) ? data.solved : [],
      levers: [0, 1, 2, 3, 4].map((i) => Boolean(data.levers?.[i])),
      openedDoors: Array.isArray(data.openedDoors) ? data.openedDoors : [],
      fame: Array.isArray(data.fame) ? data.fame.slice(0, 24) : [],
      purse: Math.max(0, data.purse ?? 0),
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
        purse: s.purse,
        v: 3,
      }),
    );
  } catch {
    /* ignore */
  }
}

const saved =
  typeof window !== "undefined"
    ? loadSave()
    : {
        best: emptyN(MAIN_LEVELS),
        banked: emptyN(MAIN_LEVELS + 8),
        unlocked: 1,
        muted: false,
        character: "fox" as CharacterId,
        owned: ["fox"] as CharacterId[],
        keys: [],
        solved: [],
        levers: [false, false, false, false, false],
        openedDoors: [],
        fame: [],
        purse: 0,
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
  riddleId: null,
  pendingLevel: 0,
  hint: CHARACTERS.find((c) => c.id === saved.character)?.hint ?? "Chytrost",
  pickMode: "play" as const,
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
      overlay: "shop",
    });
    persist(get());
  },
  buyCharacter: (id) => {
    const def = CHARACTERS.find((c) => c.id === id);
    if (!def || def.price <= 0) return false;
    const s = get();
    if (s.owned.includes(id) || s.purse < def.price) return false;
    set({ purse: s.purse - def.price, owned: [...s.owned, id] });
    persist(get());
    return true;
  },
  solveRiddle: (id, answer) => {
    if (!checkRiddle(id, answer)) return false;
    const s = get();
    if (s.solved.includes(id)) return true;
    set({
      solved: [...s.solved, id],
      keys: s.keys.includes(id) ? s.keys : [...s.keys, id],
    });
    persist(get());
    return true;
  },
  openDoor: (keyId) => {
    const s = get();
    if (!s.keys.includes(keyId) || s.openedDoors.includes(keyId)) return;
    set({ openedDoors: [...s.openedDoors, keyId] });
    persist(get());
  },
  pullLever: (id) => {
    if (id < 0 || id > 4) return;
    const levers = [...get().levers];
    levers[id] = true;
    set({ levers });
    persist(get());
  },
  addFame: (name) => {
    const n = name.trim().slice(0, 10);
    if (!n) return;
    const fame = [...get().fame.filter((x) => x !== n), n].slice(-16);
    set({ fame });
    persist(get());
  },
}));
