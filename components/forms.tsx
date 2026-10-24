"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { authLogIn, authSignUp, joinWaitlist } from "@/app/actions";

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </p>
  );
}

const inputClass =
  "w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20";

export function SignUpForm({ plan }: { plan?: string | null }) {
  const [state, action, pending] = useActionState(authSignUp, undefined);
  return (
    <form action={action} className="space-y-4">
      {plan ? <input type="hidden" name="plan" value={plan} /> : null}
      <FieldError error={state?.error} />
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--ink)]" htmlFor="name">
          Agency or your name
        </label>
        <input
          id="name"
          name="name"
          required
          className={inputClass}
          placeholder="Northside Web Studio"
          defaultValue={state?.name ?? ""}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--ink)]" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          defaultValue={state?.email ?? ""}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--ink)]" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
          placeholder="10+ characters, letters and numbers"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}

export function LogInForm() {
  const [state, action, pending] = useActionState(authLogIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <FieldError error={state?.error} />
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--ink)]" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          defaultValue={state?.email ?? ""}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--ink)]" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface-2)]"
    >
      {label}
    </button>
  );
}

export function WaitlistForm() {
  const [state, action, pending] = useActionState(joinWaitlist, undefined);
  if (state?.ok) {
    return (
      <p className="text-sm text-[var(--ink)]" role="status">
        You are on the list. One email when paid plans go live, nothing else.
      </p>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row">
      <input
        name="email"
        type="email"
        required
        placeholder="you@yourstudio.com"
        aria-label="Email for launch updates"
        className="flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-blue-600"
      />
      <SubmitButton
        pendingLabel="Adding..."
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-2)]"
      >
        Notify me at launch
      </SubmitButton>
      {state?.error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className = "rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:opacity-60`}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <span className="no-print inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-2)]"
      >
        {copied ? "Link copied" : label}
      </button>
      <span className="text-xs text-[var(--faint)]" role="status" aria-live="polite">
        {copied ? "Share link copied to clipboard" : ""}
      </span>
    </span>
  );
}
