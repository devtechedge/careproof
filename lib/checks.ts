import tls from "node:tls";
import { normalizeSiteUrl } from "./validation";

// Deterministic site checks. No AI, no third-party APIs, hard timeouts everywhere.
// Pure helpers are exported for unit tests; runners do the network work.

export type CheckStatus = "pass" | "warn" | "fail" | "info";

export interface CheckOutcome {
  checkKey: string;
  status: CheckStatus;
  value: string;
  detail: string;
}

export const CHECK_META: Record<string, { label: string; description: string }> = {
  uptime: { label: "Site is up", description: "Homepage returned a successful response." },
  ttfb: { label: "Response speed", description: "Time to first byte from the server." },
  weight: { label: "Page weight", description: "Homepage HTML size." },
  ssl: { label: "SSL certificate", description: "Certificate validity and days to expiry." },
  httpsRedirect: { label: "HTTPS redirect", description: "http:// redirects to https://." },
  headers: { label: "Security headers", description: "Standard protective response headers." },
  robots: { label: "robots.txt", description: "A robots.txt file exists." },
  sitemap: { label: "Sitemap", description: "A sitemap is declared or present." },
  favicon: { label: "Favicon", description: "A favicon is configured." },
  links: { label: "Homepage links", description: "Sampled homepage links resolve." },
  domain: { label: "Domain expiry", description: "Days until the domain registration expires." },
};

export interface FetchedPage {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  ttfbMs: number;
  totalMs: number;
  bytes: number;
  bodyText: string;
}

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number; redirect?: "follow" | "manual" } = {}
): Promise<Response> {
  const { timeoutMs = 10_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "user-agent": "CareProofBot/1.0 (+site care reports)",
        ...(rest.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPage(url: string, timeoutMs = 12_000): Promise<FetchedPage> {
  const t0 = performance.now();
  const res = await fetchWithTimeout(url, { timeoutMs, redirect: "follow" });
  const ttfbMs = Math.round(performance.now() - t0);
  const reader = res.body?.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  let totalMs = 0;
  if (reader) {
    const t1 = performance.now();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        bytes += value.byteLength;
        if (bytes <= MAX_BODY_BYTES) chunks.push(value);
        if (bytes > MAX_BODY_BYTES) {
          await reader.cancel();
          break;
        }
      }
    }
    totalMs = Math.round(performance.now() - t1);
  }
  const merged = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });
  return {
    finalUrl: res.url || url,
    status: res.status,
    headers,
    ttfbMs,
    totalMs,
    bytes,
    bodyText: new TextDecoder("utf-8", { fatal: false }).decode(merged),
  };
}

export function daysUntil(dateLike: string | Date): number {
  const target = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return Math.floor((target.getTime() - Date.now()) / 86_400_000);
}

export function sslStatusFor(daysRemaining: number | null): CheckStatus {
  if (daysRemaining === null) return "info";
  if (daysRemaining < 7) return "fail";
  if (daysRemaining < 30) return "warn";
  return "pass";
}

export function ttfbStatusFor(ms: number): CheckStatus {
  if (ms < 800) return "pass";
  if (ms < 2000) return "warn";
  return "fail";
}

export function weightStatusFor(bytes: number): CheckStatus {
  if (bytes <= 300 * 1024) return "pass";
  if (bytes <= 800 * 1024) return "warn";
  return "fail";
}

export interface HeaderScore {
  score: number;
  outOf: number;
  missing: string[];
}

export function scoreSecurityHeaders(headers: Record<string, string>): HeaderScore {
  const checks: Array<[string, string, RegExp | null]> = [
    ["strict-transport-security", "HSTS", null],
    ["content-security-policy", "Content-Security-Policy", null],
    ["x-content-type-options", "X-Content-Type-Options", null],
    ["referrer-policy", "Referrer-Policy", null],
    [
      "x-frame-options",
      "X-Frame-Options (or CSP frame-ancestors)",
      null,
    ],
  ];
  let score = 0;
  const missing: string[] = [];
  for (const [header, label] of checks) {
    const cspFraming =
      header === "x-frame-options" &&
      (headers["content-security-policy"] ?? "").includes("frame-ancestors");
    if ((headers[header] ?? "") !== "" || cspFraming) score += 1;
    else missing.push(label);
  }
  return { score, outOf: 5, missing };
}

