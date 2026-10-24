export default function DashLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <div>
        <div className="h-7 w-52 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
      <div className="h-24 animate-pulse rounded-xl bg-[var(--surface)]" />
      <div className="h-64 animate-pulse rounded-xl bg-[var(--surface)]" />
    </div>
  );
}
