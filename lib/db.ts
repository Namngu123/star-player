import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

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

function createPrismaClient() {
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
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;