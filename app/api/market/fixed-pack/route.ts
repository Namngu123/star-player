import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const packIdParam = searchParams.get("packId");

    const pack = packIdParam
      ? await prisma.fixedPack.findUnique({
          where: { id: Number(packIdParam) },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        })
      : await prisma.fixedPack.findFirst({
          where: { status: "active" },
          orderBy: { updatedAt: "desc" },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        });

    if (!pack) {
      return NextResponse.json({ pack: null, items: [], claimedItemIds: [], claimedCount: 0, target: 0 });
    }

    const target = Math.max(0, Math.min(pack.poolSize ?? 0, pack.items.length));

    // Public preview allowed; progress only when logged in
    if (!session) {
      return NextResponse.json({
        pack: { id: pack.id, name: pack.name, seasonKey: pack.seasonKey, status: pack.status, cost: pack.cost, poolSize: pack.poolSize },
        items: pack.items,
        claimedItemIds: [],
        claimedCount: 0,
        target,
      });
    }

    const claims = await prisma.fixedPackClaim.findMany({
      where: { userId: session.userId, packId: pack.id },
      select: { itemId: true },
    });
    const claimedItemIds = claims.map((c) => c.itemId);

    return NextResponse.json({
      pack: { id: pack.id, name: pack.name, seasonKey: pack.seasonKey, status: pack.status, cost: pack.cost, poolSize: pack.poolSize },
      items: pack.items,
      claimedItemIds,
      claimedCount: claimedItemIds.length,
      target,
    });
  } catch (e) {
    console.error("fixed-pack GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

