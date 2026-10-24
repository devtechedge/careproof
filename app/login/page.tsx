import Link from "next/link";
import { LogInForm } from "@/components/forms";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Sign in - CareProof" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight">Sign in to CareProof</h1>
        <p className="mt-2 text-center text-sm text-[var(--muted)]">
          Branded monthly care reports for your client sites.
        </p>
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <LogInForm />
        </div>
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          No account yet?{" "}
          <Link href="/signup" className="font-semibold text-blue-700 hover:text-blue-800">
            Create one
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-[var(--faint)]">
          Demo workspace: demo@careproof.test / demo-password-1
        </p>
      </div>
    </main>
  );
}
