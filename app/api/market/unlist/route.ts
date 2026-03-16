import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { cardId } = await req.json();
    if (!cardId) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return NextResponse.json({ error: "Không tìm thấy thẻ" }, { status: 404 });
    }
    if (card.ownerId !== session.userId && session.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: { listedPrice: null },
      include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
