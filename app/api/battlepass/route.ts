import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MAX_LEVEL = 30;
const WINDOW_DAYS = 30;
// Ngày reset Battle Pass: chỉ tính trận từ sau mốc này.
// Nếu muốn đổi ngày reset, chỉ cần sửa lại giá trị dưới đây.
const RESET_DATE = new Date("2026-03-02T00:00:00Z");

// Cấu hình mốc Battle Pass 30 ngày
// Các level: 1-3-5-7-10-15-20-25-30
const BATTLEPASS_LEVELS = [
  { level: 1,  type: "coin",        reward: 20,         label: "20 COIN" },
  { level: 3,  type: "pack_silver", reward: null,       label: "Gói Silver Pack" },
  { level: 5,  type: "card_70",     reward: null,       label: "1 thẻ random OVR 70+" },
  { level: 7,  type: "coin",        reward: 300,        label: "300 COIN" },
  { level: 10, type: "pack_gold",   reward: null,       label: "Gói Gold Pack" },
  { level: 15, type: "card_80",     reward: null,       label: "1 thẻ random OVR 80+" },
  { level: 20, type: "pack_ruby",   reward: null,       label: "Gói Ruby Pack" },
  { level: 25, type: "coin",        reward: 500,        label: "500 COIN" },
  { level: 30, type: "card_season", reward: null,       label: "Thẻ đặc biệt season" },
] as const;

// Map level -> số trận cần
const LEVEL_MATCHES: { level: number; matches: number }[] = [
  { level: 1, matches: 1 },
  { level: 3, matches: 10 },
  { level: 5, matches: 50 },
  { level: 7, matches: 80 },
  { level: 10, matches: 100 },
  { level: 15, matches: 130 },
  { level: 20, matches: 150 },
  { level: 25, matches: 180 },
  { level: 30, matches: 200 },
];

function levelFromMatches(matches: number): number {
  let lvl = 0;
  for (const cfg of LEVEL_MATCHES) {
    if (matches >= cfg.matches) lvl = cfg.level;
  }
  return lvl;
}

