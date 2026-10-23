// Input validation and SSRF guards for user-supplied URLs.

const PRIVATE_V4 =
  /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

export interface NormalizedUrl {
  ok: true;
  url: string;
  origin: string;
  hostname: string;
}

export type UrlResult = { ok: false; error: string } | NormalizedUrl;

/**
 * Accepts "example.com" or "https://example.com/path" and returns a normalized
 * https URL. Blocks obvious SSRF targets: localhost, .local, .internal, .onion,
 * IPv6 literals, private/loopback/link-local IPv4 ranges, and hostnames without
 * a dot. This is a guard, not full SSRF protection; DNS-level re-checking is a
 * documented limitation (see README).
 */
export function normalizeSiteUrl(input: string): UrlResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Enter a site URL." };
  if (trimmed.length > 2000) return { ok: false, error: "URL is too long." };

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "That does not look like a valid URL." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only http and https URLs are supported." };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: "URLs with credentials are not allowed." };
  }

  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) {
    return { ok: false, error: "Local addresses are not allowed." };
  }
  if (!host.includes(".")) {
    return { ok: false, error: "Enter a full domain, for example example.com." };
  }
  if (
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".onion")
  ) {
    return { ok: false, error: "Internal addresses are not allowed." };
  }
  if (host.includes(":")) {
    return { ok: false, error: "IPv6 addresses are not allowed." };
  }
  if (PRIVATE_V4.test(host)) {
    return { ok: false, error: "Private network addresses are not allowed." };
  }

  const normalized = new URL(parsed.toString());
  normalized.hash = "";
  return {
    ok: true,
    url: normalized.toString(),
    origin: normalized.origin,
    hostname: host,
  };
}

export function cleanText(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}
