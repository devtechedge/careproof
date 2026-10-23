import Link from "next/link";
import { SignUpForm } from "@/components/forms";

export const metadata = { title: "Create account - CareProof" };

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          Create your CareProof account
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Add your sites, run checks, send the first branded report today.
        </p>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
          <SignUpForm />
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
