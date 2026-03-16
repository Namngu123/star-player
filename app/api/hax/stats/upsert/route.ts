import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BOT_SECRET = process.env.HAX_BOT_SECRET?.trim() || "star-hax-bot-secret-2026";

type PlayerPayload = {
  auth: string;
  name?: string;
  goals?: number;
  assists?: number;
  wins?: number;
  games?: number;
};

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-hax-secret");
    if (secret !== BOT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { monthKey, players } = body as { monthKey: string; players: PlayerPayload[] };

    if (!monthKey || typeof monthKey !== "string") {
      return NextResponse.json({ error: "Thiếu monthKey (VD: 2025-02)" }, { status: 400 });
    }
    if (!Array.isArray(players)) {
      return NextResponse.json({ error: "Thiếu players (mảng)" }, { status: 400 });
    }

    for (const p of players) {
      const auth = String(p.auth ?? "").trim();
      if (auth.length !== 43) continue;

      const goals = Number(p.goals) || 0;
      const assists = Number(p.assists) || 0;
      const wins = Number(p.wins) || 0;
      const games = Number(p.games) || 0;

      await prisma.haxPlayerStat.upsert({
        where: {
          auth_monthKey: { auth, monthKey },
        },
        create: {
          auth,
          monthKey,
          goals,
          assists,
          wins,
          games,
        },
        update: {
          goals,
          assists,
          wins,
          games,
        },
      });
    }

    return NextResponse.json({ ok: true, count: players.length });
  } catch (e) {
    console.error("hax/stats/upsert error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}