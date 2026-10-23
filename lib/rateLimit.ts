import { prisma } from "./db";

/**
 * Simple DB-backed sliding window. Deletes expired rows for the bucket as part
 * of the check so the table stays small without a cron job.
 */
export async function rateLimit(
  bucket: string,
  action: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const since = new Date(Date.now() - windowMs);
  return prisma.$transaction(async (tx) => {
    const recent = await tx.rateLimit.count({
      where: { bucket, action, createdAt: { gte: since } },
    });
    if (recent < limit) {
      await tx.rateLimit.create({ data: { bucket, action } });
      // opportunistic cleanup outside the hot window
      await tx.rateLimit.deleteMany({
        where: { bucket, action, createdAt: { lt: since } },
      });
      return { allowed: true, remaining: limit - recent - 1 };
    }
    return { allowed: false, remaining: 0 };
  });
}

export const LIMITS = {
  signupPerIpPerDay: 5,
  loginPerEmailPerHour: 10,
  runChecksPerAccountPerHour: 60,
  reportPerAccountPerHour: 15,
} as const;
