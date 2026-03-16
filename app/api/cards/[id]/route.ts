import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const card = await prisma.card.findUnique({
      where: { id },
      include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true, role: true } } },
    });
    if (!card) {
      return NextResponse.json({ error: "Không tìm thấy thẻ" }, { status: 404 });
    }
    return NextResponse.json(card);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const card = await prisma.card.findUnique({ where: { id } });
    if (!card) {
      return NextResponse.json({ error: "Không tìm thấy thẻ" }, { status: 404 });
    }

    const isAdmin = session.role === "admin";

    if (card.ownerId !== session.userId && !isAdmin) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};

    // Chủ thẻ có thể đổi vị trí ở mọi thẻ; các field khác của thẻ mua từ market vẫn chỉ admin được phép sửa.
    if (body.name !== undefined && (!card.isBought || isAdmin)) data.name = body.name;
    if (body.position !== undefined) data.position = body.position;
    if (body.nation !== undefined && (!card.isBought || isAdmin)) data.nation = body.nation;
    if (body.avatarText !== undefined && (!card.isBought || isAdmin)) data.avatarText = body.avatarText;
    if (body.avatarTextColor !== undefined && (!card.isBought || isAdmin)) data.avatarTextColor = body.avatarTextColor;
    if (body.avatarColorMode !== undefined && (!card.isBought || isAdmin)) data.avatarColorMode = body.avatarColorMode;
    if (body.avatarColor1 !== undefined && (!card.isBought || isAdmin)) data.avatarColor1 = body.avatarColor1;
    if (body.avatarColor2 !== undefined && (!card.isBought || isAdmin)) data.avatarColor2 = body.avatarColor2;
    if (body.avatarColor3 !== undefined && (!card.isBought || isAdmin)) data.avatarColor3 = body.avatarColor3;

    if (isAdmin) {
      if (body.effect !== undefined) data.effect = body.effect || null;
      if (body.rating !== undefined) data.rating = Number(body.rating);
      if (body.atk !== undefined) data.atk = Number(body.atk);
      if (body.def !== undefined) data.def = Number(body.def);
      if (body.pas !== undefined) data.pas = Number(body.pas);
      if (body.imp !== undefined) data.imp = Number(body.imp);
      if (body.series !== undefined) data.series = body.series;
      if (body.region !== undefined) data.region = body.region;
    }

    const updated = await prisma.card.update({
      where: { id },
      data,
      include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.lineupSlot.deleteMany({ where: { cardId: id } });
    await prisma.card.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}