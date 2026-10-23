"use client";

import { useEffect, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("careproof:theme", callback);
  return () => window.removeEventListener("careproof:theme", callback);
}

function currentTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as const);

  useEffect(() => {
    // cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === "theme") window.dispatchEvent(new Event("careproof:theme"));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
    window.dispatchEvent(new Event("careproof:theme"));
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // storage unavailable; theme still applies for this page
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative grid h-9 w-9 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] ${className}`}
    >
      <span className={`theme-icon ${theme === "dark" ? "" : "theme-icon-hidden"}`}>
        <SunIcon />
      </span>
      <span className={`theme-icon ${theme === "dark" ? "theme-icon-hidden" : ""}`}>
        <MoonIcon />
      </span>
    </button>
  );
}
