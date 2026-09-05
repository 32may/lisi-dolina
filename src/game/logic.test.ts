import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseHadanky } from "./parse-hadanky.ts";
import { awardAmount, coinId, displayLevelTitle, scoreMul } from "./progress.ts";
import { canEnterLevel, canOpenDoor, canReadFinalRiddle, doorVisible, leverCount } from "./rules.ts";
import { coinsFromBanked, looksCheated, newRunId } from "./save.ts";
import type { CharacterId } from "./characters.ts";

const md = readFileSync(new URL("../../hadanky.md", import.meta.url), "utf8");

describe("hadanky.md", () => {
  it("parses bank riddles and Alenčina", () => {
    const p = parseHadanky(md);
    assert.ok(p.bank.length >= 5);
    assert.equal(p.alencina.bankId, "alencina");
    assert.equal(p.alencina.prompt, "Proč je havran jako psací stůl?");
    assert.ok(p.alencina.answer.includes("nevim"));
    assert.ok(p.alencina.answer.includes("nevím"));
    assert.ok(
      p.bank.some((r) => r.bankId === "alencina"),
      "Alenčina je v losování (bank:alencina)",
    );
  });

  it("keeps original five texts", () => {
    const p = parseHadanky(md);
    const byId = Object.fromEntries(p.bank.map((r) => [r.bankId, r]));
    assert.match(byId.mapa.prompt, /Ležím ti na kolenou/);
    assert.match(byId.tma.prompt, /Čím víc mě je/);
    assert.match(byId.jmeno.prompt, /Patří jen tobě/);
    assert.match(byId.houba.prompt, /dírek/);
    assert.equal(byId.mesic.kind, "choice");
    assert.deepEqual(byId.mesic.options?.map(String), ["1", "2", "6", "11", "12"]);
  });

  it("rejects invalid blocks", () => {
    assert.throws(() => parseHadanky("## bank:bad\nkind:word\n"), /chybí title/);
    assert.throws(
      () =>
        parseHadanky(
          "## bank:a\ntitle:t\nkind:choice\nprompt:p\nanswer:x\noptions:1,2,3\n## fixed:alencina\ntitle:a\nkind:word\nprompt:q\nanswer:nevim\n",
        ),
      /5 options/,
    );
  });

  it("accepts Alenčina in the lottery bank", () => {
    const src = [
      "## bank:a",
      "title:A",
      "kind:word",
      "prompt:p",
      "answer:x",
      "## bank:b",
      "title:B",
      "kind:word",
      "prompt:p",
      "answer:x",
      "## bank:c",
      "title:C",
      "kind:word",
      "prompt:p",
      "answer:x",
      "## bank:d",
      "title:D",
      "kind:word",
      "prompt:p",
      "answer:x",
      "## bank:alencina",
      "title:Alenčina",
      "kind:word",
      "prompt:Proč je havran jako psací stůl?",
      "answer:nevim, nevím",
    ].join("\n");
    const p = parseHadanky(src);
    assert.equal(p.bank.length, 5);
    assert.equal(p.alencina.bankId, "alencina");
    assert.ok(p.bank.some((r) => r.bankId === "alencina"));
  });
});

describe("score", () => {
  it("coefficient floors at 0.1", () => {
    assert.equal(scoreMul(0), 1);
    assert.equal(scoreMul(1), 0.9);
    assert.equal(scoreMul(2), 0.8);
    assert.equal(scoreMul(9), 0.1);
    assert.equal(scoreMul(10), 0.1);
    assert.equal(scoreMul(20), 0.1);
  });

  it("rounds awards", () => {
    assert.equal(awardAmount(100, 0), 100);
    assert.equal(awardAmount(100, 1), 90);
    assert.equal(awardAmount(150, 2), 120);
  });

  it("stable coin ids", () => {
    assert.equal(coinId(4, 2), "4:2");
  });
});

describe("rules", () => {
  const base = {
    unlocked: 3,
    keys: ["mapa"],
    openedDoors: [] as string[],
    solved: [] as string[],
    levers: [false, false, false, false, false],
    owned: ["fox"] as CharacterId[],
    cheated: false,
  };

  it("bonus menu needs opened door, not just a key", () => {
    assert.equal(canEnterLevel(base, 9), false);
    assert.equal(canEnterLevel({ ...base, openedDoors: ["mapa"] }, 9), true);
    assert.equal(canEnterLevel(base, 1), true);
    assert.equal(canEnterLevel(base, 3), false);
  });

  it("hall needs five levers, alencina and five heroes", () => {
    const almost = {
      ...base,
      unlocked: 9,
      owned: ["fox", "capybara", "porcupine", "toddler", "robot"] as CharacterId[],
      solved: ["alencina"],
      levers: [true, true, true, true, false],
    };
    assert.equal(canReadFinalRiddle(almost), false);
    assert.equal(doorVisible(almost, "hall"), false);
    const ready = { ...almost, levers: [true, true, true, true, true], openedDoors: ["hall"] };
    assert.equal(canReadFinalRiddle(ready), true);
    assert.equal(canEnterLevel(ready, 14), true);
    assert.equal(leverCount(ready), 5);
  });

  it("physical doors always need ability", () => {
    const s = { ...base, keys: ["mapa"], openedDoors: ["mapa"] as string[] };
    assert.equal(canOpenDoor(s, "mapa", false), false);
    assert.equal(canOpenDoor(s, "mapa", true), true);
  });
});

describe("save helpers", () => {
  it("does not mark an honest full run as cheater", () => {
    assert.equal(looksCheated({ purse: 0 }), false);
    assert.equal(looksCheated({ purse: 85 }), false);
    assert.equal(looksCheated({ purse: 999 }), true);
  });

  it("migrates v3 banked counts to coin ids", () => {
    const coins = coinsFromBanked([2, 0, 1], [12, 14, 16]);
    assert.deepEqual(coins["0"], ["0:0", "0:1"]);
    assert.equal(coins["1"], undefined);
    assert.deepEqual(coins["2"], ["2:0"]);
  });

  it("makes unique run ids", () => {
    assert.notEqual(newRunId(), newRunId());
  });
});

describe("titles", () => {
  it("formats HUD names", () => {
    assert.equal(displayLevelTitle(0, "Jantarový hvozd"), "1. Jantarový hvozd");
    assert.equal(displayLevelTitle(8, "Srdce doliny"), "9. Srdce doliny");
    assert.equal(displayLevelTitle(9, "Plazivá jeskyně"), "Bonus 1");
    assert.equal(displayLevelTitle(14, "Jeskyně slávy"), "Tajná úroveň");
  });
});
