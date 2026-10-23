import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "cp_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export { hashPassword, verifyPassword } from "./password";

function tokenToId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface Account {
  id: string;
  email: string;
  name: string;
  accentColor: string;
  logoUrl: string | null;
  contactEmail: string | null;
  plan: string;
  isDemo: boolean;
  sessionId?: string;
  intendedPlanLabel?: string | null;
}

export async function createSession(accountId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      id: tokenToId(token),
      accountId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { id: tokenToId(token) } });
  }
  store.delete(SESSION_COOKIE);
}

export async function currentAccount(): Promise<Account | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const sessionId = tokenToId(token);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { account: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const a = session.account;
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    accentColor: a.accentColor,
    logoUrl: a.logoUrl,
    contactEmail: a.contactEmail,
    plan: a.plan,
    isDemo: a.isDemo,
    sessionId,
    intendedPlanLabel:
      a.intendedPlan === 'studio' ? 'Studio' : a.intendedPlan === 'agency' ? 'Agency' : null,
  };
}

/** Deletes every session for the account except the given one (used after password change). */
export async function destroyOtherSessions(
  accountId: string,
  keepSessionId: string
): Promise<void> {
  await prisma.session.deleteMany({
    where: { accountId, id: { not: keepSessionId } },
  });
}
