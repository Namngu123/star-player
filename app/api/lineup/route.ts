import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const slots = await prisma.lineupSlot.findMany({
      where: { userId: session.userId },
      include: {
        card: { include: { owner: { select: { username: true } } } },
      },
      orderBy: { slotIndex: "asc" },
    });

    return NextResponse.json(slots);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { slots } = await req.json() as {
      slots: { slotIndex: number; cardId: string | null }[];
    };

    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    await prisma.lineupSlot.deleteMany({ where: { userId: session.userId } });

    const toCreate = slots.filter((s) => s.cardId != null);
    if (toCreate.length > 0) {
      await prisma.lineupSlot.createMany({
        data: toCreate.map((s) => ({
          slotIndex: s.slotIndex,
          cardId: s.cardId!,
          userId: session.userId,
        })),
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}