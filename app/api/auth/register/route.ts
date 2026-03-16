import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, makeSetCookieHeader } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json({ error: "Tên tài khoản ít nhất 3 ký tự" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json({ error: "Mật khẩu ít nhất 4 ký tự" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Tên tài khoản đã tồn tại" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const trimmed = username.trim();
    const user = await prisma.user.create({
      data: { username: trimmed, password: hashed },
    });

    await prisma.card.create({
      data: {
        name: trimmed.toUpperCase(),
        nation: "VN",
        position: "CM",
        rating: 50,
        atk: 50,
        def: 50,
        pas: 50,
        imp: 50,
        series: "Futsal",
        region: "ASIA",
        ownerId: user.id,
      },
    });

    const token = await signToken({ userId: user.id, username: user.username, role: user.role });
    const res = NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      balance: user.balance,
    });
    res.headers.set("Set-Cookie", makeSetCookieHeader(token));
    return res;
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}