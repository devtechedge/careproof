export type PlanId = "starter" | "studio" | "agency" | "demo";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  siteLimit: number;
  reportLimitPerMonth: number;
  clientPortal: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 19,
    siteLimit: 15,
    reportLimitPerMonth: 8,
    clientPortal: false,
  },
  studio: {
    id: "studio",
    name: "Studio",
    priceMonthlyUsd: 49,
    siteLimit: 50,
    reportLimitPerMonth: 30,
    clientPortal: true,
  },
  agency: {
    id: "agency",
    name: "Agency",
    priceMonthlyUsd: 99,
    siteLimit: 150,
    reportLimitPerMonth: 90,
    clientPortal: true,
  },
  demo: {
    id: "demo",
    name: "Demo",
    priceMonthlyUsd: 0,
    siteLimit: 25,
    reportLimitPerMonth: 8,
    clientPortal: true,
  },
};

export function planFor(plan: string | null | undefined): Plan {
  return PLANS[(plan ?? "starter") as PlanId] ?? PLANS.starter;
}
