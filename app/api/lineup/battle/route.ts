import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/* ======== Match Simulation Engine ======== */

interface SimCard {
  name: string;
  position: string;
  rating: number;
  atk: number;
  def: number;
  pas: number;
  imp: number;
}

interface SimTeam {
  userId: number;
  username: string;
  cards: SimCard[];
  avgAtk: number;
  avgDef: number;
  avgPas: number;
  avgImp: number;
  avgOvr: number;
  // Team power components
  weightedOvr: number;
  synergyBonus: number;
  compPenalty: number;
  formBonus: number;
  lossStreak: number;
}

interface MatchEvent {
  minute: number;
  type: "attack" | "goal" | "save" | "miss" | "pass" | "counter" | "halftime" | "kickoff" | "end";
  team: "home" | "away";
  player?: string;
  text: string;
}

function getPositionWeight(pos: string): number {
  switch (pos) {
    case "ST":
      return 1.2;
    case "CM":
      return 1.1;
    case "GK":
      return 1.15;
    case "CB":
      return 1.0;
    default:
      return 1.0;
  }
}

// Synergy: 0 → 3 điểm dựa trên việc đội có đủ khung GK–CB–CM–ST
function calculateSynergy(cards: SimCard[]): number {
  const posCount: Record<string, number> = {};
  for (const c of cards) {
    posCount[c.position] = (posCount[c.position] ?? 0) + 1;
  }
  let synergy = 0;
  if (posCount["GK"] >= 1) synergy += 1;
  if (posCount["CB"] >= 1) synergy += 1;
  if (posCount["CM"] >= 1) synergy += 0.5;
  if (posCount["ST"] >= 1) synergy += 0.5;
  return Math.min(synergy, 3);
}

// Đội build lệch (ví dụ 3 ST, không có GK/CB) bị trừ 2–4 điểm
function calculateCompositionPenalty(cards: SimCard[]): number {
  const posCount: Record<string, number> = {};
  for (const c of cards) {
    posCount[c.position] = (posCount[c.position] ?? 0) + 1;
  }

  let penalty = 0;
  const st = posCount["ST"] ?? 0;
  const gk = posCount["GK"] ?? 0;
  const cb = posCount["CB"] ?? 0;

  if (st >= 3) {
    penalty += 2 + Math.min(st - 3, 2); // 3 ST = -2, 4+ ST = -3/-4
  }
  if (gk === 0) penalty += 1.5;
  if (cb === 0) penalty += 1.5;

  return Math.min(penalty, 4);
}

function buildTeam(
  userId: number,
  username: string,
  cards: SimCard[],
  formBonus = 0,
  lossStreak = 0
): SimTeam {
  const n = cards.length;
  const totalWeight = cards.reduce((s, c) => s + getPositionWeight(c.position), 0) || 1;
  const weightedOvr =
    cards.reduce((s, c) => s + c.rating * getPositionWeight(c.position), 0) / totalWeight;
  const synergyBonus = calculateSynergy(cards);
  const compPenalty = calculateCompositionPenalty(cards);

  return {
    userId,
    username,
    cards,
    avgAtk: Math.round(cards.reduce((s, c) => s + c.atk, 0) / n),
    avgDef: Math.round(cards.reduce((s, c) => s + c.def, 0) / n),
    avgPas: Math.round(cards.reduce((s, c) => s + c.pas, 0) / n),
    avgImp: Math.round(cards.reduce((s, c) => s + c.imp, 0) / n),
    avgOvr: Math.round(cards.reduce((s, c) => s + c.rating, 0) / n),
    weightedOvr: Math.round(weightedOvr),
    synergyBonus,
    compPenalty,
    formBonus,
    lossStreak,
  };
}

