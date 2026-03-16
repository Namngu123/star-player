import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function ratingToTierIndex(rating: number): number {
  if (rating >= 91) return 4; // S
  if (rating >= 81) return 3; // A
  if (rating >= 71) return 2; // B
  if (rating >= 61) return 1; // C
  return 0; // D
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const targetId = String(body.targetId ?? "");
    const fodderIds = Array.isArray(body.fodderIds) ? body.fodderIds.map(String) : [];

    if (!targetId || fodderIds.length !== 5) {
      return NextResponse.json({ error: "Thiếu targetId hoặc không đủ 5 thẻ hi sinh" }, { status: 400 });
    }

    if (fodderIds.includes(targetId)) {
      return NextResponse.json({ error: "Không thể dùng chính thẻ đó làm thẻ hi sinh" }, { status: 400 });
    }

    const cards = await prisma.card.findMany({
      where: {
        ownerId: session.userId,
        id: { in: [targetId, ...fodderIds] },
      },
    });

    const target = cards.find((c) => c.id === targetId);
    const fodders = cards.filter((c) => fodderIds.includes(c.id));

    if (!target) return NextResponse.json({ error: "Không tìm thấy thẻ mục tiêu" }, { status: 404 });
    if (fodders.length !== 5) {
      return NextResponse.json({ error: "Không đủ 5 thẻ hi sinh thuộc sở hữu của bạn" }, { status: 400 });
    }

    const currentTier = ratingToTierIndex(target.rating);
    if (currentTier >= 4) {
      return NextResponse.json({ error: "Thẻ đã ở tier cao nhất (S)" }, { status: 400 });
    }

    // Tỉ lệ theo tier fodder
    const tierScores = fodders.map((c) => ratingToTierIndex(c.rating));
    const maxTier = tierScores.length ? Math.max(...tierScores) : 0;
    const minTier = tierScores.length ? Math.min(...tierScores) : 0;
    const isFullSameTier = tierScores.length > 0 && maxTier === minTier;

    // Full C/B/A/S (5 thẻ cùng tier) => chắc chắn nâng.
    // C=1, B=2, A=3, S=4
    const successChance = isFullSameTier && maxTier >= 1
      ? 1
      // Mix/lẻ tẻ => vẫn có trượt, dựa theo tier cao nhất trong bộ fodder.
      : (maxTier >= 2 ? 0.7 : maxTier === 1 ? 0.4 : 0.25);

    const success = Math.random() < successChance;

    const result = await prisma.$transaction(async (tx) => {
      let updatedTarget = target;

      // Đập thẻ:
      // - Thành công: +2~+3 cho 3 chỉ số (atk/def/pas)
      // - IMP không nâng (IMP là meta/elo riêng)
      // - Trượt: không tăng chỉ số
      const successStep = Math.random() < 0.5 ? 2 : 3;

      let newAtk = target.atk;
      let newDef = target.def;
      let newPas = target.pas;
      let newImp = target.imp;

      if (success) {
        newAtk = Math.min(99, newAtk + successStep);
        newDef = Math.min(99, newDef + successStep);
        newPas = Math.min(99, newPas + successStep);
        // IMP giữ nguyên
      }

      // OVR/rating tách khỏi IMP để cho phép meta: OVR cao nhưng IMP thấp (hoặc ngược lại).
      // Không bao giờ cho rating tụt xuống khi đập thẻ.
      const computedRating = Math.round((newAtk + newDef + newPas) / 3);
      const newRating = success ? Math.max(target.rating, computedRating) : target.rating;

      updatedTarget = await tx.card.update({
        where: { id: target.id },
        data: {
          atk: newAtk,
          def: newDef,
          pas: newPas,
          imp: newImp,
          rating: newRating,
        },
      });

      // Xoá hẳn 5 thẻ hi sinh sau khi đập (không hoàn về admin nữa)
      // Cần xóa TradeOffer liên quan trước (foreign key constraint)
      await tx.tradeOffer.deleteMany({
        where: {
          OR: [
            { senderCardId: { in: fodderIds } },
            { receiverCardId: { in: fodderIds } },
          ],
        },
      });
      await tx.lineupSlot.deleteMany({ where: { cardId: { in: fodderIds } } });
      await tx.card.deleteMany({ where: { id: { in: fodderIds } } });

      return updatedTarget;
    });

    const allCards = await prisma.card.findMany({
      where: { ownerId: session.userId },
      include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true } } },
    });

    return NextResponse.json({
      success,
      successChance,
      upgraded: success,
      card: result,
      usedFodders: fodderIds,
      allCards,
    });
  } catch (e) {
    console.error("cards/tier-up error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}