export function headersStatusFor(score: number): CheckStatus {
  if (score >= 4) return "pass";
  if (score >= 2) return "warn";
  return "fail";
}

export function extractLinks(html: string, baseUrl: string, cap = 25): string[] {
  const out = new Set<string>();
  const anchorRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null && out.size < cap) {
    const href = m[1].trim();
    if (href.startsWith("#")) continue;
    if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.protocol !== "https:" && resolved.protocol !== "http:") continue;
      resolved.hash = "";
      if (resolved.toString() === new URL(baseUrl).toString()) continue;
      out.add(resolved.toString());
    } catch {
      // skip malformed hrefs
    }
  }
  return [...out].slice(0, cap);
}

export function linksStatusFor(broken: number, checked: number): CheckStatus {
  if (checked === 0) return "info";
  if (broken === 0) return "pass";
  if (broken <= 3) return "warn";
  return "fail";
}

export function domainStatusFor(daysRemaining: number | null): CheckStatus {
  if (daysRemaining === null) return "info";
  if (daysRemaining < 14) return "fail";
  if (daysRemaining < 45) return "warn";
  return "pass";
}

export function findSitemapInRobots(robotsText: string): string | null {
  const m = /sitemap:\s*(\S+)/i.exec(robotsText);
  return m ? m[1] : null;
}

export function hasFaviconLink(html: string): boolean {
  return /<link\b[^>]*rel\s*=\s*["'][^"']*icon[^"']*["']/i.test(html);
}

export async function getTlsExpiry(
  hostname: string,
  timeoutMs = 8_000
): Promise<{ daysRemaining: number | null; issuer: string | null }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: { daysRemaining: number | null; issuer: string | null }) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, timeout: timeoutMs },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          if (cert && cert.valid_to) {
            const dn = cert.issuer as { O?: string | string[]; CN?: string | string[] } | undefined;
            const first = (v: string | string[] | undefined): string | null =>
              Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
            finish({
              daysRemaining: daysUntil(cert.valid_to),
              issuer: first(dn?.O) ?? first(dn?.CN),
            });
          } else {
            finish({ daysRemaining: null, issuer: null });
          }
        } catch {
          finish({ daysRemaining: null, issuer: null });
        } finally {
          socket.destroy();
        }
      }
    );
    socket.on("error", () => finish({ daysRemaining: null, issuer: null }));
    socket.on("timeout", () => {
      socket.destroy();
      finish({ daysRemaining: null, issuer: null });
    });
  });
}

export interface RdapResult {
  daysRemaining: number | null;
  registrar: string | null;
}

export async function getDomainExpiryViaRdap(
  hostname: string
): Promise<RdapResult> {
  const labels = hostname.split(".");
  const domain =
    labels.length > 2 && !/^(co|com|org|net|gov|ac)\.[a-z]{2}$/i.test(labels.slice(-2).join("."))
      ? labels.slice(-2).join(".")
      : hostname;
  try {
    const res = await fetchWithTimeout(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      { timeoutMs: 8_000, redirect: "follow", headers: { accept: "application/rdap+json" } }
    );
    if (!res.ok) return { daysRemaining: null, registrar: null };
    const data = (await res.json()) as {
      events?: Array<{ eventAction?: string; eventDate?: string }>;
      entities?: Array<{ roles?: string[]; vcardArray?: unknown[] }>;
    };
    const expiration = data.events?.find((e) => e.eventAction === "expiration");
    let registrar: string | null = null;
    for (const ent of data.entities ?? []) {
      if (ent.roles?.includes("registrar")) {
        const vcard = ent.vcardArray?.[1];
        if (Array.isArray(vcard)) {
          for (const field of vcard as unknown[]) {
            if (Array.isArray(field) && field[0] === "fn" && typeof field[3] === "string") {
              registrar = field[3];
            }
          }
        }
      }
    }
    if (!expiration?.eventDate) return { daysRemaining: null, registrar };
    return { daysRemaining: daysUntil(expiration.eventDate), registrar };
  } catch {
    return { daysRemaining: null, registrar: null };
  }
}

