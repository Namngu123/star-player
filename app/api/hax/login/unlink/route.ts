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

    const user = await prisma.user.findUnique({ where: { haxAuth } });
    if (!user) {
      return NextResponse.json({ error: "Auth chưa liên kết" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { haxAuth: null, haxName: null },
    });

    return NextResponse.json({ ok: true, username: user.username });
  } catch (e) {
    console.error("hax/login/unlink error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}