import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Thiếu code" }, { status: 400 });
    }

    const record = await prisma.haxLoginCode.findUnique({ where: { code } });
    if (!record || record.userId !== session.userId) {
      return NextResponse.json({ confirmed: false, expired: true });
    }

    if (new Date() > record.expiresAt && !record.used) {
      return NextResponse.json({ confirmed: false, expired: true });
    }

    return NextResponse.json({
      confirmed: record.used,
      expired: false,
    });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}