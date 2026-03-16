import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession }from "@/lib/auth";

const PACK_CONFIG = {
  silver: { cost: 50, statCount: 1, minGain: 1, maxGain: 1 },
  gold: { cost: 100, statCount: 2, minGain: 1, maxGain: 2 },
  red: { cost: 200, statCount: 3, minGain: 2, maxGain: 3 },
} as const;

// Pack nâng chỉ số: KHÔNG nâng IMP (IMP là meta lấy từ ELO cá nhân / cơ chế riêng).
type StatKey = "atk" | "def" | "pas";
const STAT_KEYS: StatKey[] = ["atk", "def", "pas"];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { packId, cardId } = await req.json();
    const config = PACK_CONFIG[packId as keyof typeof PACK_CONFIG];
    if (!config) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.balance < config.cost) return NextResponse.json({ error: "Không đủ COIN", cost: config.cost }, { status: 400 });

    // Lấy thẻ mục tiêu: ưu tiên cardId client gửi lên, fallback thẻ rating cao nhất
    let card = cardId
      ? await prisma.card.findFirst({
          where: { id: String(cardId), ownerId: session.userId },
        })
      : null;

    if (!card) {
      card = await prisma.card.findFirst({
        where: { ownerId: session.userId },
        orderBy: { rating: "desc" },
      });
    }
    if (!card) return NextResponse.json({ error: "Bạn chưa có thẻ nào" }, { status: 400 });

    // Trừ COIN
    await prisma.user.update({ where: { id: user.id }, data: { balance: { decrement: config.cost } } });

    // Chọn ngẫu nhiên stat để nâng
    const shuffled = [...STAT_KEYS].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, config.statCount);
    const deltaStats: Record<string, number> = {};
    for (const stat of chosen) {
      deltaStats[stat] = Math.floor(Math.random() * (config.maxGain - config.minGain + 1)) + config.minGain;
    }

    // Tính giá trị mới
    const updates: Record<string, number> = {};
    for (const [k, v] of Object.entries(deltaStats)) {
      updates[k] = Math.min(99, (card[k as keyof typeof card] as number) + v);
    }

    // Tính rating mới = trung bình 4 chỉ số, nhưng không bao giờ tụt
    const newAtk = updates.atk ?? card.atk;
    const newDef = updates.def ?? card.def;
    const newPas = updates.pas ?? card.pas;
    // OVR/rating tách khỏi IMP để cho phép meta (OVR cao nhưng IMP thấp).
    const avgRating = Math.round((newAtk + newDef + newPas) / 3);
    const newRating = Math.max(card.rating, avgRating);

    const updatedCard = await prisma.card.update({
      where: { id: card.id },
      data: { ...updates, rating: newRating },
      include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true } } },
    });

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true }});

    return NextResponse.json({ deltaStats, card: updatedCard, balance: updatedUser?.balance });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