function simulate(home: SimTeam, away: SimTeam): { events: MatchEvent[]; homeScore: number; awayScore: number } {
  // --- TÍNH TEAM POWER THEO CÔNG THỨC MỚI (bao gồm cả IMP) ---
  // IMP bonus: mỗi điểm IMP trên 50 → +0.1 power (tối đa +5 từ IMP)
  const impBonusHome = Math.min(5, (home.avgImp - 50) * 0.1);
  const impBonusAway = Math.min(5, (away.avgImp - 50) * 0.1);
  
  const baseHomePower = home.weightedOvr + home.synergyBonus + home.formBonus - home.compPenalty + impBonusHome;
  const baseAwayPower = away.weightedOvr + away.synergyBonus + away.formBonus - away.compPenalty + impBonusAway;

  let homePower = baseHomePower;
  let awayPower = baseAwayPower;

  // Underdog boost: đội yếu thua 2 trận liên tiếp, diff < 15 → +3 power tạm thời
  let diff = homePower - awayPower;
  const absBaseDiff = Math.abs(diff);
  if (absBaseDiff < 15) {
    if (diff > 0 && away.lossStreak >= 2) {
      awayPower += 3;
    } else if (diff < 0 && home.lossStreak >= 2) {
      homePower += 3;
    }
  }

  diff = homePower - awayPower;
  
  // QUAN TRỌNG: Kiểm tra chênh lệch OVR thô (avgOvr)
  const ovrDiff = home.avgOvr - away.avgOvr;
  const absOvrDiff = Math.abs(ovrDiff);
  
  // Nếu chênh lệch OVR > 10: đội mạnh hơn PHẢI thắng (không được thua)
  let forceWin: "home" | "away" | null = null;
  if (absOvrDiff > 10) {
    // Đội OVR cao hơn phải thắng (không phụ thuộc IMP)
    forceWin = ovrDiff > 0 ? "home" : "away";
    
    // OVR cao hơn > 10 → thắng chắc chắn (95% thắng, 5% hòa)
    const roll = Math.random();
    let result: "home" | "away" | "draw";
    if (forceWin === "home") {
      result = roll < 0.95 ? "home" : "draw"; // 95% thắng, 5% hòa
    } else {
      result = roll < 0.95 ? "away" : "draw";
}

    // Generate score và events cho trường hợp force win
    let homeScore = 0;
    let awayScore = 0;
    
    if (result === "draw") {
      const options: Array<[number, number]> = [[0, 0], [1, 1], [2, 2]];
      const weights = [0.3, 0.5, 0.2];
      const r2 = Math.random();
      let acc = 0;
      let idx = 0;
      for (let i = 0; i < options.length; i++) {
        acc += weights[i];
        if (r2 <= acc) {
          idx = i;
          break;
}
      }
      homeScore = options[idx][0];
      awayScore = options[idx][1];
    } else {
      // Thắng với cách biệt hợp lý (OVR cao hơn > 10 nên cách biệt 1-3 bàn)
      const goalDiff = 1 + Math.floor(Math.random() * 3); // 1-3 bàn
      const winnerGoals = 2 + Math.floor(Math.random() * 2); // 2-3 bàn
      const loserGoals = Math.max(0, winnerGoals - goalDiff);
      if (result === "home") {
        homeScore = winnerGoals;
        awayScore = loserGoals;
      } else {
        awayScore = winnerGoals;
        homeScore = loserGoals;
      }
    }
    
    // Generate events đầy đủ cho trường hợp force win
  const events: MatchEvent[] = [];
      events.push({ minute: 0, type: "kickoff", team: "home", text: "Trận đấu bắt đầu!" });

      const totalGoals = homeScore + awayScore;
      const goalMinutes = Array.from({ length: totalGoals }, () =>
        5 + Math.floor(Math.random() * 80)
      ).sort((a, b) => a - b);

      let curHome = 0;
      let curAway = 0;
      let goalIndex = 0;

      const pickScorer = (team: SimTeam): string => {
        const prio = team.cards.filter((c) => c.position === "ST" || c.position === "CM");
        const picked = prio[Math.floor(Math.random() * prio.length)] ?? team.cards[0];
        return picked?.name ?? "Cầu thủ";
      };

      const pickOutfield = (team: SimTeam): string => {
        const prio = team.cards.filter((c) => c.position !== "GK");
        const picked = prio[Math.floor(Math.random() * prio.length)] ?? team.cards[0];
        return picked?.name ?? "Cầu thủ";
      };

      const pickGK = (team: SimTeam): string => {
        const gk = team.cards.find((c) => c.position === "GK") ?? team.cards[0];
        return gk?.name ?? "Thủ môn";
      };

      const addActionEvent = (minute: number, side: "home" | "away") => {
        const team = side === "home" ? home : away;
        const opponent = side === "home" ? away : home;
        const player = pickOutfield(team);
        const opponentPlayer = pickOutfield(opponent);
        const gkName = pickGK(opponent);

        const r = Math.random();
        if (r < 0.25) {
          events.push({
            minute,
            type: "pass",
            team: side,
            player,
            text: `${player} ban bật nhịp nhàng với đồng đội, giữ bóng rất tự tin.`,
          });
        } else if (r < 0.5) {
          events.push({
            minute,
            type: "attack",
            team: side,
            player,
            text: `${player} bứt tốc xâm nhập trung lộ, tạo sóng gió trước khung thành.`,
          });
        } else if (r < 0.7) {
          events.push({
            minute,
            type: "counter",
            team: side,
            player,
            text: `${player} dẫn đầu pha phản công nhanh sau khi cắt bóng từ ${opponentPlayer}.`,
          });
        } else if (r < 0.85) {
          events.push({
            minute,
            type: "save",
            team: side === "home" ? "away" : "home",
            player: gkName,
            text: `${gkName} bay người cản phá cú dứt điểm hiểm hóc!`,
          });
        } else {
          events.push({
            minute,
            type: "miss",
            team: side,
            player,
            text: `${player} dứt điểm nhưng bóng đi chệch cột dọc trong gang tấc.`,
          });
        }
      };

      // Thêm các tình huống diễn biến
      const usedMinutes = new Set<number>(goalMinutes);
      const extraActionCount = 14 + Math.floor(Math.random() * 8);
      const actionMinutes: number[] = [];
      while (actionMinutes.length < extraActionCount) {
        const m = 2 + Math.floor(Math.random() * 87);
        if (!usedMinutes.has(m)) {
          usedMinutes.add(m);
          actionMinutes.push(m);
        }
      }
      actionMinutes.sort((a, b) => a - b);

      // Đội mạnh (OVR cao) có ưu thế kiểm soát bóng
      const strongSide: "home" | "away" = forceWin === "home" ? "home" : "away";
      for (const m of actionMinutes) {
        const side: "home" | "away" = Math.random() < (strongSide === "home" ? 0.65 : 0.35) ? "home" : "away";
        addActionEvent(m, side);
      }

      // Thêm diễn biến dẫn tới từng bàn thắng
      for (const minute of goalMinutes) {
        const prepMinute = Math.max(1, minute - (1 + Math.floor(Math.random() * 3)));
        if (!usedMinutes.has(prepMinute) && prepMinute !== 45) {
          const side: "home" | "away" = Math.random() < 0.5 ? "home" : "away";
          addActionEvent(prepMinute, side);
          usedMinutes.add(prepMinute);
        }

        if (minute > 45 && !events.some((e) => e.type === "halftime")) {
          events.push({
            minute: 45,
            type: "halftime",
            team: "home",
            text: `Hiệp 1 kết thúc — ${curHome} : ${curAway}`,
          });
        }

        const isHomeGoal = goalIndex < homeScore;
        const teamSide: "home" | "away" = isHomeGoal ? "home" : "away";
        const team = teamSide === "home" ? home : away;
        const scorer = pickScorer(team);

        if (teamSide === "home") curHome++;
        else curAway++;

        events.push({
          minute,
          type: "goal",
          team: teamSide,
          player: scorer,
          text: `⚽ ${scorer} ghi bàn! ${curHome} : ${curAway}`,
        });

        goalIndex++;
      }

      if (!events.some((e) => e.type === "halftime")) {
        events.push({
          minute: 45,
          type: "halftime",
          team: "home",
          text: `Hiệp 1 kết thúc — ${homeScore} : ${awayScore}`,
        });
      }

      events.push({
        minute: 90,
        type: "end",
        team: "home",
        text: `Kết thúc! ${homeScore} - ${awayScore}`,
      });

      // Sort events by minute
      events.sort((a, b) => {
        if (a.minute !== b.minute) return a.minute - b.minute;
        const order = {
          kickoff: 0,
          pass: 1,
          counter: 1,
          attack: 2,
          miss: 3,
          save: 3,
          goal: 4,
          halftime: 5,
          end: 6,
        };
        return (order[a.type] ?? 0) - (order[b.type] ?? 0);
      });

    return { events, homeScore, awayScore };
  }

  // Thêm variance có kiểm soát (chỉ khi không force win)
  const variance = Math.random() * 10 - 5; // [-5, 5]
  const varianceScale = Math.max(1 - Math.abs(diff) / 30, 0.3);
  const finalDiff = diff + variance * varianceScale;
  const absDiff = Math.abs(finalDiff);

  // Sigmoid cho tỉ lệ thắng (trục diff / K), với K = 12
  const baseWin = 1 / (1 + Math.exp(-finalDiff / 12));

  // Giới hạn trần tỉ lệ thắng theo khoảng diff
  let maxStrong: number;
  if (absDiff < 5) maxStrong = 0.55;
  else if (absDiff < 10) maxStrong = 0.6;
  else if (absDiff < 20) maxStrong = 0.7;
  else maxStrong = 0.75;

  const strongTeam: "home" | "away" = finalDiff >= 0 ? "home" : "away";
  const weakTeam: "home" | "away" = strongTeam === "home" ? "away" : "home";

  let pHomeNonDraw = baseWin;
  let pAwayNonDraw = 1 - baseWin;

  const minStrong = 1 - maxStrong;

  if (strongTeam === "home") {
    pHomeNonDraw = Math.min(Math.max(pHomeNonDraw, minStrong), maxStrong);
    pAwayNonDraw = 1 - pHomeNonDraw;
  } else {
    pAwayNonDraw = Math.min(Math.max(pAwayNonDraw, minStrong), maxStrong);
    pHomeNonDraw = 1 - pAwayNonDraw;
  }

  // Thêm hoà: chênh nhỏ hoà nhiều hơn
  let pDraw = absDiff < 5 ? 0.22 : absDiff < 15 ? 0.18 : 0.12;
  const scale = 1 - pDraw;
  let pHome = pHomeNonDraw * scale;
  let pAway = pAwayNonDraw * scale;

  // Đảm bảo không bên nào vượt 80% tổng thể
  const clampProb = (p: number) => Math.max(0.2, Math.min(0.8, p));
  pHome = clampProb(pHome);
  pAway = clampProb(pAway);
  const sum = pHome + pAway + pDraw;
  pHome /= sum;
  pAway /= sum;
  pDraw /= sum;

  // Chọn kết quả trận
  const roll = Math.random();
  let result: "home" | "away" | "draw";
  if (roll < pHome) result = "home";
  else if (roll < pHome + pAway) result = "away";
  else result = "draw";
  
  // KIỂM TRA LẠI: Đảm bảo đội OVR cao + IMP cao không thể thua đội OVR thấp
  if (absOvrDiff > 5) {
    const strongOvrTeam = ovrDiff > 0 ? home : away;
    const weakOvrTeam = ovrDiff > 0 ? away : home;
    const strongOvrWon = (ovrDiff > 0 && result === "home") || (ovrDiff < 0 && result === "away");
    
    // Nếu đội OVR cao cũng có IMP cao hơn → không được thua
    if (strongOvrTeam.avgImp >= weakOvrTeam.avgImp && !strongOvrWon && result !== "draw") {
      // Force thắng cho đội OVR cao + IMP cao
      result = ovrDiff > 0 ? "home" : "away";
    }
  }

  // --- SINH TỈ SỐ HỢP LÝ ---
  let homeScore = 0;
  let awayScore = 0;

  const strongIsHome = strongTeam === "home";

  const setScoreForWin = (winner: "home" | "away") => {
    const isStrong = winner === strongTeam;
    const d = absDiff;

    // Chênh lệch goals dựa trên diff nhưng không out trình
    let maxGoalDiff = 1;
    if (d >= 5 && d < 10) maxGoalDiff = 2;
    else if (d >= 10 && d < 20) maxGoalDiff = 3;
    else if (d >= 20) maxGoalDiff = 4;

    // Ưu tiên cách biệt 1–2, rất hiếm 3–4
    const rand = Math.random();
    let goalDiff = 1;
    if (maxGoalDiff >= 2 && rand > 0.6) goalDiff = 2;
    if (maxGoalDiff >= 3 && rand > 0.9) goalDiff = 3;
    if (maxGoalDiff >= 4 && rand > 0.97) goalDiff = 4;

    // Tổng số bàn không quá cao
    let baseGoals = isStrong ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2); // 2–3 hoặc 1–2
    let strongGoals = Math.max(baseGoals, goalDiff + 1);
    let weakGoals = strongGoals - goalDiff;
    if (weakGoals < 0) {
      strongGoals += weakGoals;
      weakGoals = 0;
    }

    if (strongGoals + weakGoals > 7) {
      const extra = strongGoals + weakGoals - 7;
      strongGoals = Math.max(2, strongGoals - extra);
    }

    if (winner === "home") {
      homeScore = strongIsHome ? strongGoals : weakGoals;
      awayScore = strongIsHome ? weakGoals : strongGoals;
      } else {
      awayScore = strongIsHome ? strongGoals : weakGoals;
      homeScore = strongIsHome ? weakGoals : strongGoals;
    }
  };

  if (result === "draw") {
    const options: Array<[number, number]> = [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 3],
    ];
    const weights = [0.2, 0.45, 0.25, 0.1];
    const r2 = Math.random();
    let acc = 0;
    let idx = 0;
    for (let i = 0; i < options.length; i++) {
      acc += weights[i];
      if (r2 <= acc) {
        idx = i;
        break;
      }
    }
    homeScore = options[idx][0];
    awayScore = options[idx][1];
  } else {
    setScoreForWin(result);
  }

  // --- TẠO EVENT MATCH DỰA TRÊN TỈ SỐ ---
  const events: MatchEvent[] = [];
  events.push({ minute: 0, type: "kickoff", team: "home", text: "Trận đấu bắt đầu!" });

  const totalGoals = homeScore + awayScore;
  const goalMinutes = Array.from({ length: totalGoals }, () =>
    5 + Math.floor(Math.random() * 80)
  ).sort((a, b) => a - b);

  let curHome = 0;
  let curAway = 0;
  let goalIndex = 0;

  const pickScorer = (team: SimTeam): string => {
    const prio = team.cards.filter((c) => c.position === "ST" || c.position === "CM");
    const picked = prio[Math.floor(Math.random() * prio.length)] ?? team.cards[0];
    return picked?.name ?? "Cầu thủ";
  };

  const pickOutfield = (team: SimTeam): string => {
    const prio = team.cards.filter((c) => c.position !== "GK");
    const picked = prio[Math.floor(Math.random() * prio.length)] ?? team.cards[0];
    return picked?.name ?? "Cầu thủ";
  };

  const pickGK = (team: SimTeam): string => {
    const gk = team.cards.find((c) => c.position === "GK") ?? team.cards[0];
    return gk?.name ?? "Thủ môn";
  };

  const addActionEvent = (minute: number, side: "home" | "away") => {
    const team = side === "home" ? home : away;
    const opponent = side === "home" ? away : home;
    const player = pickOutfield(team);
    const opponentPlayer = pickOutfield(opponent);
    const gkName = pickGK(opponent);

    const r = Math.random();
    if (r < 0.25) {
      events.push({
        minute,
        type: "pass",
        team: side,
        player,
        text: `${player} ban bật nhịp nhàng với đồng đội, giữ bóng rất tự tin.`,
      });
    } else if (r < 0.5) {
      events.push({
        minute,
        type: "attack",
        team: side,
        player,
        text: `${player} bứt tốc xâm nhập trung lộ, tạo sóng gió trước khung thành.`,
      });
    } else if (r < 0.7) {
      events.push({
        minute,
        type: "counter",
        team: side,
        player,
        text: `${player} dẫn đầu pha phản công nhanh sau khi cắt bóng từ ${opponentPlayer}.`,
      });
    } else if (r < 0.85) {
      events.push({
        minute,
        type: "save",
        team: side === "home" ? "away" : "home",
        player: gkName,
        text: `${gkName} bay người cản phá cú dứt điểm hiểm hóc!`,
      });
    } else {
      events.push({
        minute,
        type: "miss",
        team: side,
        player,
        text: `${player} dứt điểm nhưng bóng đi chệch cột dọc trong gang tấc.`,
      });
    }
  };

  // Thêm các tình huống diễn biến (chuyền, chặn bóng, phản công...) rải suốt trận
  const usedMinutes = new Set<number>(goalMinutes);
  const extraActionCount = 14 + Math.floor(Math.random() * 8); // 14–21 diễn biến nhỏ
  const actionMinutes: number[] = [];
  while (actionMinutes.length < extraActionCount) {
    const m = 2 + Math.floor(Math.random() * 87); // phút 2–89
    if (!usedMinutes.has(m)) {
      usedMinutes.add(m);
      actionMinutes.push(m);
    }
  }
  actionMinutes.sort((a, b) => a - b);

  for (const m of actionMinutes) {
    // đội mạnh có chút ưu thế kiểm soát bóng
    const side: "home" | "away" =
      Math.random() < (strongTeam === "home" ? 0.58 : 0.42) ? "home" : "away";
    addActionEvent(m, side);
  }

  // Thêm diễn biến dẫn tới từng bàn thắng
  for (const minute of goalMinutes) {
    const prepMinute = Math.max(1, minute - (1 + Math.floor(Math.random() * 3)));
    if (!usedMinutes.has(prepMinute) && prepMinute !== 45) {
      const side: "home" | "away" = Math.random() < 0.5 ? "home" : "away";
      addActionEvent(prepMinute, side);
      usedMinutes.add(prepMinute);
    }

    if (minute > 45 && !events.some((e) => e.type === "halftime")) {
      events.push({
        minute: 45,
        type: "halftime",
        team: "home",
        text: `Hiệp 1 kết thúc — ${curHome} : ${curAway}`,
      });
    }

    const isHomeGoal = goalIndex < homeScore;
    const teamSide: "home" | "away" = isHomeGoal ? "home" : "away";
    const team = teamSide === "home" ? home : away;
    const scorer = pickScorer(team);

    if (teamSide === "home") curHome++;
    else curAway++;

    events.push({
      minute,
      type: "goal",
      team: teamSide,
      player: scorer,
      text: `⚽ ${scorer} ghi bàn! ${curHome} : ${curAway}`,
    });

    goalIndex++;
  }

  if (!events.some((e) => e.type === "halftime")) {
    events.push({
      minute: 45,
      type: "halftime",
      team: "home",
      text: `Hiệp 1 kết thúc — ${homeScore} : ${awayScore}`,
    });
  }

  events.push({
    minute: 90,
    type: "end",
    team: "home",
    text: `Kết thúc! ${homeScore} - ${awayScore}`,
  });

  // Sort events by minute
  events.sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    const order = {
      kickoff: 0,
      pass: 1,
      counter: 1,
      attack: 2,
      miss: 3,
      save: 3,
      goal: 4,
      halftime: 5,
      end: 6,
    };
    return (order[a.type] ?? 0) - (order[b.type] ?? 0);
  });

  return { events, homeScore, awayScore };
}

