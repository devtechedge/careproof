import Link from "next/link";
import { SignUpForm } from "@/components/forms";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Create account - CareProof" };

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
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
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <SignUpForm />
        </div>
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
