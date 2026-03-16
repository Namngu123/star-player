import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const packIdParam = body?.packId;

    const result = await prisma.$transaction(async (tx) => {
      const pack = packIdParam
        ? await tx.fixedPack.findUnique({
            where: { id: Number(packIdParam) },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          })
        : await tx.fixedPack.findFirst({
            where: { status: "active" },
            orderBy: { updatedAt: "desc" },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          });

      if (!pack) throw new Error("Chưa có pack nào đang mở");
      if (pack.status !== "active") throw new Error("Pack chưa được mở");
      if (pack.items.length === 0) throw new Error("Pack chưa có cầu thủ nào");

      const target = Math.max(0, Math.min(pack.poolSize ?? 0, pack.items.length));
      if (target <= 0) throw new Error("Pack cấu hình không hợp lệ");

      const user = await tx.user.findUnique({ where: { id: session.userId }, select: { balance: true, username: true, discordGlobalName: true, discordUsername: true } });
      if (!user) throw new Error("User not found");
      const spinCost = 100; // Giá cố định: 100 COIN / lượt
      if (user.balance < spinCost) throw new Error("Không đủ COIN");

      const claims = await tx.fixedPackClaim.findMany({
        where: { userId: session.userId, packId: pack.id },
        select: { itemId: true },
      });
      const claimedSet = new Set(claims.map((c) => c.itemId));
      const claimedCount = claimedSet.size;
      if (claimedCount >= target) throw new Error(`Bạn đã nhận đủ ${target}/${target}`);

      const unclaimed = pack.items.filter((it) => !claimedSet.has(it.id));
      if (unclaimed.length === 0) throw new Error("Bạn đã nhận hết pool hiện tại");

      const picked = pickRandom(unclaimed);

      // Trừ coin
      await tx.user.update({
        where: { id: session.userId },
        data: { balance: { decrement: spinCost } },
      });

      // Tạo thẻ cho user (isBought=true để có thể đăng bán lên market)
      const newCard = await tx.card.create({
        data: {
          name: picked.name,
          nation: picked.nation,
          position: picked.position,
          rating: picked.rating,
          atk: picked.atk,
          def: picked.def,
          pas: picked.pas,
          imp: picked.imp,
          series: picked.series,
          region: picked.region,
          effect: picked.effect,
          avatarText: picked.avatarText,
          avatarTextColor: picked.avatarTextColor,
          avatarColorMode: picked.avatarColorMode,
          avatarColor1: picked.avatarColor1,
          avatarColor2: picked.avatarColor2,
          avatarColor3: picked.avatarColor3,
          ownerId: session.userId,
          listedPrice: null,
          stock: 1,
          isBought: true,
          isFromShop: false,
        },
        include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true, role: true } } },
      });

      await tx.fixedPackClaim.create({
        data: {
          userId: session.userId,
          packId: pack.id,
          itemId: picked.id,
        },
      });

      const updated = await tx.user.findUnique({ where: { id: session.userId }, select: { balance: true } });

      return {
        pack: { id: pack.id, name: pack.name, seasonKey: pack.seasonKey, cost: spinCost, poolSize: pack.poolSize },
        pickedItemId: picked.id,
        claimedCount: claimedCount + 1,
        target,
        rewardCard: newCard,
        balance: updated?.balance ?? 0,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    const msg = err?.message || "Server error";
    const status = msg.includes("COIN") || msg.includes("Pack") || msg.includes("nhận") ? 400 : 500;
    console.error("fixed-pack spin error:", err);
    return NextResponse.json({ error: msg }, { status });
  }
}

