import { MAIN_LEVELS } from "./constants.ts";
import type { HudState } from "./types.ts";

export function leverCount(s: Pick<HudState, "levers">) {
  return s.levers.filter(Boolean).length;
}

export function canReadFinalRiddle(s: Pick<HudState, "levers" | "cheated">) {
  return leverCount(s) >= 5 || s.cheated;
}

export function canOpenDoor(
  s: Pick<HudState, "keys" | "openedDoors" | "solved" | "owned" | "levers" | "cheated">,
  keyId: string,
  viaAbility: boolean,
) {
  if (keyId === "hall-gate") return viaAbility;
  if (keyId === "hall") {
    if (!s.solved.includes("alencina") && !s.openedDoors.includes("hall")) return false;
    if (!canReadFinalRiddle(s) && !s.openedDoors.includes("hall")) return false;
    if (s.owned.length < 5 && !s.cheated) return false;
    return viaAbility;
  }
  const hasKey = s.keys.includes(keyId) || s.openedDoors.includes(keyId);
  if (!hasKey) return false;
  return viaAbility;
}

export function doorVisible(
  s: Pick<HudState, "keys" | "openedDoors" | "solved" | "levers" | "cheated">,
  keyId: string,
) {
  if (keyId === "hall-gate") return true;
  if (keyId === "hall") {
    return (s.solved.includes("alencina") || s.openedDoors.includes("hall")) && canReadFinalRiddle(s);
  }
  return s.keys.includes(keyId) || s.openedDoors.includes(keyId);
}

export function canEnterLevel(
  s: Pick<HudState, "unlocked" | "keys" | "openedDoors" | "solved" | "levers" | "owned" | "cheated">,
  id: number,
) {
  if (id < MAIN_LEVELS) return id < s.unlocked;
  if (id === 14) {
    return (
      (s.openedDoors.includes("hall") || s.cheated) &&
      (s.owned.length >= 5 || s.cheated) &&
      canReadFinalRiddle(s)
    );
  }
  const map: Record<number, string> = { 9: "mapa", 10: "tma", 11: "jmeno", 12: "houba", 13: "mesic" };
  const key = map[id];
  if (!key) return false;
  return s.openedDoors.includes(key) || s.cheated;
}
