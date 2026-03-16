import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { STAT_KEYS, computeOverall, upgradeCost } from "@/lib/playerCard";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const card = await prisma.playerCard.findUnique({ where: { userId: session.userId } });
    if (!card) return NextResponse.json({ error: "No player card" }, { status: 404 });

    const cost = upgradeCost(card);
    if (user.balance < cost) return NextResponse.json({ error: "Khong du COIN", cost }, { status: 400 });

    await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: cost }} });

    const success = Math.random() < 0.65;
    const deltaStats: Record<string, number> = {};

    if (success) {
      const stat1 = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
      deltaStats[stat1] = Math.random() < 0.5 ? 1 : 2;
      if (Math.random() < 0.30) {
        const others = STAT_KEYS.filter((k) => k !== stat1);
        deltaStats[others[Math.floor(Math.random() * others.length)]] = 1;
      }
      const updates: Record<string, number> = {};
      for (const [k, v] of Object.entries(deltaStats)) {
        updates[k] = Math.min(99, ((card as any)[k] ?? 60) + v);
      }
      const ns = { pac: card.pac, sho: card.sho, pas: card.pas, dri: card.dri, def: card.def, phy: card.phy, ...updates };
      const newOverall = computeOverall(ns, card.position);
      await prisma.playerCard.update({
        where: { id: card.id },
        data: { ...updates, overall: newOverall, rankPoints: newOverall * 10 + (card.upgradeCount + 1) * 5, upgradeCount: { increment: 1 }},
      });
    } else {
      await prisma.playerCard.update({ where: { id: card.id }, data: { upgradeCount: { increment: 1 }} });
    }

    await prisma.upgradeLog.create({ data: { userId: user.id, cardId: card.id, cost, success, deltaStats } });
    const updatedCard = await prisma.playerCard.findUnique({ where: { id: card.id } });
    const updatedUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
    return NextResponse.json({ success, cost, deltaStats, card: updatedCard, balance: updatedUser?.balance });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
