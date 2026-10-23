import { describe, expect, it } from "vitest";
import {
  domainStatusFor,
  extractLinks,
  findSitemapInRobots,
  hasFaviconLink,
  headersStatusFor,
  linksStatusFor,
  scoreSecurityHeaders,
  sslStatusFor,
  ttfbStatusFor,
  weightStatusFor,
} from "@/lib/checks";
import { isEmail, normalizeSiteUrl } from "@/lib/validation";
import { currentPeriod, overallFor, periodLabel, summarizeChecks, worstOverall } from "@/lib/report";

describe("normalizeSiteUrl", () => {
  it("adds https and normalizes", () => {
    const r = normalizeSiteUrl("example.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe("https://example.com/");
  });

  it("keeps path and strips hash", () => {
    const r = normalizeSiteUrl("https://example.com/page#section");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe("https://example.com/page");
  });

  it("blocks localhost and private ranges", () => {
    expect(!normalizeSiteUrl("http://localhost:3000").ok).toBe(true);
    expect(!normalizeSiteUrl("http://127.0.0.1").ok).toBe(true);
    expect(!normalizeSiteUrl("http://192.168.1.5").ok).toBe(true);
    expect(!normalizeSiteUrl("http://10.0.0.4").ok).toBe(true);
    expect(!normalizeSiteUrl("http://172.16.2.2").ok).toBe(true);
  });

  it("blocks internal-ish suffixes and dotless hosts", () => {
    expect(!normalizeSiteUrl("http://printer.local").ok).toBe(true);
    expect(!normalizeSiteUrl("http://intranet.internal").ok).toBe(true);
    expect(!normalizeSiteUrl("http://something.onion").ok).toBe(true);
    expect(!normalizeSiteUrl("http://localhost").ok).toBe(true);
  });

  it("blocks non-http schemes and credentials", () => {
    expect(!normalizeSiteUrl("ftp://example.com").ok).toBe(true);
    expect(!normalizeSiteUrl("https://user:pw@example.com").ok).toBe(true);
  });

  it("rejects garbage", () => {
    expect(!normalizeSiteUrl("not a url at all").ok).toBe(true);
    expect(!normalizeSiteUrl("").ok).toBe(true);
  });
});

describe("isEmail", () => {
  it("accepts normal emails and rejects junk", () => {
    expect(isEmail("dev@example.com")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("nope")).toBe(false);
  });
});

describe("status thresholds", () => {
  it("ssl expiry bands", () => {
    expect(sslStatusFor(3)).toBe("fail");
    expect(sslStatusFor(20)).toBe("warn");
    expect(sslStatusFor(60)).toBe("pass");
    expect(sslStatusFor(null)).toBe("info");
  });

  it("ttfb bands", () => {
    expect(ttfbStatusFor(300)).toBe("pass");
    expect(ttfbStatusFor(1200)).toBe("warn");
    expect(ttfbStatusFor(3000)).toBe("fail");
  });

  it("weight bands", () => {
    expect(weightStatusFor(100 * 1024)).toBe("pass");
    expect(weightStatusFor(500 * 1024)).toBe("warn");
    expect(weightStatusFor(1200 * 1024)).toBe("fail");
  });

  it("domain expiry bands", () => {
    expect(domainStatusFor(9)).toBe("fail");
    expect(domainStatusFor(30)).toBe("warn");
    expect(domainStatusFor(200)).toBe("pass");
    expect(domainStatusFor(null)).toBe("info");
  });
});

describe("scoreSecurityHeaders", () => {
  it("scores full set 5/5", () => {
    const h = {
      "strict-transport-security": "max-age=63072000",
      "content-security-policy": "default-src 'self'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
    };
    expect(scoreSecurityHeaders(h)).toEqual({ score: 5, outOf: 5, missing: [] });
    expect(headersStatusFor(5)).toBe("pass");
  });

  it("counts frame-ancestors CSP as framing protection", () => {
    const h = {
      "content-security-policy": "frame-ancestors 'none'",
      "strict-transport-security": "max-age=0",
    };
    const s = scoreSecurityHeaders(h);
    expect(s.score).toBe(3); // hsts + csp + framing
    expect(s.missing).not.toContain("X-Frame-Options (or CSP frame-ancestors)");
    expect(headersStatusFor(3)).toBe("warn");
  });

  it("empty headers score 0", () => {
    expect(scoreSecurityHeaders({}).score).toBe(0);
  });
});

describe("extractLinks", () => {
  const html = `
    <a href="/about">About</a>
    <a href='https://other.example/x'>Other</a>
    <a href="mailto:x@y.example">Mail</a>
    <a href="#top">Top</a>
    <a href="javascript:void(0)">Js</a>
    <a href="/relative?a=1#frag">Q</a>
  `;
  it("extracts and resolves, dropping mailto/hash/js", () => {
    const links = extractLinks(html, "https://site.example/");
    expect(links).toContain("https://site.example/about");
    expect(links).toContain("https://other.example/x");
    expect(links).toContain("https://site.example/relative?a=1");
    expect(links.some((l) => l.startsWith("mailto"))).toBe(false);
    expect(links.length).toBe(3);
  });

  it("caps the number of links", () => {
    const many = Array.from({ length: 50 }, (_, i) => `<a href="/p${i}">p</a>`).join("");
    expect(extractLinks(many, "https://site.example/", 10).length).toBe(10);
  });
});

describe("linksStatusFor", () => {
  it("bands broken counts", () => {
    expect(linksStatusFor(0, 20)).toBe("pass");
    expect(linksStatusFor(2, 20)).toBe("warn");
    expect(linksStatusFor(6, 20)).toBe("fail");
    expect(linksStatusFor(0, 0)).toBe("info");
  });
});

describe("robots and favicon parsing", () => {
  it("finds sitemap directive", () => {
    expect(findSitemapInRobots("User-agent: *\nSitemap: https://x.example/s.xml")).toBe(
      "https://x.example/s.xml"
    );
    expect(findSitemapInRobots("User-agent: *")).toBeNull();
  });

  it("detects favicon link tags", () => {
    expect(hasFaviconLink('<link rel="icon" href="/i.png">')).toBe(true);
    expect(hasFaviconLink('<link rel="shortcut icon" href="/i.ico">')).toBe(true);
    expect(hasFaviconLink("<html><body></body></html>")).toBe(false);
  });
});

describe("report helpers", () => {
  it("currentPeriod format", () => {
    expect(currentPeriod(new Date("2026-10-05T00:00:00Z"))).toBe("2026-10");
    expect(currentPeriod(new Date("2026-01-31T23:00:00Z"))).toBe("2026-01");
  });

  it("periodLabel renders month name", () => {
    expect(periodLabel("2026-10")).toBe("October 2026");
    expect(periodLabel("bogus")).toBe("bogus");
  });

  it("summarizes and derives overall", () => {
    const checks = [
      { status: "pass" as const },
      { status: "pass" as const },
      { status: "warn" as const },
      { status: "info" as const },
    ];
    expect(summarizeChecks(checks)).toEqual({ pass: 2, warn: 1, fail: 0, info: 1 });
    expect(overallFor(checks)).toBe("warn");
    expect(overallFor([{ status: "pass" }, { status: "fail" }])).toBe("fail");
    expect(overallFor([{ status: "info" }])).toBe("pass");
  });

  it("worstOverall across sites", () => {
    expect(worstOverall([{ overall: "pass" }, { overall: "warn" }])).toBe("warn");
    expect(worstOverall([{ overall: "pass" }, { overall: "fail" }])).toBe("fail");
    expect(worstOverall([])).toBe("pass");
  });
});
