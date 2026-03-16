import { NextResponse }from "next/server";
import { prisma } from "@/lib/db";
import { getSession }from "@/lib/auth";
import { getOrCreatePlayerCard } from "@/lib/playerCard";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ loggedIn: false });
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, role: true, balance: true, discordGlobalName: true, discordAvatarUrl: true, discordId: true },
    });
    if (!user) return NextResponse.json({ loggedIn: false });
    const displayName = user.discordGlobalName ?? user.username;
    const myCard = await getOrCreatePlayerCard(user.id, displayName, user.discordAvatarUrl ?? undefined);
    return NextResponse.json({ loggedIn: true, id: user.id, username: displayName, role: user.role, balance: user.balance, discordId: user.discordId, discordAvatarUrl: user.discordAvatarUrl, myCard });
  } catch { return NextResponse.json({ loggedIn: false }); }
}