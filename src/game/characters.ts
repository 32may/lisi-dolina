export type CharacterId = "fox" | "capybara" | "porcupine" | "toddler" | "robot";
export type AbilityId = "riddle" | "door" | "curl" | "charm" | "fly";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  hint: string;
  blurb: string;
  price: number;
  w: number;
  h: number;
  drawW: number;
  drawH: number;
  runSpeed: number;
  jumpVel: number;
  doubleJumpVel: number;
  canJump: boolean;
  extraJumps: number;
  ability: AbilityId;
  abilityHold: boolean;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "fox",
    name: "Liška",
    hint: "Chytrost",
    blurb: "Čte hádanky a bere klíče.",
    price: 0,
    w: 30,
    h: 44,
    drawW: 64,
    drawH: 72,
    runSpeed: 360,
    jumpVel: -720,
    doubleJumpVel: -640,
    canJump: true,
    extraJumps: 1,
    ability: "riddle",
    abilityHold: false,
  },
  {
    id: "capybara",
    name: "Kapibara",
    hint: "Zdánlivě nic",
    blurb: "Klidná. Dveře se jí samy otevřou.",
    price: 12,
    w: 42,
    h: 36,
    drawW: 72,
    drawH: 56,
    runSpeed: 230,
    jumpVel: -560,
    doubleJumpVel: 0,
    canJump: true,
    extraJumps: 0,
    ability: "door",
    abilityHold: false,
  },
  {
    id: "porcupine",
    name: "Dikobraz",
    hint: "Koule",
    blurb: "Schoulí se a zničí, co letí i jde.",
    price: 18,
    w: 34,
    h: 38,
    drawW: 64,
    drawH: 58,
    runSpeed: 300,
    jumpVel: -640,
    doubleJumpVel: -580,
    canJump: true,
    extraJumps: 1,
    ability: "curl",
    abilityHold: true,
  },
  {
    id: "toddler",
    name: "Batole",
    hint: "Roztomilost",
    blurb: "Neskáče. Strážce ho odnese k lucerně.",
    price: 22,
    w: 40,
    h: 26,
    drawW: 72,
    drawH: 32,
    runSpeed: 150,
    jumpVel: 0,
    doubleJumpVel: 0,
    canJump: false,
    extraJumps: 0,
    ability: "charm",
    abilityHold: false,
  },
  {
    id: "robot",
    name: "Robot",
    hint: "Křehký letec",
    blurb: "Létá, ale nesmí do ničeho narazit.",
    price: 33,
    w: 32,
    h: 40,
    drawW: 60,
    drawH: 64,
    runSpeed: 310,
    jumpVel: -420,
    doubleJumpVel: 0,
    canJump: true,
    extraJumps: 0,
    ability: "fly",
    abilityHold: true,
  },
];

export const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<
  CharacterId,
  CharacterDef
>;

export function isCharacterId(v: unknown): v is CharacterId {
  return typeof v === "string" && v in CHAR_BY_ID;
}
