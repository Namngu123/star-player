import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Helper: IMP từ ELO cá nhân
function impFromElo(elo: number): number {
  const effectiveElo = Math.max(400, elo);
  const base = 50 + (effectiveElo - 1000) / 20;
  return Math.max(40, Math.min(90, Math.round(base)));
}

// Helper: OVR từ ELO cá nhân
function ovrFromElo(elo: number): number {
  const effectiveElo = Math.max(400, elo);
  const base = 50 + (effectiveElo - 400) * 25 / 1600;
  return Math.max(50, Math.min(75, Math.round(base)));
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = today.toISOString().split("T")[0];

    const claimed = await prisma.dailyReward.findUnique({
      where: { userId_dateKey: { userId: session.userId, dateKey } },
    });

    return NextResponse.json({ claimed: !!claimed });
  } catch (e) {
    console.error("daily-reward GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = today.toISOString().split("T")[0];

    // Check if already claimed
    const existing = await prisma.dailyReward.findUnique({
      where: { userId_dateKey: { userId: session.userId, dateKey } },
    });

    if (existing) {
      return NextResponse.json({ error: "Bạn đã nhận phần thưởng hôm nay rồi!" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { elo: true },
    });

    // 70% card, 30% coin
    const isCardReward = Math.random() < 0.7;
    let result: { type: "card" | "coin"; value: number; card?: any };

    if (isCardReward) {
      // Tạo card OVR 60-75, không từ admin pool
      const users = await prisma.user.findMany({
        where: { role: "user" },
        select: { username: true, discordGlobalName: true, discordUsername: true, elo: true },
      });

      let randomName = "Player";
      let cardOwnerElo = user?.elo ?? 1000;

      if (users.length > 0) {
        // Weighted selection: top 1-10 ELO có weight thấp hơn
        const sortedUsers = [...users].sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000));
        const top10Elo = sortedUsers.slice(0, Math.min(10, sortedUsers.length)).map(u => u.elo ?? 1000);
        const top10Set = new Set(top10Elo);

        const weights = users.map((u) => {
          const elo = u.elo ?? 1000;
          return top10Set.has(elo) ? 0.15 : 1.0;
        });
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        let roll = Math.random() * totalWeight;
        let selectedUser = users[0];
        for (let i = 0; i < users.length; i++) {
          roll -= weights[i];
          if (roll <= 0) {
            selectedUser = users[i];
            break;
          }
        }
        randomName = selectedUser.discordGlobalName || selectedUser.discordUsername || selectedUser.username;
        cardOwnerElo = selectedUser.elo ?? 1000;
      }

      // OVR từ ELO: 60-75
      const targetOvr = Math.max(60, Math.min(75, ovrFromElo(cardOwnerElo)));
      const imp = impFromElo(cardOwnerElo);

      // Randomize ATK/DEF/PAS xung quanh target OVR
      const spread = 5;
      const atk = Math.max(50, Math.min(85, targetOvr + Math.floor(Math.random() * spread * 2) - spread));
      const def = Math.max(50, Math.min(85, targetOvr + Math.floor(Math.random() * spread * 2) - spread));
      const pas = Math.max(50, Math.min(85, targetOvr + Math.floor(Math.random() * spread * 2) - spread));
      const rating = Math.round((atk + def + pas) / 3);

      const positions = ["GK", "CB", "CM", "ST"];
      const nations = ["VIE", "THA", "MAS", "SIN", "IDN", "PHI"];
      const regions = ["ASIA"];
      const series = ["Futsal"];

      result = await prisma.$transaction(async (tx) => {
        const newCard = await tx.card.create({
          data: {
            name: randomName,
            nation: nations[Math.floor(Math.random() * nations.length)],
            position: positions[Math.floor(Math.random() * positions.length)],
            rating,
            atk,
            def,
            pas,
            imp,
            series: series[0],
            region: regions[0],
            ownerId: session.userId,
            listedPrice: null,
            stock: 1,
            isBought: true,
            isFromShop: false,
            avatarTextColor: "#FFFFFF",
            avatarColorMode: 1,
            avatarColor1: "#8b6914",
            avatarColor2: "#8b6914",
            avatarColor3: "#8b6914",
          },
        });

        await tx.dailyReward.create({
          data: { userId: session.userId, dateKey, rewardType: "card", rewardValue: rating },
        });

        return { type: "card", card: newCard, value: rating };
      });
    } else {
      // Coin reward: 10-20
      const coinAmount = Math.floor(Math.random() * 11) + 10;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: session.userId },
          data: { balance: { increment: coinAmount } },
        }),
        prisma.dailyReward.create({
          data: { userId: session.userId, dateKey, rewardType: "coin", rewardValue: coinAmount },
        }),
      ]);

      result = { type: "coin", value: coinAmount };
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { balance: true },
    });

    return NextResponse.json({
      ok: true,
      reward: result,
      balance: updatedUser?.balance ?? 0,
    });
  } catch (e) {
    console.error("daily-reward POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}