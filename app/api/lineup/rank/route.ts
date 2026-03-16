import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function GET() {
  try {
    const slots = await prisma.lineupSlot.findMany({
      include: {
        user: { select: { id: true, username: true, discordGlobalName: true, lineupElo: true } },
        card: true,
      },
      orderBy: { slotIndex: "asc" },
    });

    const byUser = new Map<
      number,
      { username: string; lineupElo: number; slots: { slotIndex: number; card: (typeof slots)[0]["card"] }[] }
    >();

    for (const s of slots) {
      const entry = byUser.get(s.userId);
      if (entry) {
        entry.slots.push({ slotIndex: s.slotIndex, card: s.card });
      }else {
        byUser.set(s.userId, {
          username: s.user.discordGlobalName ?? s.user.username,
          lineupElo: s.user.lineupElo,
          slots: [{ slotIndex: s.slotIndex, card: s.card }],
        });
      }
    }

    const rankings = Array.from(byUser.entries())
      .map(([userId, { username, lineupElo, slots: userSlots }]) => {
        if (userSlots.length < 5) return null;
        const cards = userSlots
          .sort((a, b) => a.slotIndex - b.slotIndex)
          .map((s) => s.card);
        const count = cards.length;
        const avg = (key: "rating" | "atk" | "def" | "pas" | "imp") =>
          Math.round(cards.reduce((acc, c) => acc + (c as any)[key], 0) / count);

        return {
          userId,
          username,
          lineupElo,
          count,
          avgOvr: avg("rating"),
          avgAtk: avg("atk"),
          avgDef: avg("def"),
          avgPas: avg("pas"),
          avgImp: avg("imp"),
          cards,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b as any).lineupElo - (a as any).lineupElo)
      .slice(0, 100);

    return NextResponse.json(rankings);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}