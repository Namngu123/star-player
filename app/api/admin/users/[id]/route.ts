import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const { id } = await params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "User id không hợp lệ" }, { status: 400 });
    }

    const body = await req.json();
    const balance = Number(body?.balance);
    if (!Number.isFinite(balance)) {
      return NextResponse.json({ error: "COIN không hợp lệ" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { balance: Math.trunc(balance) },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/users/[id] PATCH error:", e);
    const msg = String(e?.message || "");
    const status = msg.includes("Record to update not found") ? 404 : 500;
    return NextResponse.json({ error: status === 404 ? "Không tìm thấy user" : "Lỗi server" }, { status });
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
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "User id không hợp lệ" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Trades: delete offers involving user or user's cards
      await tx.tradeOffer.deleteMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
            { senderCard: { ownerId: userId } },
            { receiverCard: { ownerId: userId } },
          ],
        },
      });

      // Lineup slots: clear user's lineup + any slots referencing user's cards
      await tx.lineupSlot.deleteMany({ where: { userId } });
      await tx.lineupSlot.deleteMany({ where: { card: { ownerId: userId } } });

      // Cards
      await tx.card.deleteMany({ where: { ownerId: userId } });

      // PlayerCard & upgrade logs
      await tx.upgradeLog.deleteMany({
        where: { OR: [{ userId }, { card: { userId } }] },
      });
      await tx.playerCard.deleteMany({ where: { userId } });

      // Misc user-owned tables
      await tx.haxLoginCode.deleteMany({ where: { userId } });
      await tx.haxDailyWinReward.deleteMany({ where: { userId } });
      await tx.dailyReward.deleteMany({ where: { userId } });
      await tx.battlePassClaim.deleteMany({ where: { userId } });
      await tx.fixedPackClaim.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });

      // Finally user
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/users/[id] DELETE error:", e);
    const msg = String(e?.message || "");
    const status = msg.includes("Record to delete does not exist") ? 404 : 500;
    return NextResponse.json({ error: status === 404 ? "Không tìm thấy user" : "Lỗi server" }, { status });
  }
}

