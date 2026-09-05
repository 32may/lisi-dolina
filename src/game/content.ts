import { GUARD_H, GUARD_W } from "./constants";
import type { DartDef, DoorSpot, GuardDef, LevelDef, LeverSpot, Platform, RiddleSpot } from "./types";

export const THEME_KEYS = [
  "jantar",
  "ruiny",
  "jiskra",
  "mech",
  "utesy",
  "hreben",
  "stola",
  "koruna",
  "srdce",
];

export const THEME_TINT: Record<string, string> = {
  jantar: "rgba(196, 110, 28, 0.16)",
  ruiny: "rgba(88, 64, 150, 0.18)",
  jiskra: "rgba(150, 48, 170, 0.16)",
  mech: "rgba(48, 110, 52, 0.16)",
  utesy: "rgba(40, 108, 128, 0.16)",
  hreben: "rgba(36, 52, 110, 0.18)",
  stola: "rgba(18, 10, 22, 0.28)",
  koruna: "rgba(140, 92, 28, 0.16)",
  srdce: "rgba(120, 28, 48, 0.18)",
  slava: "rgba(196, 150, 64, 0.14)",
};

export const HALL_LAYOUT = {
  width: 3600,
  cx: 3000,
  mayX: 2848,
  miaX: 3154,
  plaqueX: 2636,
  plaqueW: 728,
  plaqueY: 4,
  daisX: 2680,
  introCamX: 2360,
  backdropX: 2360,
  foxX: 2760,
  audienceY: 598,
};

function solid(x: number, y: number, w: number, h: number): Platform {
  return { x, y, w, h, kind: "solid" };
}
function ledge(x: number, y: number, w: number): Platform {
  return { x, y, w, h: 28, kind: "oneway" };
}
function ground(x: number, w: number, top = 620): Platform {
  return solid(x, top, w, 720 - top + 80);
}
function lantern(x: number, top: number) {
  return { x, y: top };
}
function guard(x: number, top: number, minX: number, maxX: number, speed = 50): GuardDef {
  return { x, y: top - GUARD_H, w: GUARD_W, h: GUARD_H, minX, maxX, speed };
}
function dart(
  x: number,
  y: number,
  min: number,
  max: number,
  axis: "x" | "y" = "x",
  speed = 90,
  phase = 0,
): DartDef {
  return { x, y, min, max, axis, speed, phase };
}

export interface LevelExtras {
  riddles?: RiddleSpot[];
  doors?: DoorSpot[];
  levers?: LeverSpot[];
  darts?: DartDef[];
}

export const LEVEL_EXTRAS: Record<number, LevelExtras> = {
  0: { riddles: [{ x: 2100, y: 560, id: "mapa" }] },
  1: { doors: [{ x: 4860, y: 500, keyId: "houba" }] },
  2: { riddles: [{ x: 2260, y: 520, id: "tma" }] },
  3: {
    riddles: [{ x: 3480, y: 560, id: "houba" }],
    doors: [{ x: 2680, y: 500, keyId: "mapa" }],
  },
  4: {
    riddles: [{ x: 3180, y: 500, id: "jmeno" }],
    doors: [{ x: 4780, y: 500, keyId: "jmeno" }],
  },
  5: { riddles: [{ x: 4480, y: 560, id: "mesic" }] },
  6: {
    doors: [{ x: 4560, y: 460, keyId: "tma" }],
    darts: [dart(2400, 420, 2200, 2800, "x", 110), dart(1960, 500, 1860, 2100, "x", 95, 200)],
  },
  7: {
    doors: [{ x: 5160, y: 400, keyId: "mesic" }],
    darts: [
      dart(3700, 580, 3560, 4260, "x", 160, 0),
      dart(3900, 560, 3560, 4260, "x", 150, 420),
      dart(4100, 590, 3560, 4260, "x", 170, 840),
    ],
  },
  8: {
    riddles: [{ x: 6100, y: 580, id: "alencina" }],
    doors: [{ x: 6320, y: 580, keyId: "hall" }],
    darts: [dart(2180, 300, 1980, 2500, "x", 130), dart(4180, 280, 220, 460, "y", 100)],
  },
};

