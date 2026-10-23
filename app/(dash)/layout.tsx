import Link from "next/link";
import { redirect } from "next/navigation";
import { authLogOut } from "@/app/actions";
import { currentAccount } from "@/lib/auth";
import { planFor } from "@/lib/plans";

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
      <header className="no-print border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold tracking-tight">
              CareProof
            </Link>
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
              Sites
            </Link>
            <Link href="/reports" className="text-sm text-slate-600 hover:text-slate-900">
              Reports
            </Link>
            <Link href="/settings" className="text-sm text-slate-600 hover:text-slate-900">
              Settings
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {account.isDemo ? (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                Demo workspace
              </span>
            ) : null}
            <span className="text-slate-500">
              {account.name} - {plan.name}
            </span>
            <form action={authLogOut}>
              <button type="submit" className="text-slate-500 hover:text-slate-900">
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
