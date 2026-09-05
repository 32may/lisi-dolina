import type { HudState, LegendEntry } from "./types";

export const HALL_LINES: { who: "may" | "mia" | "both"; text: string }[] = [
  { who: "may", text: "Gratulujeme vám hrdinové!" },
  { who: "mia", text: "I tobě statečný hráči!" },
  {
    who: "may",
    text: "Že jste došli až sem a prokázali tak nejen statečnost a rychlé prsty na klávesnici...",
  },
  { who: "mia", text: "...ale i chytrost a vytrvalost!" },
  { who: "both", text: "Nyní se můžete právem zapsat mezi legendy LIŠČÍ DOLINY." },
];

export const EPILOGUE_LINES: { face: "happy" | "think" | "smile"; text: string }[] = [
  { face: "happy", text: "Gratuluji k dohrání všech úrovní!" },
  {
    face: "think",
    text: "Pokud se však chceš zapsat mezi legendy této hry, musíš najít jeskyni tvůrců.",
  },
  {
    face: "smile",
    text: "Hledej tajné portály. Volný průchod všemi úrovněmi je ti k dispozici.",
  },
];

export const INTRO_LINE = "Zvládneš se zapsat mezi legendy této hry?";

export function runTotals(s: Pick<HudState, "banked" | "runDeaths">): { coins: number; score: number } {
  const coins = s.banked.reduce((a, n) => a + (n || 0), 0);
  const score = Math.max(0, coins * 100 - (s.runDeaths || 0) * 25);
  return { coins, score };
}

export function formatLegend(e: LegendEntry) {
  if (e.cheater) return `${e.name}  cheater`;
  return `${e.name}  ${e.score} b · ${e.coins} m`;
}

export function layoutLegendSlots(entries: LegendEntry[], slots = 12) {
  const layers = Array(slots).fill(0);
  const slotCheater = Array(slots).fill(false);
  const slotAge = Array(slots).fill(-1);
  return entries.map((e, i) => {
    const free = layers.findIndex((n) => n === 0);
    if (free >= 0) {
      layers[free] = 1;
      slotCheater[free] = Boolean(e.cheater);
      slotAge[free] = i;
      return { slot: free, layer: 0 };
    }
    let best = 0;
    let bestRank = Number.POSITIVE_INFINITY;
    for (let s = 0; s < slots; s++) {
      const rank = (slotCheater[s] ? 0 : 1) * 10000 + layers[s] * 100 + slotAge[s] * 0.001;
      if (rank < bestRank) {
        bestRank = rank;
        best = s;
      }
    }
    const layer = layers[best];
    layers[best] += 1;
    slotCheater[best] = Boolean(e.cheater);
    slotAge[best] = i;
    return { slot: best, layer };
  });
}