async function checkUptime(
  url: string
): Promise<{ outcome: CheckOutcome; page: FetchedPage | null }> {
  try {
    const page = await fetchPage(url);
    if (page.status >= 400) {
      return {
        outcome: {
          checkKey: "uptime",
          status: "fail",
          value: `HTTP ${page.status}`,
          detail: "The homepage returned an error status.",
        },
        page,
      };
    }
    return {
      outcome: {
        checkKey: "uptime",
        status: "pass",
        value: `HTTP ${page.status}`,
        detail: `Responded in ${page.ttfbMs} ms.`,
      },
      page,
    };
  } catch {
    return {
      outcome: {
        checkKey: "uptime",
        status: "fail",
        value: "No response",
        detail: "The site did not respond within the timeout.",
      },
      page: null,
    };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function runSiteChecks(rawUrl: string): Promise<CheckOutcome[]> {
  const normalized = normalizeSiteUrl(rawUrl);
  if (!normalized.ok) {
    return [
      {
        checkKey: "uptime",
        status: "fail",
        value: "Invalid URL",
        detail: normalized.error,
      },
    ];
  }
  const { url, hostname } = normalized;
  const outcomes: CheckOutcome[] = [];

  const uptime = await checkUptime(url);
  outcomes.push(uptime.outcome);
  const page = uptime.page;

  if (page) {
    outcomes.push({
      checkKey: "ttfb",
      status: ttfbStatusFor(page.ttfbMs),
      value: `${page.ttfbMs} ms to first byte`,
      detail: `Total download ${page.totalMs} ms.`,
    });
    const htmlKb = Math.round(page.bytes / 1024);
    outcomes.push({
      checkKey: "weight",
      status: weightStatusFor(page.bytes),
      value: `${htmlKb} KB of HTML`,
      detail: "Size of the homepage document only.",
    });

    const h = scoreSecurityHeaders(page.headers);
    outcomes.push({
      checkKey: "headers",
      status: headersStatusFor(h.score),
      value: `${h.score}/${h.outOf} standard headers`,
      detail: h.missing.length
        ? `Missing: ${h.missing.join(", ")}.`
        : "All standard protective headers present.",
    });

    // robots + sitemap + favicon
    try {
      const robotsRes = await fetchWithTimeout(new URL("/robots.txt", page.finalUrl).toString(), {
        timeoutMs: 8_000,
      });
      if (robotsRes.ok) {
        const robotsText = await robotsRes.text();
        outcomes.push({
          checkKey: "robots",
          status: "pass",
          value: "Found",
          detail: "robots.txt is reachable.",
        });
        const sitemapUrl =
          findSitemapInRobots(robotsText) ??
          new URL("/sitemap.xml", page.finalUrl).toString();
        try {
          const sitemapRes = await fetchWithTimeout(sitemapUrl, { timeoutMs: 8_000 });
          outcomes.push({
            checkKey: "sitemap",
            status: sitemapRes.ok ? "pass" : "warn",
            value: sitemapRes.ok ? "Found" : "Not reachable",
            detail: sitemapRes.ok ? sitemapUrl : `Expected at ${sitemapUrl}.`,
          });
        } catch {
          outcomes.push({
            checkKey: "sitemap",
            status: "warn",
            value: "Not reachable",
            detail: `Expected at ${sitemapUrl}.`,
          });
        }
      } else {
        outcomes.push({
          checkKey: "robots",
          status: "warn",
          value: `HTTP ${robotsRes.status}`,
          detail: "No robots.txt was returned.",
        });
        outcomes.push({
          checkKey: "sitemap",
          status: "info",
          value: "Unknown",
          detail: "No robots.txt to declare a sitemap.",
        });
      }
    } catch {
      outcomes.push({
        checkKey: "robots",
        status: "warn",
        value: "Not reachable",
        detail: "robots.txt did not respond.",
      });
    }

    const faviconOk =
      hasFaviconLink(page.bodyText) ||
      (await fetchWithTimeout(new URL("/favicon.ico", page.finalUrl).toString(), {
        timeoutMs: 6_000,
      }).then((r) => r.ok).catch(() => false));
    outcomes.push({
      checkKey: "favicon",
      status: faviconOk ? "pass" : "warn",
      value: faviconOk ? "Configured" : "Not found",
      detail: faviconOk ? "" : "No favicon link tag and no /favicon.ico.",
    });

    // homepage link sample
    const links = extractLinks(page.bodyText, page.finalUrl);
    if (links.length === 0) {
      outcomes.push({
        checkKey: "links",
        status: "info",
        value: "No links found",
        detail: "The homepage exposes no crawlable links.",
      });
    } else {
      const broken: string[] = [];
      await mapWithConcurrency(links, 5, async (link) => {
        try {
          const res = await fetchWithTimeout(link, {
            timeoutMs: 8_000,
            redirect: "follow",
            method: "GET",
            headers: { range: "bytes=0-0" },
          });
          if (res.status >= 400) broken.push(link);
        } catch {
          broken.push(link);
        }
      });
      outcomes.push({
        checkKey: "links",
        status: linksStatusFor(broken.length, links.length),
        value: broken.length === 0 ? `${links.length} links OK` : `${broken.length} of ${links.length} broken`,
        detail: broken.length ? `Broken: ${broken.slice(0, 5).join(", ")}` : "",
      });
    }
  }

  // TLS certificate (direct, independent of HTTP layer)
  const tlsInfo = await getTlsExpiry(hostname);
  outcomes.push({
    checkKey: "ssl",
    status: sslStatusFor(tlsInfo.daysRemaining),
    value:
      tlsInfo.daysRemaining === null
        ? "Could not read certificate"
        : `Valid, ${tlsInfo.daysRemaining} days left`,
    detail: tlsInfo.issuer ? `Issuer: ${tlsInfo.issuer}.` : "",
  });

  // HTTP -> HTTPS redirect
  try {
    const httpUrl = url.replace(/^https:/, "http:");
    const res = await fetchWithTimeout(httpUrl, { timeoutMs: 8_000, redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    const redirectsUp = [301, 302, 307, 308].includes(res.status) && location.startsWith("https://");
    outcomes.push({
      checkKey: "httpsRedirect",
      status: redirectsUp ? "pass" : "fail",
      value: redirectsUp ? "Redirects to HTTPS" : `HTTP status ${res.status}`,
      detail: redirectsUp ? "" : "Visitors on http:// are not redirected to https://.",
    });
  } catch {
    outcomes.push({
      checkKey: "httpsRedirect",
      status: "pass",
      value: "No HTTP endpoint",
      detail: "Port 80 refused the connection; site is HTTPS-only.",
    });
  }

  // Domain expiry via RDAP (best effort)
  const rdap = await getDomainExpiryViaRdap(hostname);
  outcomes.push({
    checkKey: "domain",
    status: domainStatusFor(rdap.daysRemaining),
    value:
      rdap.daysRemaining === null
        ? "Registry did not answer"
        : `${rdap.daysRemaining} days until expiry`,
    detail: rdap.registrar ? `Registrar: ${rdap.registrar}.` : "",
  });

  // Stable display order
  const order = Object.keys(CHECK_META);
  return outcomes.sort(
    (a, b) => order.indexOf(a.checkKey) - order.indexOf(b.checkKey)
  );
}
