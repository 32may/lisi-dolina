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

export const listLegends = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    name: string;
    score: number;
    coins: number;
    created_at: string;
    cheater: boolean;
  }>`select id, name, score, coins, created_at, cheater from legend_board order by id asc limit 120`;
  return rows.map(rowToEntry);
});

export const addLegend = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: NameSchema,
      score: z.number().int().min(0).max(1_000_000),
      coins: z.number().int().min(0).max(10_000),
      cheater: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const cheater = Boolean(data.cheater);
    const score = cheater ? 0 : data.score;
    const coins = cheater ? 0 : data.coins;
    await sql`insert into legend_board (name, score, coins, cheater) values (${data.name}, ${score}, ${coins}, ${cheater})`;
    const rows = await sql<{
      id: number;
      name: string;
      score: number;
      coins: number;
      created_at: string;
      cheater: boolean;
    }>`select id, name, score, coins, created_at, cheater from legend_board order by id asc limit 120`;
    return rows.map(rowToEntry);
  });
