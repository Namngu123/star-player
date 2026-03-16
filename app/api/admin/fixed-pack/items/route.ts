import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

function toInt(n: unknown, fallback: number) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.floor(x) : fallback;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const packId = Number(body?.packId);
    if (!Number.isFinite(packId)) return NextResponse.json({ error: "Thiếu packId" }, { status: 400 });

    const pack = await prisma.fixedPack.findUnique({ where: { id: packId } });
    if (!pack) return NextResponse.json({ error: "Không tìm thấy pack" }, { status: 404 });

    // Lock edits once pack active and has claims
    if (pack.status === "active") {
      const claimCount = await prisma.fixedPackClaim.count({ where: { packId } });
      if (claimCount > 0) {
        return NextResponse.json({ error: "Pack đang active và đã có người quay. Hãy tạo pack mới cho mùa mới." }, { status: 400 });
      }
    }

    const templateCardId = body?.templateCardId ? String(body.templateCardId) : null;

    const created = await prisma.$transaction(async (tx) => {
      const maxOrder = await tx.fixedPackItem.aggregate({
        where: { packId },
        _max: { sortOrder: true },
      });
      const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

      if (templateCardId) {
        const c = await tx.card.findUnique({ where: { id: templateCardId } });
        if (!c) throw new Error("Không tìm thấy template card");

        return tx.fixedPackItem.create({
          data: {
            packId,
            sortOrder: nextOrder,
            name: c.name,
            nation: c.nation,
            position: c.position,
            rating: c.rating,
            atk: c.atk,
            def: c.def,
            pas: c.pas,
            imp: c.imp,
            series: c.series,
            region: c.region,
            effect: c.effect,
            avatarText: c.avatarText,
            avatarTextColor: c.avatarTextColor,
            avatarColorMode: c.avatarColorMode,
            avatarColor1: c.avatarColor1,
            avatarColor2: c.avatarColor2,
            avatarColor3: c.avatarColor3,
          },
        });
      }

      const item = body?.item ?? {};
      const name = String(item?.name ?? "").trim();
      if (!name) throw new Error("Thiếu tên cầu thủ");

      return tx.fixedPackItem.create({
        data: {
          packId,
          sortOrder: nextOrder,
          name,
          nation: String(item?.nation ?? "VN"),
          position: String(item?.position ?? "CM"),
          rating: toInt(item?.rating, 60),
          atk: toInt(item?.atk, 60),
          def: toInt(item?.def, 60),
          pas: toInt(item?.pas, 60),
          imp: toInt(item?.imp, 60),
          series: String(item?.series ?? "Futsal"),
          region: String(item?.region ?? "ASIA"),
          effect: item?.effect ? String(item.effect) : null,
          avatarText: item?.avatarText ? String(item.avatarText) : null,
          avatarTextColor: String(item?.avatarTextColor ?? "#FFFFFF"),
          avatarColorMode: toInt(item?.avatarColorMode, 1),
          avatarColor1: String(item?.avatarColor1 ?? "#8b6914"),
          avatarColor2: String(item?.avatarColor2 ?? "#8b6914"),
          avatarColor3: String(item?.avatarColor3 ?? "#8b6914"),
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Lỗi server";
    console.error("admin fixed-pack items POST error:", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const itemId = Number(body?.itemId);
    if (!Number.isFinite(itemId)) return NextResponse.json({ error: "Thiếu itemId" }, { status: 400 });

    const item = await prisma.fixedPackItem.findUnique({ where: { id: itemId }, include: { pack: true } });
    if (!item) return NextResponse.json({ error: "Không tìm thấy item" }, { status: 404 });

    // Lock edits once pack active and has claims
    if (item.pack.status === "active") {
      const claimCount = await prisma.fixedPackClaim.count({ where: { itemId } });
      if (claimCount > 0) {
        return NextResponse.json({ error: "Item đã có người nhận, không thể chỉnh sửa. Hãy tạo pack mới." }, { status: 400 });
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.position !== undefined) updates.position = String(body.position);
    if (body.nation !== undefined) updates.nation = String(body.nation);
    if (body.rating !== undefined) updates.rating = toInt(body.rating, item.rating);
    if (body.atk !== undefined) updates.atk = toInt(body.atk, item.atk);
    if (body.def !== undefined) updates.def = toInt(body.def, item.def);
    if (body.pas !== undefined) updates.pas = toInt(body.pas, item.pas);
    if (body.imp !== undefined) updates.imp = toInt(body.imp, item.imp);
    if (body.series !== undefined) updates.series = String(body.series);
    if (body.region !== undefined) updates.region = String(body.region);
    if (body.effect !== undefined) updates.effect = body.effect ? String(body.effect) : null;
    if (body.avatarText !== undefined) updates.avatarText = body.avatarText ? String(body.avatarText) : null;
    if (body.avatarTextColor !== undefined) updates.avatarTextColor = String(body.avatarTextColor);
    if (body.avatarColorMode !== undefined) updates.avatarColorMode = toInt(body.avatarColorMode, item.avatarColorMode);
    if (body.avatarColor1 !== undefined) updates.avatarColor1 = String(body.avatarColor1);
    if (body.avatarColor2 !== undefined) updates.avatarColor2 = String(body.avatarColor2);
    if (body.avatarColor3 !== undefined) updates.avatarColor3 = String(body.avatarColor3);

    const updated = await prisma.fixedPackItem.update({
      where: { id: itemId },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    const msg = e?.message || "Lỗi server";
    console.error("admin fixed-pack items PUT error:", e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const body = await req.json();
    const itemId = Number(body?.itemId);
    if (!Number.isFinite(itemId)) return NextResponse.json({ error: "Thiếu itemId" }, { status: 400 });

    const item = await prisma.fixedPackItem.findUnique({ where: { id: itemId }, include: { pack: true } });
    if (!item) return NextResponse.json({ error: "Không tìm thấy item" }, { status: 404 });

    if (item.pack.status === "active") {
      const claimCount = await prisma.fixedPackClaim.count({ where: { itemId } });
      if (claimCount > 0) {
        return NextResponse.json({ error: "Item đã có người nhận, không thể xoá. Hãy tạo pack mới." }, { status: 400 });
      }
    }

    await prisma.fixedPackItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin fixed-pack items DELETE error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

