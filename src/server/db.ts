import "server-only";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  return new PrismaClient({ adapter: new PrismaLibSql({ url }) });
}

/** One Prisma client per process (survives Next.js hot reloads in dev). */
export const db = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Id of the single local learner. Every row hangs off a User so multi-user is additive later. */
export const LOCAL_USER_ID = "local";
