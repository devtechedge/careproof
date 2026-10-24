export default function ReportLoading() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <div className="h-7 w-64 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="h-12 animate-pulse rounded-xl bg-[var(--surface)]" />
      <div className="h-40 animate-pulse rounded-xl bg-[var(--surface)]" />
      <div className="h-96 animate-pulse rounded-xl bg-[var(--surface)]" />
    </div>
  );
}
