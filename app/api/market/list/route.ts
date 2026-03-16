import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function tierOf(rating: number): "S" | "A" | "B" | "C" | "D" {
  if (rating >= 91) return "S";
  if (rating >= 81) return "A";
  if (rating >= 71) return "B";
  if (rating >= 61) return "C";
  return "D";
}

const TIER_MAX_PRICE: Record<ReturnType<typeof tierOf>, number> = {
  D: 40,
  C: 100,
  B: 300,
  A: 700,
  S: 3000,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { cardId, price, stock } = await req.json();
    if (!cardId || !price || price < 1) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }
    const isAdmin = session.role === "admin";

    // Anti-cheat: minimum listing price 30 cho user thường
    if (!isAdmin && price < 30) {
      return NextResponse.json({ error: "Giá tối thiểu là 30 COIN" }, { status: 400 });
    }

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      return NextResponse.json({ error: "Không tìm thấy thẻ" }, { status: 404 });
    }
    if (!isAdmin && card.ownerId !== session.userId) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    // User chỉ được đăng bán thẻ đã mua / mở pack (isBought hoặc isFromShop).
    // Thẻ gốc của user (tặng, seed) không được phép đăng bán.
    if (!isAdmin && !card.isBought && !card.isFromShop) {
      return NextResponse.json({ error: "Thẻ này không được phép đăng bán" }, { status: 400 });
    }

    // Điều tiết giá cho user thường theo tier (D, C, B, A, S).
    if (!isAdmin) {
      // Giá trần tuyệt đối cho user để tránh phá giá quá cao.
      if (price > 3000) {
        return NextResponse.json({ error: "Giá tối đa là 3000 COIN" }, { status: 400 });
      }

      const tier = tierOf(card.rating);
      const maxAllowed = TIER_MAX_PRICE[tier];
      if (price > maxAllowed) {
        return NextResponse.json(
          { error: `Thẻ tier ${tier} chỉ được phép bán tối đa ${maxAllowed} COIN` },
          { status: 400 },
        );
      }
    }

    await prisma.lineupSlot.deleteMany({
      where: { cardId, userId: card.ownerId },
    });

    const updated = await prisma.card.update({
      where: { id: cardId },
      data: {
        listedPrice: Number(price),
        stock: isAdmin && stock !== undefined ? Math.max(1, Number(stock)) : 1,
      },
      include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true, role: true } } },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("market/list error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}