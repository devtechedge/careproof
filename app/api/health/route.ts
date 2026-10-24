import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      version: (process.env.VERCEL_GIT_COMMIT_SHA ?? "dev").slice(0, 7),
    });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
