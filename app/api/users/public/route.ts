import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET: Lấy danh sách tất cả users (public info)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        discordGlobalName: true,
        discordUsername: true,
        discordAvatarUrl: true,
        _count: {
          select: {
            cards: true,
          },
        },
      },
      orderBy: {
        username: "asc",
      },
    });

    return NextResponse.json({ users });
  } catch (e) {
    console.error("users/public GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}