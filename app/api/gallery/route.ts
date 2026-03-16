import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public gallery: thống kê user theo số lượng thẻ
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { not: "admin" },
        username: { not: "Tuyet" },
      },
      include: {
        _count: { select: { cards: true } },
      },
      orderBy: {
        cards: {
          _count: "desc",
        },
      },
    });

    const payload = users
      .filter((u) => u._count.cards > 0)
      .map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.discordGlobalName ?? u.discordUsername ?? u.username,
        avatarUrl: u.discordAvatarUrl ?? null,
        cardCount: u._count.cards,
      }));

    return NextResponse.json({ users: payload });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
