import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  const client = new PrismaClient({ adapter } as never);
  // Next server and the worker both open this DB — WAL avoids SQLITE_BUSY.
  void client.$queryRawUnsafe("PRAGMA journal_mode=WAL;").catch(() => {});
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
