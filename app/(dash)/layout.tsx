import Link from "next/link";
import { redirect } from "next/navigation";
import { authLogOut } from "@/app/actions";
import { currentAccount } from "@/lib/auth";
import { planFor } from "@/lib/plans";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await currentAccount();
  if (!account) redirect("/login");
  const plan = planFor(account.plan);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print border-b border-[var(--border)] bg-[var(--surface)]">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/dashboard" className="font-bold tracking-tight">
              CareProof
            </Link>
            <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
              Sites
            </Link>
            <Link href="/reports" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
              Reports
            </Link>
            <Link href="/settings" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
              Settings
            </Link>
          </div>
          <div className="flex min-w-0 items-center gap-3 text-sm">
            {account.isDemo ? (
              <span className="rounded-full border border-amber-300 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Demo workspace
              </span>
            ) : null}
            <span className="hidden min-w-0 truncate text-[var(--muted)] sm:inline">
              {account.name} - {plan.name}
            </span>
            <form action={authLogOut}>
              <button type="submit" className="text-[var(--muted)] hover:text-[var(--ink)]">
                Sign out
              </button>
            </form>
            <ThemeToggle className="h-8 w-8" />
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
