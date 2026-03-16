import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Admin utility: huỷ toàn bộ listing cũ của user cho các thẻ không còn được phép đăng bán.
// Điều kiện huỷ:
// - Chủ thẻ không phải admin.
// - listedPrice != null (đang ở trên market).
// - isBought == false AND isFromShop == false (thẻ gốc cá nhân).
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const result = await prisma.card.updateMany({
      where: {
        listedPrice: { not: null },
        isBought: false,
        isFromShop: false,
        owner: { role: { not: "admin" } },
      },
      data: {
        listedPrice: null,
      },
    });

    return NextResponse.json({
      ok: true,
      affected: result.count,
    });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}

