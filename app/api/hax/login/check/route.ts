import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BOT_SECRET = process.env.HAX_BOT_SECRET?.trim() || "star-hax-bot-secret-2026";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-hax-secret");
    if (secret !== BOT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { haxAuth } = await req.json();
    if (!haxAuth) {
      return NextResponse.json({ error: "Missing haxAuth" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { haxAuth },
      select: {
        id: true,
        username: true,
        discordGlobalName: true,
        discordUsername: true,
        elo: true,
        balance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ linked: false });
    }

    const displayName = user.discordGlobalName || user.discordUsername || user.username;
    return NextResponse.json({
      linked: true,
      userId: user.id,
      username: user.username,
      displayName,
      elo: user.elo,
      balance: user.balance,
    });
  } catch (e) {
    console.error("hax/login/check error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}