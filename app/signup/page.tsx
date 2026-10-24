import Link from "next/link";
import { SignUpForm } from "@/components/forms";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Create account - CareProof" };
export const dynamic = "force-dynamic";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  studio: "Studio",
  agency: "Agency",
};

export default async function SignUpPage({
  searchParams,
}: PageProps<"/signup">) {
  const sp = await searchParams;
  const planParam = typeof sp.plan === "string" ? sp.plan : "";
  const selectedPlan = PLAN_LABELS[planParam] ? planParam : null;
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          Create your CareProof account
        </h1>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          Add your sites, run checks, send the first branded report today.
        </p>
        {selectedPlan ? (
          <p className="mt-4 rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-center text-sm text-blue-700 dark:text-blue-300">
            Selected plan: {PLAN_LABELS[selectedPlan]}. Signup is free and starts nothing on your
            card. During the pilot every account runs with Starter limits; paid plans activate
            when billing goes live.
          </p>
        ) : (
          <p className="mt-4 text-center text-xs text-[var(--muted)]">
            Free during the pilot. Creating an account does not start a subscription or charge anything.
          </p>
        )}
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <SignUpForm plan={selectedPlan} />
        </div>
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
