import type { CharacterId } from "./characters.ts";

export type Overlay =
  | "title"
  | "levels"
  | "pick"
  | "shop"
  | "riddle"
  | "playing"
  | "paused"
  | "dead"
  | "win"
  | "hall"
  | "intro"
  | "epilogue";

export type PlatformKind = "solid" | "oneway";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Platform extends Rect {
  kind: PlatformKind;
}

export interface Mover extends Rect {
  axis: "x" | "y";
  min: number;
  max: number;
  speed: number;
  t: number;
}

export interface GuardDef {
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  speed: number;
}

export interface Guard extends GuardDef {
  dir: 1 | -1;
  dead: boolean;
  squish: number;
  anim: number;
  carrying: boolean;
}

export interface DartDef {
  x: number;
  y: number;
  min: number;
  max: number;
  axis: "x" | "y";
  speed: number;
  phase?: number;
}

export interface RiddleSpot {
  x: number;
  y: number;
  id: string;
}

export interface DoorSpot {
  x: number;
  y: number;
  keyId: string;
}

export interface LeverSpot {
  x: number;
  y: number;
  id: number;
}

export interface NpcSpot {
  x: number;
  y: number;
  who: "may" | "mia";
}

export interface LevelDef {
  id: number;
  name: string;
  blurb: string;
  width: number;
  height: number;
  theme: "dusk" | "ruins" | "cave";
  themeKey?: string;
  secret?: boolean;
  hall?: boolean;
  spawn: { x: number; y: number };
  platforms: Platform[];
  movers: Omit<Mover, "t">[];
  coins: { x: number; y: number }[];
  spikes: Rect[];
  checkpoints: { x: number; y: number }[];
  flag: { x: number; y: number };
  guards: GuardDef[];
  riddles?: RiddleSpot[];
  doors?: DoorSpot[];
  levers?: LeverSpot[];
  darts?: DartDef[];
  npcs?: NpcSpot[];
}

export interface LegitSnap {
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
}

export interface LegendEntry {
  id: number;
  name: string;
  score: number;
  coins: number;
  createdAt: string;
  cheater?: boolean;
}

export interface HudState {
  overlay: Overlay;
  coins: number;
  total: number;
  purse: number;
  levelId: number;
  levelName: string;
  deaths: number;
  hasCheckpoint: boolean;
  best: number[];
  banked: number[];
  unlocked: number;
  muted: boolean;
  ready: boolean;
  character: CharacterId;
  owned: CharacterId[];
  keys: string[];
  solved: string[];
  levers: boolean[];
  openedDoors: string[];
  fame: string[];
  legends: LegendEntry[];
  legendSigned: boolean;
  seenIntro: boolean;
  runDeaths: number;
  epilogueStep: number;
  riddleId: string | null;
  riddleRoll: Record<string, string>;
  pendingLevel: number;
  hint: string;
  pickMode: "play" | "lantern";
  banner: string | null;
  cheated: boolean;
  legit: LegitSnap | null;
  score: number;
  levelDeaths: number;
  collectedCoins: Record<string, string[]>;
  claimedEvents: string[];
  runId: string;
  completionId: string | null;
  bannerUntil: number;
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      setKeys?: (codes: string[]) => void;
      setSteer?: (v: number) => void;
    };
  }
}
