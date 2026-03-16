import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const packs = await prisma.fixedPack.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: { _count: { select: { items: true, claims: true } } },
    });

    return NextResponse.json(
      packs.map((p) => ({
        id: p.id,
        name: p.name,
        seasonKey: p.seasonKey,
        status: p.status,
        cost: p.cost,
        poolSize: p.poolSize,
        items: p._count.items,
        claims: p._count.claims,
        updatedAt: p.updatedAt,
      })),
    );
  } catch (e) {
    console.error("admin fixed-pack GET error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const seasonKey = String(body?.seasonKey ?? "season").trim() || "season";
    const cost = Number(body?.cost ?? 200);
    const poolSize = Number(body?.poolSize ?? 15);

    if (!name) return NextResponse.json({ error: "Thiếu tên pack" }, { status: 400 });

    const pack = await prisma.fixedPack.create({
      data: {
        name,
        seasonKey,
        cost: Number.isFinite(cost) ? Math.max(0, Math.floor(cost)) : 200,
        poolSize: Number.isFinite(poolSize) ? Math.max(1, Math.floor(poolSize)) : 15,
        status: "draft",
      },
    });

    return NextResponse.json(pack, { status: 201 });
  } catch (e) {
    console.error("admin fixed-pack POST error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const id = Number(body?.id);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Thiếu pack id" }, { status: 400 });

    const pack = await prisma.fixedPack.findUnique({ where: { id } });
    if (!pack) return NextResponse.json({ error: "Không tìm thấy pack" }, { status: 404 });

    const data: any = {};
    if (body?.name !== undefined) data.name = String(body.name);
    if (body?.seasonKey !== undefined) data.seasonKey = String(body.seasonKey || "season");
    if (body?.cost !== undefined) data.cost = Math.max(0, Math.floor(Number(body.cost)));
    if (body?.poolSize !== undefined) data.poolSize = Math.max(1, Math.floor(Number(body.poolSize)));
    if (body?.status !== undefined) data.status = String(body.status);

    // Enforce single active pack: when set active, archive others
    const nextStatus = data.status ?? pack.status;
    if (nextStatus === "active") {
      const itemCount = await prisma.fixedPackItem.count({ where: { packId: id } });
      const target = Math.max(1, Math.floor(data.poolSize ?? pack.poolSize ?? 15));
      if (itemCount < target) {
        return NextResponse.json({ error: `Pack cần tối thiểu ${target} cầu thủ (hiện có ${itemCount}).` }, { status: 400 });
      }
      const updated = await prisma.$transaction(async (tx) => {
        await tx.fixedPack.updateMany({ where: { status: "active", NOT: { id } }, data: { status: "archived" } });
        return tx.fixedPack.update({ where: { id }, data: { ...data, status: "active" } });
      });
      return NextResponse.json(updated);
    }

    const updated = await prisma.fixedPack.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("admin fixed-pack PUT error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

