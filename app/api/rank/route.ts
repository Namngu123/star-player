import { NextRequest, NextResponse }from "next/server";
import { prisma }from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();

    // ELO-based individual ranking
    const users = await prisma.user.findMany({
      select: { id: true, username: true, discordGlobalName: true, elo: true },
      orderBy: { elo: "desc" },
      take: 100,
    });

    const leaderboard = users.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      username: u.discordGlobalName ?? u.username,
      elo: u.elo,
    }));

    let myEntry = null;
    if (session) {
      const me = leaderboard.find(e => e.userId === session.userId);
      if (me) {
        myEntry = me;
      } else {
        const myUser = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, username: true, discordGlobalName: true, elo: true },
        });
        if (myUser) {
          const rank = users.filter(u => u.elo > myUser.elo).length + 1;
          myEntry = {
            rank,
            userId: myUser.id,
            username: myUser.discordGlobalName ?? myUser.username,
            elo: myUser.elo,
          };
        }
      }
    }

    return NextResponse.json({ leaderboard, me: myEntry });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}