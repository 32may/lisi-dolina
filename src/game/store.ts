import { create } from "zustand";
import { CHARACTERS, isCharacterId, type CharacterId } from "./characters";
import { BANNER_MS, MAIN_LEVELS, NAME_MAX, SAVE_KEY, SAVE_KEY_V3, SAVE_VERSION, SECRET_BANNER } from "./constants";
import { LEVELS } from "./levels";
import { SECRET_LEVELS } from "./content";
import { awardAmount } from "./progress";
import { checkRiddle, isCompleteRoll, shuffleRiddleRoll } from "./riddles";
import {
  cloneCoins,
  coinsFromBanked,
  emptyN,
  emptySnap,
  looksCheated,
  newRunId,
  normalizeOwned,
  readLegit,
  snapFrom,
} from "./save";
import type { HudState, Overlay } from "./types";

function coinCounts(): number[] {
  const all = [...LEVELS, ...SECRET_LEVELS];
  const maxId = Math.max(...all.map((l) => l.id));
  const counts = Array.from({ length: maxId + 1 }, () => 0);
  for (const l of all) counts[l.id] = l.coins.length;
  return counts;
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
  | "score"
  | "collectedCoins"
  | "claimedEvents"
  | "runId"
  | "completionId"
>;

function loadSave(): SaveSlice {
  const fallback: SaveSlice = {
    ...emptySnap(),
    muted: false,
    fame: [],
    legendSigned: false,
    seenIntro: false,
    runDeaths: 0,
    cheated: false,
    legit: null,
    riddleRoll: shuffleRiddleRoll(),
    runId: newRunId(),
    completionId: null,
  };
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(SAVE_KEY_V3);
    if (!raw) return fallback;
    const data = JSON.parse(raw) as Partial<HudState> & { v?: number };
    const owned = normalizeOwned(data.owned);
    const character = isCharacterId(data.character) && owned.includes(data.character) ? data.character : "fox";
    const banked = emptyN(MAIN_LEVELS + 8).map((n, i) => Math.max(0, data.banked?.[i] ?? n));
    const collectedCoins =
      data.collectedCoins && Object.keys(data.collectedCoins).length
        ? cloneCoins(data.collectedCoins)
        : coinsFromBanked(banked, coinCounts());
    const current = snapFrom({
      best: emptyN(MAIN_LEVELS).map((n, i) => Math.max(0, data.best?.[i] ?? n)),
      banked,
      unlocked: Math.max(1, Math.min(MAIN_LEVELS, data.unlocked ?? 1)),
      character,
      owned,
      keys: Array.isArray(data.keys) ? data.keys : [],
      solved: Array.isArray(data.solved) ? data.solved : [],
      levers: [0, 1, 2, 3, 4].map((i) => Boolean(data.levers?.[i])),
      openedDoors: Array.isArray(data.openedDoors) ? data.openedDoors : [],
      purse: Math.max(0, data.purse ?? 0),
      score: Math.max(0, data.score ?? 0),
      collectedCoins,
      claimedEvents: Array.isArray(data.claimedEvents) ? data.claimedEvents.map(String) : [],
    });
    const cheated = Boolean(data.cheated) || looksCheated(current);
    return {
      ...current,
      muted: Boolean(data.muted),
      fame: Array.isArray(data.fame)
        ? data.fame.map((n) => String(n).slice(0, NAME_MAX)).filter(Boolean).slice(0, 24)
        : [],
      legendSigned: Boolean(data.legendSigned),
      seenIntro: Boolean(data.seenIntro),
      runDeaths: Math.max(0, Number(data.runDeaths) || 0),
      cheated,
      legit: readLegit(data, current),
      riddleRoll: isCompleteRoll(data.riddleRoll) ? data.riddleRoll : shuffleRiddleRoll(),
      runId: typeof data.runId === "string" && data.runId ? data.runId : newRunId(),
      completionId: typeof data.completionId === "string" ? data.completionId : null,
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
        score: s.score,
        collectedCoins: s.collectedCoins,
        claimedEvents: s.claimedEvents,
        runId: s.runId,
        completionId: s.completionId,
        v: SAVE_VERSION,
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
        ...emptySnap(),
        muted: false,
        fame: [],
        legendSigned: false,
        seenIntro: false,
        runDeaths: 0,
        cheated: false,
        legit: null,
        riddleRoll: {},
        runId: "boot",
        completionId: null,
      };

export const useHud = create<
  HudState & {
    patch: (p: Partial<HudState>) => void;
    setOverlay: (overlay: Overlay) => void;
    setCharacter: (character: CharacterId) => void;
    toggleMute: () => void;
    recordWin: (levelId: number, coins: number) => void;
    collectCoin: (levelId: number, id: string) => boolean;
    claimEvent: (eventId: string, base: number) => number;
    buyCharacter: (id: CharacterId) => boolean;
    solveRiddle: (id: string, answer: string) => boolean;
    openDoor: (keyId: string) => void;
    pullLever: (id: number) => void;
    addFame: (name: string) => void;
    signLegend: (name: string, score: number, coins: number) => void;
    ownAll: () => void;
    devUnlock: () => void;
    mayOff: () => void;
    markCheated: () => void;
    addDeath: () => void;
    resetLevelDeaths: () => void;
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
  bannerUntil: 0,
  epilogueStep: 0,
  cheated: saved.cheated,
  legit: saved.legit,
  score: saved.score,
  levelDeaths: 0,
  collectedCoins: saved.collectedCoins,
  claimedEvents: saved.claimedEvents,
  runId: saved.runId,
  completionId: saved.completionId,
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
  collectCoin: (levelId, id) => {
    const s = get();
    const key = String(levelId);
    const have = s.collectedCoins[key] ?? [];
    if (have.includes(id)) return false;
    const collectedCoins = { ...s.collectedCoins, [key]: [...have, id] };
    const banked = [...s.banked];
    banked[levelId] = Math.max(banked[levelId] ?? 0, collectedCoins[key].length);
    set({ collectedCoins, purse: s.purse + 1, banked });
    const next = get();
    if (!next.cheated) set({ legit: snapFrom(next) });
    persist(get());
    return true;
  },
  claimEvent: (eventId, base) => {
    const s = get();
    if (s.claimedEvents.includes(eventId)) return 0;
    const amount = awardAmount(base, s.levelDeaths);
    set({ claimedEvents: [...s.claimedEvents, eventId], score: s.score + amount });
    const next = get();
    if (!next.cheated) set({ legit: snapFrom(next) });
    persist(get());
    return amount;
  },
  recordWin: (levelId, coins) => {
    const best = [...get().best];
    const banked = [...get().banked];
    if (levelId < MAIN_LEVELS) best[levelId] = Math.max(best[levelId] ?? 0, coins);
    banked[levelId] = Math.max(banked[levelId] ?? 0, coins);
    const unlocked =
      levelId < MAIN_LEVELS
        ? Math.max(get().unlocked, Math.min(MAIN_LEVELS, levelId + 2))
        : get().unlocked;
    set({ best, banked, unlocked });
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
    const rolled = s.riddleRoll?.[id];
    const isAlencina = id === "alencina" || rolled === "alencina";
    const keys = id === "alencina" ? s.keys : s.keys.includes(id) ? s.keys : [...s.keys, id];
    const solved = [...s.solved, id];
    if (isAlencina && !solved.includes("alencina")) solved.push("alencina");
    set({
      solved,
      keys,
      banner: isAlencina ? "Dveře do jeskyně tvůrců čekají" : s.banner,
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
    if (levers[id]) return;
    const before = levers.filter(Boolean).length;
    levers[id] = true;
    const after = levers.filter(Boolean).length;
    const hit = before < 5 && after >= 5;
    set({
      levers,
      banner: hit ? SECRET_BANNER : get().banner,
      bannerUntil: hit ? Date.now() + BANNER_MS : get().bannerUntil,
    });
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
      completionId: get().completionId ?? get().runId,
      fame: [...get().fame.filter((x) => x !== n), n].slice(-16),
      legends: [...get().legends, entry],
    });
    persist(get());
  },
  markCheated: () => {
    const s = get();
    if (s.cheated) return;
    set({ cheated: true, legit: s.legit ?? snapFrom(s) });
    persist(get());
  },
  ownAll: () => {
    const s = get();
    if (!s.cheated) set({ legit: s.legit ?? snapFrom(s), cheated: true });
    set({
      owned: CHARACTERS.map((c) => c.id),
      purse: Math.max(get().purse, 999),
      banner: "Všichni hrdinové",
      cheated: true,
    });
    persist(get());
  },
  devUnlock: () => {
    const s = get();
    if (!s.cheated) set({ legit: s.legit ?? snapFrom(s), cheated: true });
    const keys = ["mapa", "tma", "jmeno", "houba", "mesic"];
    set({
      owned: CHARACTERS.map((c) => c.id),
      purse: Math.max(get().purse, 999),
      unlocked: MAIN_LEVELS,
      keys,
      solved: [...keys, "alencina"],
      levers: [true, true, true, true, true],
      openedDoors: [...keys, "hall"],
      banner: "Vývojářský mód",
      cheated: true,
    });
    persist(get());
  },
  mayOff: () => {
    const s = get();
    const L = s.legit ?? emptySnap();
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
      score: L.score,
      collectedCoins: cloneCoins(L.collectedCoins),
      claimedEvents: [...L.claimedEvents],
      hint: def?.hint ?? "Chytrost",
      cheated: false,
      legit: L,
      banner: "Kódy vypnuty",
    });
    persist(get());
  },
  addDeath: () => {
    set({ runDeaths: get().runDeaths + 1, levelDeaths: get().levelDeaths + 1, deaths: get().deaths + 1 });
    persist(get());
  },
  resetLevelDeaths: () => set({ levelDeaths: 0, deaths: 0 }),
  markIntroSeen: () => {
    set({ seenIntro: true });
    persist(get());
  },
  newGame: () => {
    const legends = get().legends;
    const muted = get().muted;
    const fresh = emptySnap();
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
      bannerUntil: 0,
      epilogueStep: 0,
      cheated: false,
      legit: fresh,
      score: 0,
      levelDeaths: 0,
      collectedCoins: {},
      claimedEvents: [],
      runId: newRunId(),
      completionId: null,
      muted,
    });
    persist(get());
  },
}));
