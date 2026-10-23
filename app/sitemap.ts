import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://careproof-tau.vercel.app";
  const now = new Date();
  // Public marketing and legal pages only: authenticated routes and report
  // share links (/r/) are intentionally excluded.
  return ["/", "/login", "/signup", "/legal/terms", "/legal/privacy", "/legal/refunds"].map(
    (path) => ({
      url: `${base}${path}`,
      lastModified: now,
    })
  );
}