/* ======== API Route ======== */

const DAILY_LIMIT = 20; // Giới hạn 20 trận lineup battle / ngày
// Thắng lineup: +10 COIN, thua +5 COIN, hoà +3 COIN
const WIN_COINS = 10;
const LOSE_COINS = 5;
const DRAW_COINS = 3;
const K = 32; // ELO K-factor

interface FormInfo {
  formBonus: number; // -2 → +2
  lossStreak: number; // số trận thua liên tiếp gần nhất (tối đa 5)
}

async function getFormInfo(userId: number): Promise<FormInfo> {
  const recent = await prisma.matchResult.findMany({
    where: { roomId: `lineup_battle_${userId}` },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  let score = 0;
  let lossStreak = 0;

  for (let i = 0; i < recent.length; i++) {
    const m = recent[i];
    const homeGoals = m.redScore;
    const awayGoals = m.blueScore;

    if (homeGoals > awayGoals) {
      score += 1;
      if (i === 0 && lossStreak > 0) break;
    } else if (homeGoals < awayGoals) {
      score -= 1;
      if (i === 0 || lossStreak > 0) {
        lossStreak += 1;
      }
    } else {
      // hoà trong lineup battle (nếu có) cắt streak
      if (i === 0 && lossStreak > 0) break;
    }

    if (homeGoals >= awayGoals) {
      // kết quả không phải thua → dừng chuỗi thua tại đây
      if (i === 0) break;
    }
  }

  const formBonus = Math.max(-2, Math.min(2, score));

  return {
    formBonus,
    lossStreak,
  };
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMatches = await prisma.matchResult.count({
      where: {
        createdAt: { gte: today },
        roomId: `lineup_battle_${session.userId}`,
      },
    });
    if (todayMatches >= DAILY_LIMIT) {
      return NextResponse.json({ error: `Bạn đã đá ${DAILY_LIMIT} trận lineup hôm nay. Quay lại ngày mai!` }, { status: 429 });
    }

    // Load my lineup
    const mySlots = await prisma.lineupSlot.findMany({
      where: { userId: session.userId },
      include: {
        card: true,
        user: { select: { username: true, discordGlobalName: true, lineupElo: true } },
      },
      orderBy: { slotIndex: "asc" },
    });

    if (mySlots.length < 5) {
      return NextResponse.json({ error: "Bạn cần xếp đủ 5 cầu thủ vào lineup trước" }, { status: 400 });
    }

    const myUser = mySlots[0].user;
    const myCards: SimCard[] = mySlots.map(s => ({
      name: s.card.name,
      position: s.card.position,
      rating: s.card.rating,
      atk: s.card.atk,
      def: s.card.def,
      pas: s.card.pas,
      imp: s.card.imp,
    }));

    // Find opponent: random user với 5 lineup slots, không phải chính mình
    const allLineups = await prisma.lineupSlot.findMany({
      where: { userId: { not: session.userId } },
      include: {
        card: true,
        user: { select: { id: true, username: true, discordGlobalName: true, lineupElo: true } },
      },
      orderBy: { slotIndex: "asc" },
    });

    // Group by user
    const opponentMap = new Map<number, { username: string; lineupElo: number; cards: SimCard[] }>();
    for (const s of allLineups) {
      const entry = opponentMap.get(s.userId) ?? {
        username: s.user.discordGlobalName ?? s.user.username,
        lineupElo: s.user.lineupElo,
        cards: [],
      };
      entry.cards.push({
        name: s.card.name,
        position: s.card.position,
        rating: s.card.rating,
        atk: s.card.atk,
        def: s.card.def,
        pas: s.card.pas,
        imp: s.card.imp,
      });
      opponentMap.set(s.userId, entry);
    }

    // Filter only complete lineups (5 cards)
    const validOpponents = Array.from(opponentMap.entries())
      .filter(([, v]) => v.cards.length >= 5)
      .map(([id, v]) => ({ userId: id, ...v }));

    if (validOpponents.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy đối thủ nào có đủ đội hình" }, { status: 404 });
    }

    // Lấy danh sách đối thủ đã gặp hôm nay để tránh trùng lặp trong 20 trận
    const todayHistory = await prisma.matchResult.findMany({
      where: {
        createdAt: { gte: today },
        roomId: `lineup_battle_${session.userId}`,
      },
      select: { players: true },
    });

    const playedOpponentIds = new Set<number>();
    for (const m of todayHistory) {
      const data = m.players as any;
      if (data?.type === "lineup_battle" && data.home && data.away) {
        const homeId = data.home.userId as number;
        const awayId = data.away.userId as number;
        const oppId = homeId === session.userId ? awayId : homeId;
        if (oppId && typeof oppId === "number") {
          playedOpponentIds.add(oppId);
        }
      }
    }

    // Ưu tiên tìm đối thủ CHƯA gặp hôm nay; nếu hết thì mới quay lại pool đầy đủ
    const unplayedOpponents = validOpponents.filter(o => !playedOpponentIds.has(o.userId));
    const opponentPool = unplayedOpponents.length > 0 ? unplayedOpponents : validOpponents;

    // Pick random opponent (weighted by similar lineup ELO) trong pool đã chọn
    const myElo = myUser.lineupElo;
    const weighted = opponentPool.map(o => ({
      ...o,
      weight: 1 / (1 + Math.abs(o.lineupElo - myElo) / 200),
    }));
    const totalWeight = weighted.reduce((s, o) => s + o.weight, 0);
    let roll = Math.random() * totalWeight;
    let opponent = weighted[0];
    for (const o of weighted) {
      roll -= o.weight;
      if (roll <= 0) { opponent = o; break; }
    }

    // Tính phong độ 5 trận gần nhất cho mỗi đội
    const [homeForm, awayForm] = await Promise.all([
      getFormInfo(session.userId),
      getFormInfo(opponent.userId),
    ]);

    // Build teams (truyền thêm formBonus + lossStreak vào)
    const homeTeam = buildTeam(
      session.userId,
      myUser.discordGlobalName ?? myUser.username,
      myCards,
      homeForm.formBonus,
      homeForm.lossStreak
    );
    const awayTeam = buildTeam(
      opponent.userId,
      opponent.username,
      opponent.cards.slice(0, 5),
      awayForm.formBonus,
      awayForm.lossStreak
    );

    // Simulate
    const { events, homeScore, awayScore } = simulate(homeTeam, awayTeam);

    // Determine result
    const isWin = homeScore > awayScore;
    const isDraw = homeScore === awayScore;
    const coinReward = isWin ? WIN_COINS : isDraw ? DRAW_COINS : LOSE_COINS;

    // ELO calculation (K=32)
    const opponentElo = opponent.lineupElo;
    const expected = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));
    const actual = isWin ? 1 : isDraw ? 0.5 : 0;
    const rankChange = Math.round(K * (actual - expected));

    // Update user balance, lineup ELO, and save match
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.userId },
        data: {
          balance: { increment: coinReward },
          lineupElo: { increment: rankChange },
        },
      }),
      prisma.matchResult.create({
        data: {
          redScore: homeScore,
          blueScore: awayScore,
          duration: 90,
          roomId: `lineup_battle_${session.userId}`,
          players: JSON.parse(JSON.stringify({
            type: "lineup_battle",
            home: { userId: session.userId, username: homeTeam.username, avgOvr: homeTeam.avgOvr },
            away: { userId: opponent.userId, username: awayTeam.username, avgOvr: awayTeam.avgOvr },
            events,
          })),
        },
      }),
    ]);

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { balance: true, lineupElo: true },
    });

    return NextResponse.json({
      home: {
        username: homeTeam.username,
        avgOvr: homeTeam.avgOvr,
        avgAtk: homeTeam.avgAtk,
        avgDef: homeTeam.avgDef,
        avgPas: homeTeam.avgPas,
        avgImp: homeTeam.avgImp,
        cards: homeTeam.cards,
      },
      away: {
        username: awayTeam.username,
        avgOvr: awayTeam.avgOvr,
        avgAtk: awayTeam.avgAtk,
        avgDef: awayTeam.avgDef,
        avgPas: awayTeam.avgPas,
        avgImp: awayTeam.avgImp,
        cards: awayTeam.cards,
      },
      events,
      homeScore,
      awayScore,
      result: isWin ? "win" : isDraw ? "draw" : "lose",
      coinReward,
      rankChange,
      remainingMatches: DAILY_LIMIT - todayMatches - 1,
      balance: updatedUser?.balance,
    });
  } catch (e) {
    console.error("lineup/battle error:", e);
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}