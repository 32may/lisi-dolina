import { CHARACTERS, type CharacterId } from "./characters";
import { THEME_KEYS } from "./content";

export type CharacterSheets = {
  idle: HTMLImageElement;
  run: HTMLImageElement;
  jump: HTMLImageElement;
  ability?: HTMLImageElement;
};

export interface Assets {
  idle: HTMLImageElement;
  run: HTMLImageElement;
  jump: HTMLImageElement;
  coin: HTMLImageElement;
  flag: HTMLImageElement;
  spike: HTMLImageElement;
  checkpoint: HTMLImageElement;
  checkpointLit: HTMLImageElement;
  wood: HTMLImageElement;
  stone: HTMLImageElement;
  far: HTMLImageElement;
  mid: HTMLImageElement;
  near: HTMLImageElement;
  caveMid: HTMLImageElement;
  guard: HTMLImageElement;
  paper: HTMLImageElement;
  key: HTMLImageElement;
  door: HTMLImageElement;
  lever: HTMLImageElement;
  dart: HTMLImageElement;
  may: HTMLImageElement;
  mia: HTMLImageElement;
  mayClap: HTMLImageElement;
  miaClap: HTMLImageElement;
  curl: HTMLImageElement;
  hallThrones: HTMLImageElement;
  hallCeremony: HTMLImageElement;
  introPlaque: HTMLImageElement;
  shopStall: HTMLImageElement;
  characters: Record<CharacterId, CharacterSheets>;
  skies: Record<string, HTMLImageElement>;
}

const PATHS = {
  idle: "/game/sprites/fox-idle.png",
  run: "/game/sprites/fox-run.png",
  jump: "/game/sprites/fox-jump.png",
  coin: "/game/sprites/coin.png",
  flag: "/game/sprites/flag.png",
  spike: "/game/sprites/spike.png",
  checkpoint: "/game/sprites/checkpoint.png",
  checkpointLit: "/game/sprites/checkpoint-lit.png",
  wood: "/game/sprites/platform-wood.png",
  stone: "/game/sprites/platform-stone.png",
  far: "/game/map/dusk-far.png",
  mid: "/game/map/dusk-mid.png",
  near: "/game/map/dusk-near.png",
  caveMid: "/game/map/cave-mid.png",
  guard: "/game/sprites/guard-walk.png",
  paper: "/game/sprites/paper.png",
  key: "/game/sprites/key.png",
  door: "/game/sprites/door.png",
  lever: "/game/sprites/lever.png",
  dart: "/game/sprites/dart.png",
  may: "/game/sprites/may-idle.png?v=sit3",
  mia: "/game/sprites/mia-idle.png?v=sit3",
  mayClap: "/game/sprites/may-clap.png?v=sit3",
  miaClap: "/game/sprites/mia-clap.png?v=sit3",
  curl: "/game/sprites/porcupine-curl.png",
  hallThrones: "/game/map/hall-thrones.jpg?v=cave6",
  hallCeremony: "/game/map/hall-ceremony.jpg?v=cer1",
  introPlaque: "/game/map/intro-plaque.jpg?v=plaque4",
  shopStall: "/game/sprites/shop-stall.png?v=stall7",
} as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Nepodařilo se načíst ${src}`));
    img.src = src;
  });
}

export async function loadAssets(): Promise<Assets> {
  const baseEntries = await Promise.all(
    (Object.keys(PATHS) as (keyof typeof PATHS)[]).map(async (key) => {
      const img = await loadImage(PATHS[key]);
      return [key, img] as const;
    }),
  );
  const base = Object.fromEntries(baseEntries) as Omit<Assets, "characters" | "skies">;
  const characters = {} as Record<CharacterId, CharacterSheets>;
  await Promise.all(
    CHARACTERS.map(async (c) => {
      const [idle, run, jump] = await Promise.all([
        loadImage(`/game/sprites/${c.id}-idle.png`),
        loadImage(`/game/sprites/${c.id}-run.png`),
        loadImage(`/game/sprites/${c.id}-jump.png`),
      ]);
      const sheets: CharacterSheets = { idle, run, jump };
      if (c.id === "porcupine") sheets.ability = await loadImage("/game/sprites/porcupine-curl.png");
      characters[c.id] = sheets;
    }),
  );
  const skyKeys = [...THEME_KEYS, "slava"];
  const skies: Record<string, HTMLImageElement> = {};
  await Promise.all(
    skyKeys.map(async (k) => {
      skies[k] = await loadImage(`/game/map/${k}-sky.png`);
    }),
  );
  return { ...base, characters, skies };
}
