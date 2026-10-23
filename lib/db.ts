import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/client/client";

function resolveUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!raw.startsWith("file:")) return raw; // postgres URL at deploy time
  const filePart = raw.slice("file:".length);
  if (path.isAbsolute(filePart)) return `file:${filePart}`;
  return `file:${path.join(process.cwd(), filePart)}`;
}

const g = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  g.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: resolveUrl() }),
  });

if (process.env.NODE_ENV !== "production") g.prisma = prisma;
