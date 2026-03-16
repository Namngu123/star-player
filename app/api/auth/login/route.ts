import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken, makeSetCookieHeader } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username: username.trim() } });
    if (!user) {
      return NextResponse.json({ error: "Sai tài khoản hoặc mật khẩu" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Sai tài khoản hoặc mật khẩu" }, { status: 401 });
    }

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