export const SECRET_LEVELS: LevelDef[] = [
  {
    id: 9,
    name: "Plazivá jeskyně",
    blurb: "Nízké stropy. Batole ví, kudy.",
    width: 3200,
    height: 720,
    theme: "cave",
    themeKey: "jiskra",
    secret: true,
    spawn: { x: 70, y: 572 },
    platforms: [ground(0, 3200, 600), solid(0, 0, 3200, 568)],
    movers: [],
    coins: [
      { x: 240, y: 580 },
      { x: 900, y: 580 },
      { x: 1600, y: 580 },
      { x: 2400, y: 580 },
      { x: 3000, y: 580 },
    ],
    spikes: [],
    checkpoints: [lantern(1500, 600)],
    flag: { x: 3060, y: 600 },
    guards: [guard(900, 600, 740, 1120, 40), guard(2300, 600, 2140, 2500, 42)],
    levers: [{ x: 2920, y: 600, id: 0 }],
  },
  {
    id: 10,
    name: "Vzdušný komín",
    blurb: "Téměř bez podlahy. Robot tu dýchá.",
    width: 2800,
    height: 720,
    theme: "ruins",
    themeKey: "ruiny",
    secret: true,
    spawn: { x: 70, y: 500 },
    platforms: [
      ground(0, 260, 580),
      ledge(500, 420, 90),
      ledge(900, 300, 80),
      ledge(1400, 240, 80),
      ledge(1900, 340, 90),
      ground(2400, 400, 580),
    ],
    movers: [{ x: 1700, y: 280, w: 100, h: 22, axis: "y", min: 180, max: 460, speed: 70 }],
    coins: [
      { x: 540, y: 384 },
      { x: 940, y: 264 },
      { x: 1440, y: 204 },
      { x: 1940, y: 304 },
      { x: 2600, y: 544 },
    ],
    spikes: [{ x: 270, y: 668, w: 2120, h: 52 }],
    checkpoints: [lantern(1400, 240)],
    flag: { x: 2660, y: 580 },
    guards: [],
    darts: [dart(800, 360, 280, 520, "y", 100), dart(1600, 220, 200, 500, "y", 120), dart(2100, 400, 300, 560, "y", 90)],
    levers: [{ x: 2520, y: 580, id: 1 }],
  },
  {
    id: 11,
    name: "Ostnatá rampa",
    blurb: "Koule dikobraza sem patří.",
    width: 3000,
    height: 720,
    theme: "dusk",
    themeKey: "hreben",
    secret: true,
    spawn: { x: 70, y: 520 },
    platforms: [ground(0, 3000, 620)],
    movers: [],
    coins: [
      { x: 400, y: 584 },
      { x: 900, y: 584 },
      { x: 1500, y: 584 },
      { x: 2100, y: 584 },
      { x: 2700, y: 584 },
    ],
    spikes: [],
    checkpoints: [lantern(1300, 620)],
    flag: { x: 2860, y: 620 },
    guards: [guard(1000, 620, 820, 1280, 70), guard(2000, 620, 1800, 2300, 80)],
    darts: [dart(700, 480, 500, 1200, "x", 140), dart(1800, 400, 1500, 2300, "x", 150, 300)],
    levers: [{ x: 2720, y: 620, id: 2 }],
  },
  {
    id: 12,
    name: "Tichá zahrada",
    blurb: "Dveře, které slyší jen kapibara.",
    width: 2600,
    height: 720,
    theme: "dusk",
    themeKey: "mech",
    secret: true,
    spawn: { x: 70, y: 520 },
    platforms: [ground(0, 700), ground(900, 600), ground(1700, 900)],
    movers: [],
    coins: [
      { x: 300, y: 584 },
      { x: 1100, y: 584 },
      { x: 2000, y: 584 },
      { x: 2400, y: 584 },
    ],
    spikes: [{ x: 710, y: 668, w: 180, h: 52 }],
    checkpoints: [lantern(1100, 620)],
    flag: { x: 2460, y: 620 },
    guards: [],
    levers: [{ x: 2320, y: 620, id: 3 }],
  },
  {
    id: 13,
    name: "Chytrá věž",
    blurb: "Skoky a rozum. Liščí práce.",
    width: 2400,
    height: 720,
    theme: "ruins",
    themeKey: "koruna",
    secret: true,
    spawn: { x: 70, y: 520 },
    platforms: [
      ground(0, 360),
      ledge(460, 500, 140),
      ledge(720, 400, 140),
      ledge(980, 300, 140),
      ground(1280, 280, 540),
      ledge(1680, 430, 150),
      ground(2000, 400),
    ],
    movers: [{ x: 1560, y: 300, w: 120, h: 22, axis: "y", min: 220, max: 460, speed: 60 }],
    coins: [
      { x: 240, y: 584 },
      { x: 520, y: 464 },
      { x: 780, y: 364 },
      { x: 1040, y: 264 },
      { x: 1760, y: 394 },
      { x: 2200, y: 584 },
    ],
    spikes: [{ x: 370, y: 668, w: 900, h: 52 }],
    checkpoints: [lantern(1400, 540)],
    flag: { x: 2260, y: 620 },
    guards: [guard(2100, 620, 2040, 2320, 40)],
    levers: [{ x: 2140, y: 620, id: 4 }],
  },
  {
    id: 14,
    name: "Jeskyně slávy",
    blurb: "May a Mia čekají.",
    width: HALL_LAYOUT.width,
    height: 720,
    theme: "cave",
    themeKey: "slava",
    secret: true,
    hall: true,
    spawn: { x: 70, y: 500 },
    platforms: [
      ground(0, 360, 600),
      solid(360, 0, 420, 568),
      ground(360, 420, 600),
      ground(780, 220, 600),
      ground(1000, 420, 600),
      ground(1420, 80, 600),
      ground(1780, 200, 600),
      ground(2020, HALL_LAYOUT.width - 2020, 600),
      solid(HALL_LAYOUT.daisX, 548, 640, 56),
      solid(HALL_LAYOUT.daisX + 88, 500, 464, 52),
    ],
    movers: [],
    coins: [
      { x: 240, y: 564 },
      { x: 560, y: 580 },
      { x: 1180, y: 564 },
    ],
    spikes: [{ x: 1500, y: 668, w: 280, h: 52 }],
    checkpoints: [lantern(800, 600), lantern(1400, 600), lantern(1820, 600), lantern(2140, 600)],
    flag: { x: -500, y: 600 },
    guards: [],
    darts: [
      dart(1080, 520, 1020, 1380, "x", 150, 0),
      dart(1200, 500, 1020, 1380, "x", 140, 400),
    ],
    doors: [{ x: 1980, y: 500, keyId: "hall-gate" }],
    riddles: [{ x: 2260, y: 560, id: "hall-note" }],
    npcs: [
      { x: HALL_LAYOUT.mayX, y: 518, who: "may" },
      { x: HALL_LAYOUT.miaX, y: 518, who: "mia" },
    ],
  },
];

export function findLevel(id: number, mains: LevelDef[]): LevelDef {
  return mains.find((l) => l.id === id) ?? SECRET_LEVELS.find((l) => l.id === id) ?? mains[0];
}
