import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { NAME_MAX } from "./constants";
import type { LegendEntry } from "./types";

const NameSchema = z
  .string()
  .trim()
  .min(1)
  .max(NAME_MAX)
  .regex(/^[\p{L}\p{N} .'_-]+$/u);

function rowToEntry(r: {
  id: number;
  name: string;
  score: number;
  coins: number;
  created_at: string;
  cheater?: boolean;
}): LegendEntry {
  return {
    id: Number(r.id),
    name: String(r.name).slice(0, NAME_MAX),
    score: Math.max(0, Number(r.score) || 0),
    coins: Math.max(0, Number(r.coins) || 0),
    createdAt: String(r.created_at ?? ""),
    cheater: Boolean(r.cheater),
  };
}

async function listRows(sql: Awaited<ReturnType<typeof getSql>>) {
  const rows = await sql<{
    id: number;
    name: string;
    score: number;
    coins: number;
    created_at: string;
    cheater: boolean;
  }>`select id, name, score, coins, created_at, cheater from legend_board order by id asc limit 2000`;
  return rows.map(rowToEntry);
}

export const listLegends = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return listRows(sql);
});

export const addLegend = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: NameSchema,
      score: z.number().int().min(0).max(1_000_000),
      coins: z.number().int().min(0).max(10_000),
      cheater: z.boolean().optional(),
      runId: z.string().min(1).max(80).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const cheater = Boolean(data.cheater);
    const score = cheater ? 0 : data.score;
    const coins = cheater ? 0 : data.coins;
    const runId = data.runId ?? null;
    if (runId) {
      const existing = await sql<{ id: number }>`select id from legend_board where run_id = ${runId} limit 1`;
      if (existing.length) return listRows(sql);
    }
    if (runId) {
      await sql`insert into legend_board (name, score, coins, cheater, run_id) values (${data.name}, ${score}, ${coins}, ${cheater}, ${runId})`;
    } else {
      await sql`insert into legend_board (name, score, coins, cheater) values (${data.name}, ${score}, ${coins}, ${cheater})`;
    }
    return listRows(sql);
  });
