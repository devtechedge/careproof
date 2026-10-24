import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createAccount, authenticate } from "@/lib/services";

// P1.7: funnel events and waitlist persistence.

const emails = ["funnel-a@test.example", "funnel-demo@test.example"];

beforeAll(async () => {
  await prisma.account.deleteMany({ where: { email: { in: emails } } });
  await prisma.event.deleteMany({});
  await prisma.waitlistSignup.deleteMany({});
});

describe("funnel events", () => {
  it("records signup_completed with the account id", async () => {
    const r = await createAccount({ email: emails[0], password: "password1234", name: "Funnel A" });
    expect(r.ok).toBe(true);
    const events = await prisma.event.findMany({ where: { name: "signup_completed" } });
    expect(events).toHaveLength(1);
    expect(events[0].accountId).toBeTruthy();
  });

  it("records demo_login only for the demo account", async () => {
    const { hashPassword } = await import("@/lib/password");
    const demo = await prisma.account.create({
      data: {
        email: emails[1],
        passwordHash: await hashPassword("password1234"),
        name: "Funnel Demo",
        plan: "demo",
        isDemo: true,
      },
    });
    const r = await authenticate(emails[1], "password1234");
    expect(r.ok).toBe(true);
    // logEvent is fire-and-forget; poll briefly for the write to land
    let events = [] as Array<{ id: string }>;
    for (let i = 0; i < 20; i++) {
      events = await prisma.event.findMany({ where: { name: "demo_login" } });
      if (events.length > 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(events).toHaveLength(1);
    expect(events[0].accountId).toBe(demo.id);
  });

  it("waitlist upsert keeps one row per email", async () => {
    const { prisma: p } = await import("@/lib/db");
    await p.waitlistSignup.create({ data: { email: "waitlist@test.example" } });
    await p.waitlistSignup.upsert({
      where: { email: "waitlist@test.example" },
      update: {},
      create: { email: "waitlist@test.example" },
    });
    const rows = await p.waitlistSignup.findMany({ where: { email: "waitlist@test.example" } });
    expect(rows).toHaveLength(1);
  });
});