function getWindowStart() {
  const d = new Date();
  d.setDate(d.getDate() - WINDOW_DAYS);
  // Chỉ tính trận từ sau ngày RESET_DATE,
  // nên lấy mốc lớn hơn giữa (today - 30 ngày) và RESET_DATE.
  return d < RESET_DATE ? RESET_DATE : d;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const windowStart = getWindowStart();

    // Đếm số trận haxball trong 30 ngày gần nhất (roomId không phải lineup_battle)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { haxAuth: true },
    });
    
    let matches = 0;
    if (user?.haxAuth) {
      // Đếm số trận haxball mà user đã chơi (thông qua MatchResult với players JSON chứa auth của user)
      const allMatches = await prisma.matchResult.findMany({
        where: {
          createdAt: { gte: windowStart },
          roomId: { not: null }, // Không phải lineup battle
        },
        select: { players: true },
      });
      
      // Đếm số trận mà user có haxAuth trong players
      matches = allMatches.filter(m => {
        const players = m.players as any;
        if (players?.players && Array.isArray(players.players)) {
          return players.players.some((p: any) => p.auth === user.haxAuth);
        }
        return false;
      }).length;
    }

    // Tính level dựa trên số trận đã đá
    const level = levelFromMatches(matches);
    const daysLeft = WINDOW_DAYS;

    // Đọc các mốc đã nhận thưởng
    const claims = await prisma.battlePassClaim.findMany({
      where: { userId: session.userId },
    });
    const claimedLevels = new Set(claims.map(c => c.level));

    const milestones = BATTLEPASS_LEVELS.map((m) => ({
      level: m.level,
      type: m.type,
      label: m.label,
      unlocked: level >= m.level,
      claimed: claimedLevels.has(m.level),
    }));

    return NextResponse.json({
      level,
      matches,
      daysLeft,
      milestones,
    });
  } catch (e) {
    console.error("battlepass GET error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const body = await req.json();
    const level = Number(body.level);
    if (!level || !Number.isInteger(level)) {
      return NextResponse.json({ error: "Level không hợp lệ" }, { status: 400 });
    }

    const config = BATTLEPASS_LEVELS.find(m => m.level === level);
    if (!config) {
      return NextResponse.json({ error: "Level này không có thưởng Battle Pass" }, { status: 400 });
    }

    const windowStart = getWindowStart();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { haxAuth: true },
    });
    
    let matches = 0;
    if (user?.haxAuth) {
      const allMatches = await prisma.matchResult.findMany({
        where: {
          createdAt: { gte: windowStart },
          roomId: { not: null },
        },
        select: { players: true },
      });
      
      matches = allMatches.filter(m => {
        const players = m.players as any;
        if (players?.players && Array.isArray(players.players)) {
          return players.players.some((p: any) => p.auth === user.haxAuth);
        }
        return false;
      }).length;
    }
    // Tính level dựa trên số trận đã đá (giống logic GET)
    const currentLevel = levelFromMatches(matches);
    if (currentLevel < level) {
      return NextResponse.json({ error: "Chưa đủ trận để nhận mốc này" }, { status: 400 });
    }

    // Kiểm tra đã claim chưa
    const existed = await prisma.battlePassClaim.findUnique({
      where: {
        userId_level: {
          userId: session.userId,
          level,
        },
      },
    });
    if (existed) {
      return NextResponse.json({ error: "Bạn đã nhận mốc này rồi" }, { status: 400 });
    }

    // Trao thưởng + lưu claim trong 1 transaction
    const result = await prisma.$transaction(async (tx) => {
      // Lưu claim
      await tx.battlePassClaim.create({
        data: {
          userId: session.userId,
          level,
        },
      });

      const user = await tx.user.findUnique({ where: { id: session.userId } });
      if (!user) throw new Error("User not found");

      let reward: any = { type: config.type };

      // Trao thưởng theo từng loại
      if (config.type === "coin" && typeof config.reward === "number") {
        // Mốc COIN: cộng trực tiếp vào balance
        await tx.user.update({
          where: { id: session.userId },
          data: { balance: { increment: config.reward } },
        });
        reward = { type: "coin", amount: config.reward };
      } else if (config.type === "pack_silver") {
        // Level 3: Silver Pack free (tăng chỉ số)
        const card = await tx.card.findFirst({
          where: { ownerId: session.userId },
          orderBy: { rating: "desc" },
        });
        if (card) {
          const STAT_KEYS: ("atk" | "def" | "pas")[] = ["atk", "def", "pas"];
          const shuffled = [...STAT_KEYS].sort(() => Math.random() - 0.5);
          const chosen = shuffled.slice(0, 1); // Silver: 1 stat
          const deltaStats: Record<string, number> = {};
          for (const stat of chosen) {
            deltaStats[stat] = 1; // minGain = maxGain = 1
          }
          const before = { atk: card.atk, def: card.def, pas: card.pas, rating: card.rating };
          const updates: Record<string, number> = {};
          for (const [k, v] of Object.entries(deltaStats)) {
            updates[k] = Math.min(99, (card[k as keyof typeof card] as number) + v);
          }
          const newAtk = updates.atk ?? card.atk;
          const newDef = updates.def ?? card.def;
          const newPas = updates.pas ?? card.pas;
          const avgRating = Math.round((newAtk + newDef + newPas) / 3);
          const newRating = Math.max(card.rating, avgRating);
          const updated = await tx.card.update({
            where: { id: card.id },
            data: { ...updates, rating: newRating },
          });
          reward = {
            type: "pack_silver",
            card: updated,
            cardId: updated.id,
            cardName: updated.name,
            before,
            after: { atk: newAtk, def: newDef, pas: newPas, rating: newRating },
            deltaStats,
          };
        }
      } else if (config.type === "pack_gold") {
        // Level 10: Gold Pack free
        const card = await tx.card.findFirst({
          where: { ownerId: session.userId },
          orderBy: { rating: "desc" },
        });
        if (card) {
          const STAT_KEYS: ("atk" | "def" | "pas")[] = ["atk", "def", "pas"];
          const shuffled = [...STAT_KEYS].sort(() => Math.random() - 0.5);
          const chosen = shuffled.slice(0, 2); // Gold: 2 stats
          const deltaStats: Record<string, number> = {};
          for (const stat of chosen) {
            deltaStats[stat] = Math.floor(Math.random() * 2) + 1; // 1-2
          }
          const before = { atk: card.atk, def: card.def, pas: card.pas, rating: card.rating };
          const updates: Record<string, number> = {};
          for (const [k, v] of Object.entries(deltaStats)) {
            updates[k] = Math.min(99, (card[k as keyof typeof card] as number) + v);
          }
          const newAtk = updates.atk ?? card.atk;
          const newDef = updates.def ?? card.def;
          const newPas = updates.pas ?? card.pas;
          const avgRating = Math.round((newAtk + newDef + newPas) / 3);
          const newRating = Math.max(card.rating, avgRating);
          const updated = await tx.card.update({
            where: { id: card.id },
            data: { ...updates, rating: newRating },
          });
          reward = {
            type: "pack_gold",
            card: updated,
            cardId: updated.id,
            cardName: updated.name,
            before,
            after: { atk: newAtk, def: newDef, pas: newPas, rating: newRating },
            deltaStats,
          };
        }
      } else if (config.type === "pack_ruby") {
        // Level 20: Ruby Pack free (tương đương red pack: 3 stats, 2-3 gain)
        const card = await tx.card.findFirst({
          where: { ownerId: session.userId },
          orderBy: { rating: "desc" },
        });
        if (card) {
          const STAT_KEYS: ("atk" | "def" | "pas")[] = ["atk", "def", "pas"];
          const shuffled = [...STAT_KEYS].sort(() => Math.random() - 0.5);
          const chosen = shuffled.slice(0, 3); // Ruby/Red: 3 stats
          const deltaStats: Record<string, number> = {};
          for (const stat of chosen) {
            deltaStats[stat] = Math.floor(Math.random() * 2) + 2; // 2-3
          }
          const before = { atk: card.atk, def: card.def, pas: card.pas, rating: card.rating };
          const updates: Record<string, number> = {};
          for (const [k, v] of Object.entries(deltaStats)) {
            updates[k] = Math.min(99, (card[k as keyof typeof card] as number) + v);
          }
          const newAtk = updates.atk ?? card.atk;
          const newDef = updates.def ?? card.def;
          const newPas = updates.pas ?? card.pas;
          const avgRating = Math.round((newAtk + newDef + newPas) / 3);
          const newRating = Math.max(card.rating, avgRating);
          const updated = await tx.card.update({
            where: { id: card.id },
            data: { ...updates, rating: newRating },
          });
          reward = {
            type: "pack_ruby",
            card: updated,
            cardId: updated.id,
            cardName: updated.name,
            before,
            after: { atk: newAtk, def: newDef, pas: newPas, rating: newRating },
            deltaStats,
          };
        }
      } else if (config.type === "card_70") {
        // Level 5: Card random OVR 70+
        const adminPool = await tx.card.findMany({
          where: {
            listedPrice: { not: null },
            stock: { gt: 0 },
            owner: { role: "admin" },
          },
        });
        if (adminPool.length > 0) {
          const templateCard = adminPool[Math.floor(Math.random() * adminPool.length)];
          const users = await tx.user.findMany({
            where: { role: "user" },
            select: { username: true, discordGlobalName: true, discordUsername: true, elo: true },
          });
          let randomName = templateCard.name;
          let cardOwnerElo = user.elo;
          if (users.length > 0) {
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
            cardOwnerElo = selectedUser.elo ?? user.elo;
          }
          // Tạo card với OVR 70+
          const rating = Math.max(70, Math.min(85, 70 + Math.floor(Math.random() * 16))); // 70-85
          const spread = 5;
          const randStat = () => {
            const raw = rating + Math.floor(Math.random() * (spread * 2 + 1)) - spread;
            return Math.min(99, Math.max(30, raw));
          };
          const atk = randStat();
          const def = randStat();
          const pas = randStat();
          const imp = Math.min(90, Math.max(40, Math.round(50 + (cardOwnerElo - 1000) / 20)));
          const created = await tx.card.create({
            data: {
              name: randomName,
              nation: templateCard.nation,
              position: templateCard.position,
              rating,
              atk,
              def,
              pas,
              imp,
              series: templateCard.series,
              region: templateCard.region,
              effect: null,
              avatarText: templateCard.avatarText,
              avatarTextColor: templateCard.avatarTextColor,
              avatarColorMode: templateCard.avatarColorMode,
              avatarColor1: templateCard.avatarColor1,
              avatarColor2: templateCard.avatarColor2,
              avatarColor3: templateCard.avatarColor3,
              ownerId: session.userId,
              listedPrice: null,
              stock: 1,
              isBought: true,
              isFromShop: false,
            },
          });
          reward = {
            type: "card_70",
            card: created,
            cardId: created.id,
            cardName: created.name,
            rating: created.rating,
          };
        }
      } else if (config.type === "card_80") {
        // Level 15: Card random OVR 80+
        const adminPool = await tx.card.findMany({
          where: {
            listedPrice: { not: null },
            stock: { gt: 0 },
            owner: { role: "admin" },
          },
        });
        if (adminPool.length > 0) {
          const templateCard = adminPool[Math.floor(Math.random() * adminPool.length)];
          const users = await tx.user.findMany({
            where: { role: "user" },
            select: { username: true, discordGlobalName: true, discordUsername: true, elo: true },
          });
          let randomName = templateCard.name;
          let cardOwnerElo = user.elo;
          if (users.length > 0) {
            const sortedUsers = [...users].sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000));
            const top10Elo = sortedUsers.slice(0, Math.min(10, sortedUsers.length)).map(u => u.elo ?? 1000);
            const top10Set = new Set(top10Elo);
            const weights = users.map((u) => {
              const elo = u.elo ?? 1000;
              return top10Set.has(elo) ? 0.1 : 1.0;
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
            cardOwnerElo = selectedUser.elo ?? user.elo;
          }
          // Tạo card với OVR 80+
          const rating = Math.max(80, Math.min(92, 80 + Math.floor(Math.random() * 13))); // 80-92
          const spread = 4;
          const randStat = () => {
            const raw = rating + Math.floor(Math.random() * (spread * 2 + 1)) - spread;
            return Math.min(99, Math.max(50, raw));
          };
          const atk = randStat();
          const def = randStat();
          const pas = randStat();
          const imp = Math.min(95, Math.max(50, Math.round(50 + (cardOwnerElo - 1000) / 15)));
          const created = await tx.card.create({
            data: {
              name: randomName,
              nation: templateCard.nation,
              position: templateCard.position,
              rating,
              atk,
              def,
              pas,
              imp,
              series: templateCard.series,
              region: templateCard.region,
              effect: null,
              avatarText: templateCard.avatarText,
              avatarTextColor: templateCard.avatarTextColor,
              avatarColorMode: templateCard.avatarColorMode,
              avatarColor1: templateCard.avatarColor1,
              avatarColor2: templateCard.avatarColor2,
              avatarColor3: templateCard.avatarColor3,
              ownerId: session.userId,
              listedPrice: null,
              stock: 1,
              isBought: true,
              isFromShop: false,
            },
          });
          reward = {
            type: "card_80",
            card: created,
            cardId: created.id,
            cardName: created.name,
            rating: created.rating,
          };
        }
      } else if (config.type === "card_season") {
        // Level 30: Card đặc biệt từ admin list
        const adminPool = await tx.card.findMany({
          where: {
            listedPrice: { not: null },
            stock: { gt: 0 },
            owner: { role: "admin" },
          },
        });
        if (adminPool.length > 0) {
          // Weight theo rating để thẻ cao càng hiếm
          const weights = adminPool.map((c) => {
            const diff = Math.max(1, 100 - c.rating);
            return diff * diff;
          });
          const totalW = weights.reduce((s, w) => s + w, 0);
          let roll = Math.random() * totalW;
          let picked = adminPool[adminPool.length - 1];
          for (let i = 0; i < adminPool.length; i++) {
            roll -= weights[i];
            if (roll <= 0) {
              picked = adminPool[i];
              break;
            }
          }
          const newCard = await tx.card.create({
            data: {
              name: picked.name,
              nation: picked.nation,
              position: picked.position,
              rating: picked.rating,
              atk: picked.atk,
              def: picked.def,
              pas: picked.pas,
              imp: picked.imp,
              series: picked.series,
              region: picked.region,
              effect: picked.effect,
              avatarText: picked.avatarText,
              avatarTextColor: picked.avatarTextColor,
              avatarColorMode: picked.avatarColorMode,
              avatarColor1: picked.avatarColor1,
              avatarColor2: picked.avatarColor2,
              avatarColor3: picked.avatarColor3,
              ownerId: session.userId,
              listedPrice: null,
              stock: 1,
              isBought: true,
              isFromShop: true,
            },
          });
          const newStock = picked.stock - 1;
          await tx.card.update({
            where: { id: picked.id },
            data: { stock: Math.max(0, newStock) },
          });
          // Thông báo cho admin (chủ thẻ) khi thẻ season trong shop bị trừ stock do Battle Pass
          const userName = user.discordGlobalName || user.discordUsername || user.username;
          await tx.notification.create({
            data: {
              userId: picked.ownerId,
              type: "card_sold",
              title: "Thẻ season trong shop được nhận qua Battle Pass",
              message: `${userName} đã nhận thẻ ${picked.name} (OVR ${picked.rating}) từ Battle Pass. Stock còn lại: ${Math.max(0, newStock)}.`,
              data: { cardId: picked.id, buyerId: session.userId, from: "battlepass", rating: picked.rating },
            },
          });
          reward = {
            type: "card_season",
            card: newCard,
            cardId: newCard.id,
            cardName: newCard.name,
            rating: newCard.rating,
          };
        }
      }

      return { ok: true, reward };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("battlepass POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
