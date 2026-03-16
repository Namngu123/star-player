/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db";

export type StatKey = "pac" | "sho" | "pas" | "dri" | "def" | "phy";
export const STAT_KEYS: StatKey[] = ["pac", "sho", "pas", "dri", "def", "phy"];

const POSITION_WEIGHTS: Record<string, Record<StatKey, number>> = {
  GK:  { pac: 0.10, sho: 0.05, pas: 0.10, dri: 0.10, def: 0.40, phy: 0.25 },
  CB:  { pac: 0.15, sho: 0.05, pas: 0.15, dri: 0.10, def: 0.35, phy: 0.20 },
  CM:  { pac: 0.15, sho: 0.15, pas: 0.30, dri: 0.20, def: 0.10, phy: 0.10 },
  ST:  { pac: 0.20, sho: 0.35, pas: 0.15, dri: 0.20, def: 0.05, phy: 0.05 },
};

export function computeOverall(stats: Record<StatKey, number>, position: string): number {
  const w = POSITION_WEIGHTS[position] ?? POSITION_WEIGHTS.CM;
  const raw = STAT_KEYS.reduce((sum, k) => sum + stats[k] * w[k], 0);
  return Math.round(raw);
}

function randBase(pos: string): Record<StatKey, number> {
  const bases: Record<string, Record<StatKey, [number, number]>> = {
    GK: { pac: [50,65], sho: [40,55], pas: [55,65], dri: [50,60], def: [65,75], phy: [60,70] },
    CB: { pac: [55,65], sho: [45,55], pas: [55,65], dri: [50,60], def: [65,75], phy: [60,70] },
    CM: { pac: [60,70], sho: [55,65], pas: [65,75], dri: [60,70], def: [50,60], phy: [55,65] },
    ST: { pac: [65,75], sho: [65,75], pas: [55,65], dri: [65,75], def: [40,50], phy: [55,65] },
  };
  const b = bases[pos] ?? bases.CM;
  const result = {} as Record<StatKey, number>;
  for (const k of STAT_KEYS) {
    result[k] = Math.floor(Math.random() * (b[k][1] - b[k][0] + 1)) + b[k][0];
  }
  return result;
}

export async function getOrCreatePlayerCard(userId: number, displayName: string, avatarUrl?: string) {
  const existing = await prisma.playerCard.findUnique({ where: { userId } });
  if (existing) return existing;

  const positions = ["GK", "CB", "CM", "ST"] as const;
  const position = positions[Math.floor(Math.random() * positions.length)];
  const stats = randBase(position);
  const overall = computeOverall(stats, position);

  return prisma.playerCard.create({
    data: {
      userId,
      displayName,
      avatarUrl: avatarUrl ?? null,
      position,
      ...stats,
      overall,
      rankPoints: overall * 10,
    },
  });
}

export function upgradeCost(card: any): number {
  return 100 + card.overall * 5 + card.upgradeCount * 20;
}
