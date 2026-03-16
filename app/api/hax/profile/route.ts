import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { haxAuth: true, haxName: true, elo: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let matches: { id: number; redScore: number; blueScore: number; createdAt: Date; players: unknown }[] = [];

    if (user.haxAuth) {
      matches = await prisma.matchResult.findMany({
        where: {
          players: {
            path: ["winners"],
            array_contains: user.haxAuth,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }

    return NextResponse.json({
      haxAuth: user.haxAuth,
      haxName: user.haxName,
      elo: user.elo,
      matches: matches.map((m) => ({
        id: m.id,
        won: true,
        scoreWin: m.redScore,
        scoreLose: m.blueScore,
        eloChange: 0,
        date: m.createdAt,
      })),
    });
  } catch (e) {
    console.error("hax/profile error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}