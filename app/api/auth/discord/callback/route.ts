import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, makeSetCookieHeader } from "@/lib/auth";
import { getOrCreatePlayerCard } from "@/lib/playerCard";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", req.url));
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/?error=token_exchange", req.url));
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // Fetch Discord user
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/?error=discord_user", req.url));
    }

    const discordUser = await userRes.json();
    const discordId: string = discordUser.id;
    const discordUsername: string = discordUser.username;
    const discordGlobalName: string = discordUser.global_name ?? discordUser.username;
    const discordAvatarUrl: string | null = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
      : null;

    // Check if user already exists (to know if this is first-time registration)
    const existingUser = await prisma.user.findUnique({ where: { discordId } });

    // Upsert user
    const user = await prisma.user.upsert({
      where: { discordId },
      update: {
        discordUsername,
        discordGlobalName,
        discordAvatarUrl,
      },
      create: {
        username: `discord_${discordId}`,
        password: "",
        discordId,
        discordUsername,
        discordGlobalName,
        discordAvatarUrl,
        balance: 0,
      },
    });

    // Chỉ tạo thẻ OVR 50 khi user ĐẦU TIÊN đăng ký (không phải mỗi lần login)
    if (!existingUser) {
      const baseName = (discordGlobalName || user.username || "PLAYER")
        .toString()
        .slice(0, 12)
        .toUpperCase();
      await prisma.card.create({
        data: {
          name: baseName,
          nation: "VN",
          position: "CM",
          rating: 50,
          atk: 50,
          def: 50,
          pas: 50,
          imp: 50,
          series: "Futsal",
          region: "ASIA",
          ownerId: user.id,
        },
      });
    }

    // Create PlayerCard if not exists
    await getOrCreatePlayerCard(user.id, discordGlobalName, discordAvatarUrl ?? undefined);

    // Sign JWT and redirect
    const token = await signToken({ userId: user.id, username: discordGlobalName, role: user.role });
    const res = NextResponse.redirect(new URL("/", req.url));
    res.headers.set("Set-Cookie", makeSetCookieHeader(token));
    return res;
  } catch (e) {
    console.error("Discord callback error:", e);
    return NextResponse.redirect(new URL("/?error=server", req.url));
  }
}
