import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    await prisma.haxLoginCode.deleteMany({
      where: { userId: session.userId, used: false },
    });

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 120_000);

    await prisma.haxLoginCode.create({
      data: { code, userId: session.userId, expiresAt },
    });

    return NextResponse.json({ code, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error("hax/login/start error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}