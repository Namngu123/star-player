import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Gacha cầu thủ Secret Pack: 50 COIN / lượt, pool = tất cả thẻ đang list trên Market.
// Có thể trùng thẻ; ai may thì trúng được cầu thủ OVR cao.
const PACK_CONFIG = {
  secret: { cost: 50 },
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function impFromElo(elo: number): number {
  // IMP từ ELO cá nhân:
  // - ELO sàn: 400 (thấp hơn vẫn tính như 400)
  // - ELO ~ 1000  => IMP ~ 50
  // - ELO cao hơn vẫn chỉ được tối đa ~90 IMP
  const effectiveElo = Math.max(400, elo);
  const base = 50 + (effectiveElo - 1000) / 20; // scale mạnh hơn để top 1 dễ lên 90+
  return clamp(Math.round(base), 40, 90); // IMP: 40–90
}

function ovrFromElo(elo: number): number {
  // OVR từ ELO cá nhân:
  // - ELO thấp (400) => OVR 50
  // - ELO top 1 (~2000+) => OVR 75
  // - Chia đều theo elo cá nhân
  const effectiveElo = Math.max(400, elo);
  // elo 400 → OVR 50, elo 2000 → OVR 75
  const base = 50 + (effectiveElo - 400) * 25 / 1600;
  return clamp(Math.round(base), 50, 75); // OVR: 50–75
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const packId = String(body.packId ?? "");
    const config = PACK_CONFIG[packId as keyof typeof PACK_CONFIG];
    if (!config) {
      return NextResponse.json({ error: "Invalid pack" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.balance < config.cost) {
      return NextResponse.json({ error: "Không đủ COIN", cost: config.cost }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      // Trừ COIN người chơi.
      await tx.user.update({
        where: { id: session.userId },
        data: { balance: { decrement: config.cost } },
      });

      // Pool admin đang list trên Market.
      // - Dùng làm nguồn "jackpot" (trúng đúng thẻ admin, sẽ trừ stock).
      // - Đồng thời dùng làm template ngoại hình (avatar/nation/position/series/region) cho pack thường.
      const adminPool = await tx.card.findMany({
        where: {
          listedPrice: { not: null },
          stock: { gt: 0 },
          owner: { role: "admin" },
        },
      });

      if (adminPool.length === 0) {
        throw new Error("Pool pack đã hết thẻ để quay");
      }

      // Xác suất ra thẻ admin list (jackpot): rất hiếm, ~1%.
      // Vẫn random theo trọng số để thẻ OVR cao hiếm hơn.
      const jackpotProb = 0.01;
      const hitJackpot = Math.random() < jackpotProb;

      // Chọn template ngẫu nhiên từ pool admin (dùng cho pack thường).
      const templateCard = adminPool[Math.floor(Math.random() * adminPool.length)];

      // Lấy ngẫu nhiên tên 1 user trong hệ thống để đặt tên thẻ.
      // OVR và IMP sẽ bám theo ELO cá nhân của người được in tên này.
      // Top 1-10 ELO sẽ có tỉ lệ thấp hơn (vẫn có thể rơi, nhưng ít).
      const users = await tx.user.findMany({
        where: { role: "user" },
        select: { username: true, discordGlobalName: true, discordUsername: true, elo: true },
      });
      let randomName = templateCard.name;
      // Mặc định: nếu không tìm được user nào, dùng ELO của người quay pack.
      let cardOwnerElo = user.elo;
      if (users.length > 0) {
        // Sắp xếp theo ELO giảm dần và lấy top 10
        const sortedUsers = [...users].sort((a, b) => (b.elo ?? 1000) - (a.elo ?? 1000));
        const top10Elo = sortedUsers.slice(0, Math.min(10, sortedUsers.length)).map(u => u.elo ?? 1000);
        const top10Set = new Set(top10Elo);

        // Weight: top 1-10 = 0.1 (rất thấp nhưng vẫn có thể rơi), user khác = 1.0 (bình thường)
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

      // Nếu trúng jackpot: trả đúng 1 thẻ admin đang list trên Market (hiếm), có trừ stock.
      if (hitJackpot) {
        // Weight theo rating để thẻ càng cao càng hiếm.
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
            // Jackpot từ admin list được đánh dấu isFromShop để tra ngược ai đang sở hữu.
            isFromShop: true,
          },
        });

        const newStock = picked.stock - 1;
        await tx.card.update({
          where: { id: picked.id },
          data: { stock: Math.max(0, newStock) },
        });

        // Thông báo cho admin (chủ thẻ) biết stock bị trừ do người chơi quay pack
        const buyerName = user.discordGlobalName || user.discordUsername || user.username;
        await tx.notification.create({
          data: {
            userId: picked.ownerId,
            type: "card_sold",
            title: "Thẻ trong shop được quay từ Pack",
            message: `${buyerName} đã quay trúng thẻ ${picked.name} (OVR ${picked.rating}) từ Secret Pack. Stock còn lại: ${Math.max(0, newStock)}.`,
            data: { cardId: picked.id, buyerId: session.userId, from: "pack", rating: picked.rating },
          },
        });

        // Thông báo public cho tất cả user về jackpot Secret Pack (chỉ khi OVR > 75)
        if (picked.rating > 75) {
          const allUsers = await tx.user.findMany({
            select: { id: true },
          });
          if (allUsers.length > 0) {
            await tx.notification.createMany({
              data: allUsers.map((u) => ({
                userId: u.id,
                type: "pack_secret_jackpot",
                title: "Jackpot Secret Pack!",
                message: `${buyerName} vừa quay trúng thẻ hiếm ${picked.name} (OVR ${picked.rating}) từ Secret Pack!`,
                data: { cardId: newCard.id, rating: picked.rating, from: "secret_pack_jackpot" },
              })),
            });
          }
        }

        return [newCard];
      }

      // Pack thường: OVR và IMP dựa vào ELO của user được random.
      // OVR từ ELO: 50-75 (không quá 75)
      const rating = ovrFromElo(cardOwnerElo);
      
      // ATK/DEF/PAS random quanh OVR với spread nhỏ (±5)
      const spread = 5;
      const randStat = () => {
        const raw = rating + Math.floor(Math.random() * (spread * 2 + 1)) - spread;
        return Math.min(99, Math.max(30, raw));
      };

      const atk = randStat();
      const def = randStat();
      const pas = randStat();
      // IMP tách riêng: lấy theo ELO cá nhân của người được in tên trên thẻ.
      const imp = impFromElo(cardOwnerElo);

      // Tạo thẻ mới cho người quay.
      const newCard = await tx.card.create({
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
          // Pack thường không phải thẻ admin list.
          isFromShop: false,
        },
      });

      // Thông báo public cho tất cả user: chỉ khi OVR > 75
      if (newCard.rating > 75) {
        const buyerName = user.discordGlobalName || user.discordUsername || user.username;
        const allUsers = await tx.user.findMany({
          select: { id: true },
        });
        if (allUsers.length > 0) {
          await tx.notification.createMany({
            data: allUsers.map((u) => ({
              userId: u.id,
              type: "pack_secret",
              title: "Secret Pack vừa được mở",
              message: `${buyerName} vừa mở Secret Pack và nhận được thẻ ${newCard.name} (OVR ${newCard.rating}, IMP ${newCard.imp}).`,
              data: { cardId: newCard.id, rating: newCard.rating, imp: newCard.imp, from: "secret_pack" },
            })),
          });
        }
      }

      return [newCard];
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { balance: true },
    });

    return NextResponse.json({
      ok: true,
      cards: created,
      balance: updatedUser?.balance ?? 0,
    });
  } catch (e) {
    console.error("packs/open error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
