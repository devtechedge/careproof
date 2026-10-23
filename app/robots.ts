import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://careproof-tau.vercel.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/legal/"],
        disallow: ["/r/", "/dashboard", "/reports", "/settings", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
