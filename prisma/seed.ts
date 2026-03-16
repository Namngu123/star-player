import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

function parseConnectionString(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port) || 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.slice(1),
    };
  } catch {
    return null;
  }
}

const connectionString = process.env.DATABASE_URL || "";
const isSupabase = connectionString.includes("supabase.co");

const poolConfig = isSupabase
  ? {
      ...parseConnectionString(connectionString),
      ssl: { rejectUnauthorized: false },
    }
  : { connectionString };

const pool = new Pool(poolConfig);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const userHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: adminHash, role: "admin", balance: 99999 },
  });

  const tuyet = await prisma.user.upsert({
    where: { username: "Tuyet" },
    update: {},
    create: { username: "Tuyet", password: userHash, role: "user", balance: 520 },
  });

  const marketUser = await prisma.user.upsert({
    where: { username: "market" },
    update: {},
    create: { username: "market", password: adminHash, role: "user", balance: 0 },
  });

  // Tạo một ít thẻ demo nếu chưa có card nào
  const existingCards = await prisma.card.count();
  if (existingCards === 0) {
    await prisma.card.createMany({
      data: [
        {
          id: "c1", name: "RAZZLE", nation: "AUS", position: "CB",
          rating: 83, atk: 74, def: 87, pas: 82, imp: 80,
          series: "Futsal", region: "ASIA", ownerId: tuyet.id, effect: "GlowPulse",
        },
        {
          id: "c2", name: "ONOI123", nation: "VN", position: "GK",
          rating: 57, atk: 57, def: 73, pas: 40, imp: 42,
          series: "Futsal", region: "ASIA", ownerId: tuyet.id,
        },
        {
          id: "c3", name: "KAI", nation: "JP", position: "CM",
          rating: 91, atk: 86, def: 79, pas: 92, imp: 88,
          series: "Futsal", region: "ASIA", ownerId: tuyet.id, effect: "GoldSparkle",
        },
        {
          id: "c4", name: "MORGAN", nation: "GB", position: "ST",
          rating: 88, atk: 91, def: 62, pas: 80, imp: 84,
          series: "Futsal", region: "EU", ownerId: marketUser.id, listedPrice: 1450,
        },
        {
          id: "c5", name: "SILVA", nation: "BR", position: "CM",
          rating: 85, atk: 82, def: 71, pas: 89, imp: 83,
          series: "Real Soccer", region: "AMERICAS", ownerId: marketUser.id, listedPrice: 1200,
        },
        {
          id: "c6", name: "TANAKA", nation: "JP", position: "ST",
          rating: 78, atk: 84, def: 55, pas: 72, imp: 76,
          series: "Futsal", region: "ASIA", ownerId: marketUser.id, listedPrice: 800,
        },
        {
          id: "c7", name: "MÜLLER", nation: "DE", position: "ST",
          rating: 92, atk: 94, def: 58, pas: 85, imp: 90,
          series: "Real Soccer", region: "EU", ownerId: marketUser.id, listedPrice: 2800,
        },
        {
          id: "c8", name: "PARK", nation: "KR", position: "CB",
          rating: 73, atk: 62, def: 81, pas: 70, imp: 68,
          series: "Futsal", region: "ASIA", ownerId: marketUser.id, listedPrice: 450,
        },
        {
          id: "c9", name: "ROSSI", nation: "IT", position: "GK",
          rating: 80, atk: 45, def: 88, pas: 65, imp: 78,
          series: "Real Soccer", region: "EU", ownerId: marketUser.id, listedPrice: 950,
        },
      ],
    });
  }

  console.log("Seed complete!");
  console.log(`  Admin: ${admin.username} (password: admin123)`);
  console.log(`  User: ${tuyet.username} (password: 123456)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());