import Link from "next/link";
import { LogInForm } from "@/components/forms";

export const metadata = { title: "Sign in - CareProof" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight">Sign in to CareProof</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Branded monthly care reports for your client sites.
        </p>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <LogInForm />
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">
          No account yet?{" "}
          <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
            Create one
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-slate-400">
          Demo workspace: demo@careproof.test / demo-password-1
        </p>
      </div>
    </div>
  );
}
