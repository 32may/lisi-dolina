/** Sazby bodů — dokumentované implementační hodnoty. Zaokrouhlení: Math.round. */
export const SCORE = {
  hazard: 100,
  guardPass: 50,
  guardKill: 150,
  doubleJump: 120,
  checkpoint: 100,
  flag: 500,
} as const;

export function coinId(levelId: number, index: number) {
  return `${levelId}:${index}`;
}

export function scoreMul(deathsInLevel: number) {
  return Math.max(0.1, 1 - 0.1 * Math.max(0, deathsInLevel));
}

export function awardAmount(base: number, deathsInLevel: number) {
  return Math.round(base * scoreMul(deathsInLevel));
}

export function displayLevelTitle(id: number, name: string) {
  if (id < 9) return `${id + 1}. ${name}`;
  if (id === 14 || name.toLowerCase().includes("sláv") || name.toLowerCase().includes("legend")) {
    return "Tajná úroveň";
  }
  if (id >= 9 && id <= 13) return `Bonus ${id - 8}`;
  return name;
}
