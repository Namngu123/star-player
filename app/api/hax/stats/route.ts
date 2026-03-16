import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RankedPlayer = {
  auth: string;
  name: string;
  goals: number;
  assists: number;
  ownGoals: number;
  cleansheets: number;
  wins: number;
  games: number;
  motms: number;
  points: number;
  rank: number;
  winRate: number;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let monthKey = searchParams.get("month")?.trim();
    if (!monthKey) {
      const d = new Date();
      monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    const rows = await prisma.haxPlayerStat.findMany({
      where: { monthKey },
      orderBy: [{ wins: "desc" }, { goals: "desc" }],
      take: 100,
    });

    const players: RankedPlayer[] = rows.map((p, idx) => ({
      auth: p.auth,
      name: p.auth,
      goals: p.goals,
      assists: 0,
      ownGoals: 0,
      cleansheets: 0,
      wins: p.wins,
      games: p.games,
      motms: 0,
      points: 0,
      rank: idx + 1,
      winRate: p.games > 0 ? Math.round((p.wins / p.games) * 10000) / 100 : 0,
    }));

    return NextResponse.json(players);
  } catch (e) {
    console.error("hax/stats error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
