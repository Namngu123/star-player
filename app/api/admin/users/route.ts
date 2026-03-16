import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
      include: {
        _count: { select: { cards: true, lineup: true, upgradeLogs: true, haxLoginCodes: true } },
      },
    });

    const payload = users.map((u) => ({
      id: u.id,
      username: u.username,
      discordName: u.discordGlobalName ?? null,
      role: u.role,
      balance: u.balance,
      cardCount: u._count.cards,
      lineupCount: u._count.lineup,
      upgradeLogCount: u._count.upgradeLogs,
      haxLoginCodeCount: u._count.haxLoginCodes,
    }));

    return NextResponse.json(payload);
  } catch (e) {
    console.error("admin/users GET error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

