import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET: Lấy danh sách notifications
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: any = { userId: session.userId };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.userId, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (e) {
    console.error("notifications GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Đánh dấu đã đọc
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const body = await req.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: session.userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ ok: true });
    }

    if (notificationId) {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: session.userId },
        data: { read: true },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  } catch (e) {
    console.error("notifications POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
