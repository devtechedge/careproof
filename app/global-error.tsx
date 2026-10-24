"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#e9edf3", color: "#101828" }}>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ marginTop: "12px", fontSize: "0.875rem", color: "#46536a" }}>
            CareProof hit an unexpected error. Please try again.
          </p>
          {error.digest ? (
            <p style={{ marginTop: "8px", fontSize: "0.75rem", color: "#7d8899" }}>Reference: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: "24px", padding: "10px 20px", borderRadius: 6, background: "#2563eb", color: "#fff", fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
