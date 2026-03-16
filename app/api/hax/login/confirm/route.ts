import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BOT_SECRET = process.env.HAX_BOT_SECRET?.trim() || "star-hax-bot-secret-2026";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-hax-secret");
    if (secret !== BOT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { code, haxAuth, name } = await req.json();
    if (!code || !haxAuth) {
      return NextResponse.json({ error: "Thiếu code hoặc haxAuth" }, { status: 400 });
    }

    const record = await prisma.haxLoginCode.findUnique({ where: { code } });
    if (!record) {
      return NextResponse.json({ error: "Code không tồn tại" }, { status: 404 });
    }
    if (record.used) {
      return NextResponse.json({ error: "Code đã được dùng" }, { status: 400 });
    }
    if (new Date() > record.expiresAt) {
      return NextResponse.json({ error: "Code đã hết hạn" }, { status: 410 });
    }

    const existing = await prisma.user.findUnique({ where: { haxAuth } });
    if (existing && existing.id !== record.userId) {
      return NextResponse.json({ error: "Auth này đã liên kết với tài khoản khác" }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.haxLoginCode.update({
        where: { code },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { haxAuth, haxName: name || null },
      }),
    ]);

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    return NextResponse.json({
      ok: true,
      username: user?.username,
      displayName: user?.discordGlobalName || user?.discordUsername || user?.username,
    });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}