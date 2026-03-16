import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BOT_SECRET =
  process.env.HAX_BOT_SECRET?.trim() || "star-hax-bot-secret-2026";
const K = 32;
// Thắng Elo cá nhân: +10 COIN, thua +5 COIN (không có hoà)
const COIN_WIN = 10;
const COIN_LOSE = 5;

function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/* ---------- types cho payload từ bot ---------- */
interface BotPlayer {
  auth: string;
  name: string;
  team: number; // 1 = red, 2 = blue
  goals: number;
  assists: number;
  ownGoals: number;
  passes: number;
  shotsOnTarget: number;
  stoppedShots: number;
  touches: number;
  loggedIn: boolean;
  [k: string]: unknown;
}

interface BotPayload {
  room?: string;
  mode?: string;
  stadium?: string;
  score?: { red?: number; blue?: number; final?: string; penalty?: unknown };
  time?: number;
  timeLimit?: number;
  scoreLimit?: number;
  winnerTeamId: number; // 1 = red, 2 = blue
  motm?: { auth: string; name: string | null };
  winningStreak?: number;
  endedAt?: string;
  players: BotPlayer[];
  /* fallback cho format cũ */
  winners?: string[];
  losers?: string[];
  scoreWin?: number;
  scoreLose?: number;
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-hax-secret");
    if (secret !== BOT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body: BotPayload = await req.json();

    /* ---------- Parse winners / losers từ payload bot ---------- */
    let winnerAuths: string[];
    let loserAuths: string[];
    let redScore: number;
    let blueScore: number;
    let duration: number;
    let roomId: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let playersJson: any;

    if (body.players?.length && body.winnerTeamId) {
      // ---- Format MỚI từ bot (players + winnerTeamId) ----
      const winnerTeam = body.winnerTeamId; // 1=red, 2=blue
      // Lấy auth của TẤT CẢ người chơi (không cần loggedIn web)
      winnerAuths = body.players
        .filter((p) => p.team === winnerTeam)
        .map((p) => p.auth);
      loserAuths = body.players
        .filter((p) => p.team !== winnerTeam)
        .map((p) => p.auth);

      redScore = body.score?.red ?? 0;
      blueScore = body.score?.blue ?? 0;
      duration = Math.round(body.time ?? 0);
      roomId = body.room ?? null;

      // Lưu toàn bộ payload gốc vào JSON để dùng sau
      playersJson = {
        winnerTeamId: winnerTeam,
        motm: body.motm ?? null,
        stadium: body.stadium ?? null,
        mode: body.mode ?? null,
        winningStreak: body.winningStreak ?? 0,
        endedAt: body.endedAt ?? null,
        penalty: body.score?.penalty ?? null,
        players: body.players.map((p) => ({
          auth: p.auth,
          name: p.name,
          team: p.team,
          goals: p.goals,
          assists: p.assists,
          ownGoals: p.ownGoals,
          passes: p.passes,
          shotsOnTarget: p.shotsOnTarget,
          stoppedShots: p.stoppedShots,
          touches: p.touches,
          loggedIn: p.loggedIn,
        })),
      };
    } else if (body.winners?.length && body.losers?.length) {
      // ---- Format CŨ (winners/losers arrays) – giữ tương thích ----
      winnerAuths = body.winners;
      loserAuths = body.losers;
      redScore = body.scoreWin ?? 0;
      blueScore = body.scoreLose ?? 0;
      duration = 0;
      roomId = null;
      playersJson = { winners: body.winners, losers: body.losers };
    } else {
      return NextResponse.json(
        { error: "Thiếu players/winnerTeamId hoặc winners/losers" },
        { status: 400 }
      );
    }

    // Deduplicate auths to tránh 1 người bị tính ELO/COIN nhiều lần trong cùng một trận
    winnerAuths = Array.from(new Set(winnerAuths.filter(Boolean)));
    const winnerSet = new Set(winnerAuths);
    loserAuths = Array.from(
      new Set(
        loserAuths.filter((auth) => auth && !winnerSet.has(auth))
      )
    );

    /* ---------- Lookup users ---------- */
    const winnerUsers = await prisma.user.findMany({
      where: { haxAuth: { in: winnerAuths } },
    });
    const loserUsers = await prisma.user.findMany({
      where: { haxAuth: { in: loserAuths } },
    });

    /* ---------- ELO calculation ---------- */
    const avgWinElo = winnerUsers.length
      ? winnerUsers.reduce((s, u) => s + u.elo, 0) / winnerUsers.length
      : 1000;
    const avgLoseElo = loserUsers.length
      ? loserUsers.reduce((s, u) => s + u.elo, 0) / loserUsers.length
      : 1000;

    const eWin = expectedScore(avgWinElo, avgLoseElo);
    const eloChange = Math.round(K * (1 - eWin));

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const winnerCoinMap = new Map<number, number>();

    await prisma.$transaction(async (tx) => {
      // Cập nhật ELO + COIN cho người thắng: luôn +10 COIN mỗi trận thắng (không giới hạn số trận/ngày)
      for (const u of winnerUsers) {
        const coinGain = COIN_WIN;
        winnerCoinMap.set(u.id, coinGain);

        await tx.user.update({
          where: { id: u.id },
          data: {
            elo: u.elo + eloChange,
            balance: u.balance + coinGain,
          },
        });
      }

      // Cập nhật ELO + COIN cho người thua (không giới hạn, vẫn +2 COIN)
      for (const u of loserUsers) {
        await tx.user.update({
          where: { id: u.id },
          data: {
            // ELO không bao giờ tụt dưới 400 để tránh về 0
            elo: Math.max(400, u.elo - eloChange),
            balance: u.balance + COIN_LOSE,
          },
        });
      }

      // Lưu kết quả trận
      await tx.matchResult.create({
        data: {
          redScore,
          blueScore,
          duration,
          roomId,
          players: playersJson,
        },
      });

      // Auto-increment games (and wins/goals/assists) in HaxPlayerStat cho tất cả player
      const allAuths = [...winnerAuths, ...loserAuths];

      for (const auth of allAuths) {
        const isWinner = winnerAuths.includes(auth);
        const botPlayer = body.players?.find((p) => p.auth === auth);
        const goals = botPlayer?.goals ?? 0;
        const assists = botPlayer?.assists ?? 0;

        await tx.haxPlayerStat.upsert({
          where: { auth_monthKey: { auth, monthKey } },
          create: {
            auth,
            monthKey,
            games: 1,
            wins: isWinner ? 1 : 0,
            goals,
            assists,
          },
          update: {
            games: { increment: 1 },
            wins: isWinner ? { increment: 1 } : undefined,
            goals: goals > 0 ? { increment: goals } : undefined,
            assists: assists > 0 ? { increment: assists } : undefined,
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      eloChange,
      winners: winnerUsers.map((u) => ({
        username: u.username,
        elo: u.elo + eloChange,
        coins: `+${winnerCoinMap.get(u.id) ?? 0}`,
      })),
      losers: loserUsers.map((u) => ({
        username: u.username,
        elo: Math.max(400, u.elo - eloChange),
        coins: `+${COIN_LOSE}`,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}