export const CHEAT_LIST = [
  { code: "IDDQD", label: "Nesmrtelnost" },
  { code: "DOOM", label: "Zabít všechny v úrovni" },
  { code: "IDKFA", label: "Všichni hrdinové" },
  { code: "IAAAY", label: "Vývojářský mód" },
  { code: "MAYOFF", label: "Zrušit kódy" },
] as const;

export type CheatCode = (typeof CHEAT_LIST)[number]["code"];

export const CHEAT_CODES = CHEAT_LIST.map((c) => c.code);

/** Max pause between letters — generous so it is easy to type. */
export const CHEAT_GAP_MS = 4000;
