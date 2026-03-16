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

    const isAdmin = session.role === "admin";

    // Tất cả operations trong transaction để đảm bảo atomic
    const result = await prisma.$transaction(async (tx) => {
      // Re-fetch card trong transaction để tránh race condition
      const card = await tx.card.findUnique({ where: { id: cardId } });
      if (!card || !card.listedPrice) {
        throw new Error("Thẻ không có trên market");
      }
      if (card.stock <= 0) {
        throw new Error("Thẻ đã hết hàng");
      }
      if (card.ownerId === session.userId) {
        throw new Error("Không thể mua thẻ của chính mình");
      }

      // Reserve 1 stock using optimistic concurrency to prevent double-buy race.
      // If another request buys first, this updateMany will affect 0 rows and we abort.
      const reserved = await tx.card.updateMany({
        where: {
          id: cardId,
          listedPrice: card.listedPrice,
          ownerId: card.ownerId,
          stock: card.stock,
        },
        data: { stock: { decrement: 1 } },
      });
      if (reserved.count !== 1) {
        throw new Error("Thẻ vừa được mua. Vui lòng tải lại.");
      }

      const buyer = await tx.user.findUnique({ 
      where: { id: session.userId },
      select: { username: true, discordGlobalName: true, balance: true },
    });
    if (!buyer) {
        throw new Error("Lỗi");
    }
    const buyerName = buyer.discordGlobalName || buyer.username || "Người chơi";

      if (!isAdmin) {
        // Deduct buyer balance safely (no negative even under race)
        const debited = await tx.user.updateMany({
          where: { id: session.userId, balance: { gte: card.listedPrice } },
          data: { balance: { decrement: card.listedPrice } },
        });
        if (debited.count !== 1) {
          throw new Error("Không đủ COIN");
        }

        await tx.user.update({
          where: { id: card.ownerId },
          data: { balance: { increment: card.listedPrice } },
        });
      }

      // Clone card for buyer
      const sellerUser = await tx.user.findUnique({
        where: { id: card.ownerId },
        select: { role: true },
      });
      const isSellerAdmin = sellerUser?.role === "admin";

      await tx.card.create({
        data: {
          name: card.name,
          nation: card.nation,
          position: card.position,
          rating: card.rating,
          atk: card.atk,
          def: card.def,
          pas: card.pas,
          imp: card.imp,
          series: card.series,
          region: card.region,
          effect: card.effect,
          avatarText: card.avatarText,
          avatarTextColor: card.avatarTextColor,
          avatarColorMode: card.avatarColorMode,
          avatarColor1: card.avatarColor1,
          avatarColor2: card.avatarColor2,
          avatarColor3: card.avatarColor3,
          ownerId: session.userId,
          listedPrice: null,
          stock: 1,
          isBought: true,
          isFromShop: isSellerAdmin,
        },
      });

      // Finalize source card after reservation decrement (we already decremented stock by 1 above).
      const newStock = card.stock - 1;
      if (newStock <= 0) {
        if (isSellerAdmin) {
          // Admin shop card: keep card with stock=0 (SOLD OUT)
          await tx.card.update({
            where: { id: cardId },
            data: { stock: 0 },
          });
        } else {
          // Regular user: delete original card (already cloned to buyer)
          await tx.lineupSlot.deleteMany({ where: { cardId } });
          await tx.card.delete({ where: { id: cardId } });
        }
      }

      // Tạo notification cho seller khi có người mua card
      await tx.notification.create({
        data: {
          userId: card.ownerId,
          type: "card_sold",
          title: "Thẻ đã được bán",
          message: `${buyerName} đã mua thẻ ${card.name} (OVR ${card.rating}) của bạn với giá ${card.listedPrice} COIN`,
          data: { cardId, buyerId: session.userId, price: card.listedPrice },
        },
    });

      // Return updated balance từ transaction
      const updatedBuyer = await tx.user.findUnique({
      where: { id: session.userId },
      select: { balance: true },
    });

      return { balance: updatedBuyer?.balance };
    });

    return NextResponse.json({ ok: true, balance: result.balance });
  } catch (err: any) {
    console.error("Market buy error:", err);
    const errorMessage = err?.message || "Lỗi server";
    const statusCode = errorMessage.includes("Thẻ") || errorMessage.includes("COIN") || errorMessage.includes("mua thẻ của chính mình") ? 400 : 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}