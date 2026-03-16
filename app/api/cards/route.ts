import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const ownerIdParam = searchParams.get("ownerId");

    // Nếu có ownerId param, trả về cards của user đó (public)
    if (ownerIdParam) {
      const ownerId = parseInt(ownerIdParam, 10);
      if (isNaN(ownerId)) {
        return NextResponse.json({ error: "Invalid ownerId" }, { status: 400 });
      }
      const userCards = await prisma.card.findMany({
        where: { ownerId, listedPrice: null },
        include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true, role: true } } },
      });
      return NextResponse.json({ cards: userCards });
    }

    // Admin: xem được toàn bộ thẻ của mọi user
    if (session && session.role === "admin") {
      const all = await prisma.card.findMany({
        include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true, role: true } } },
      });
      return NextResponse.json(all);
    }

    // User thường / khách: chỉ trả về thẻ cần thiết
    const listedCards = await prisma.card.findMany({
      where: { listedPrice: { not: null } },
      include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true, role: true } } },
    });

    let myCards: typeof listedCards = [];
    if (session) {
      myCards = await prisma.card.findMany({
        where: { ownerId: session.userId, listedPrice: null },
        include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true, role: true } } },
      });
    }

    const allCards = [...myCards, ...listedCards];
    return NextResponse.json(allCards);
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const body = await req.json();
    const { name, nation, position, rating, atk, def, pas, imp, series, region, assignTo, stock } = body;

    if (!name || !nation || !position || !rating) {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    let ownerId = session.userId;
    if (assignTo) {
      const target = await prisma.user.findUnique({ where: { username: assignTo } });
      if (target) ownerId = target.id;
    }

    const card = await prisma.card.create({
      data: {
        name, nation, position,
        rating: Number(rating),
        atk: Number(atk) || 50,
        def: Number(def) || 50,
        pas: Number(pas) || 50,
        imp: Number(imp) || 50,
        series: series || "Futsal",
        region: region || "ASIA",
        ownerId,
        stock: Number(stock) || 1,
      },
      include: { owner: { select: { username: true, discordGlobalName: true, discordUsername: true, role: true } } },
    });

    return NextResponse.json(card, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}