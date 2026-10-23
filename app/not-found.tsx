import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Not found - CareProof" };

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">This page is not available</h1>
      <p className="mt-3 max-w-md text-sm text-[var(--muted)]">
        The link may be wrong, or the report it pointed to was unpublished by its agency.
        Unpublished share links stop working immediately.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Go to CareProof
      </Link>
    </div>
  );
}
