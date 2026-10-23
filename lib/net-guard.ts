import dns from "node:dns";
import type { LookupFunction } from "node:net";
import tls from "node:tls";
import { Agent, fetch as undiciFetch } from "undici";
import ipaddr from "ipaddr.js";

/**
 * Centralized outbound-request security layer.
 *
 * Every server-side network operation in CareProof goes through a guard created
 * here. The guard:
 *  - canonicalizes and validates the destination URL (scheme, credentials, port),
 *  - resolves DNS through a guarded lookup that rejects prohibited addresses and
 *    pins the connection to a validated address (the lookup IS the connection's
 *    lookup, so there is no validation-to-connection gap / DNS-rebinding window),
 *  - validates every redirect hop before following it,
 *  - enforces connect/body/total timeouts.
 *
 * Fail closed: any destination that cannot be validated throws GuardError.
 */

export class GuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardError";
  }
}

const ALLOWED_PORTS = new Set([80, 443]);
export const MAX_REDIRECTS = 5;

// Special-use IPv4 ranges: unspecified, private, CGNAT, loopback, link-local
// (incl. cloud metadata 169.254.169.254), shared address space, documentation,
// benchmarking, multicast, reserved.
const V4_CIDRS = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.168.0.0/16",
  "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4",
  "240.0.0.0/4", "255.255.255.255/32",
].map((c) => ipaddr.parseCIDR(c));

// IPv6: unspecified, loopback, IPv4-compatible (deprecated, blocked), NAT64
// local-use, discard-only, documentation, 6to4 (encapsulates IPv4), ULA,
// link-local, multicast.
const V6_CIDRS = [
  "::/128", "::1/128", "::/96", "64:ff9b:1::/48", "100::/64", "2001:db8::/32",
  "2002::/16", "fc00::/7", "fe80::/10", "ff00::/8",
].map((c) => ipaddr.parseCIDR(c));

/** True when the address must never be an outbound destination. Unparseable input is prohibited (fail closed). */
export function isProhibitedIp(raw: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(raw);
  } catch {
    return true;
  }
  if (addr.kind() === "ipv6") {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      try {
        addr = v6.toIPv4Address();
      } catch {
        return true;
      }
    }
  }
  const cidrs = addr.kind() === "ipv4" ? V4_CIDRS : V6_CIDRS;
  return cidrs.some((cidr) => addr.match(cidr));
}

export interface ParsedDestination {
  url: string;
  hostname: string;
}

/**
 * Canonicalize and validate a destination URL. The WHATWG URL parser
 * normalizes alternative IPv4 notations (hex, octal, integer) to dotted form,
 * so ipaddr sees the real address. IPv6 literals in URLs are always rejected
 * (bracketed hostnames); IPv6 hostnames reachable via DNS are still allowed
 * when they resolve to public addresses.
 */
export function assertSafeUrl(input: string, extraAllowedPorts: number[] = []): ParsedDestination {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new GuardError("Invalid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new GuardError("Only http and https destinations are allowed.");
  }
  if (parsed.username || parsed.password) {
    throw new GuardError("URLs with embedded credentials are not allowed.");
  }
  const port = parsed.port === "" ? null : Number(parsed.port);
  if (port !== null && !ALLOWED_PORTS.has(port) && !extraAllowedPorts.includes(port)) {
    throw new GuardError(`Port ${parsed.port} is not allowed.`);
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[")) {
    throw new GuardError("IPv6 literal destinations are not allowed.");
  }
  if (host === "" || host.includes(":")) {
    throw new GuardError("Invalid destination hostname.");
  }
  if (ipaddr.isValid(host)) {
    if (isProhibitedIp(host)) {
      throw new GuardError("That address is not a permitted destination.");
    }
  } else {
    // A DNS name: dotless names (intranet, container names) are prohibited.
    if (!host.includes(".")) {
      throw new GuardError("Destination must be a full public domain name.");
    }
    if (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".onion")
    ) {
      throw new GuardError("Internal destination names are not allowed.");
    }
  }
  return { url: parsed.toString(), hostname: host };
}

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export type GuardResolver = (hostname: string) => Promise<ResolvedAddress[]>;

const defaultResolver: GuardResolver = async (hostname) => {
  const results = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return results.map((r) => ({ address: r.address, family: r.family as 4 | 6 }));
};

export interface GuardOptions {
  resolver?: GuardResolver;
  connectTimeoutMs?: number;
  /**
   * TEST-ONLY hooks: relax the resolved-address check and the port allowlist
   * so integration tests can run a local origin server on loopback with an
   * ephemeral port. Prohibited URL literals (IP literals, localhost, private
   * hosts in the URL text) are always rejected regardless.
   */
  testAllowResolvedIp?: (ip: string) => boolean;
  testExtraAllowedPorts?: number[];
}

export interface SecureFetchInit {
  timeoutMs?: number;
  method?: string;
  headers?: Record<string, string>;
  redirect?: "follow" | "manual";
}

export interface SecureFetchResponse {
  status: number;
  ok: boolean;
  url: string;
  headers: { get(name: string): string | null };
  body: ReadableStream<Uint8Array> | null;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

export interface NetGuard {
  fetch(url: string, init?: SecureFetchInit): Promise<SecureFetchResponse>;
  resolveHost(hostname: string): Promise<ResolvedAddress>;
  connectTls(hostname: string, timeoutMs: number): Promise<tls.TLSSocket>;
}

export function createGuard(options: GuardOptions = {}): NetGuard {
  const resolver = options.resolver ?? defaultResolver;
  const connectTimeoutMs = options.connectTimeoutMs ?? 10_000;

  const resolvedIpAllowed = (ip: string): boolean =>
    options.testAllowResolvedIp ? options.testAllowResolvedIp(ip) : !isProhibitedIp(ip);

  // The guarded lookup runs as the connect-time lookup of the outbound agent:
  // the address it returns is the address actually connected to, so DNS
  // rebinding between validation and connection has no window.
  const guardedLookup: LookupFunction = (hostname, opts, callback) => {
    resolver(hostname).then((addrs) => {
      try {
        if (addrs.length === 0) {
          callback(new GuardError(`No address resolved for ${hostname}.`), "");
          return;
        }
        if (!addrs.every((a) => resolvedIpAllowed(a.address))) {
          callback(
            new GuardError(`Refusing to connect to a prohibited address for ${hostname}.`),
            ""
          );
          return;
        }
        const chosen = addrs[0];
        // Node's Happy Eyeballs path calls lookup with { all: true } and
        // expects an array back; the classic path wants (address, family).
        if ((opts as { all?: boolean } | undefined)?.all) {
          (callback as unknown as (
            err: Error | null,
            addresses: Array<{ address: string; family: number }>
          ) => void)(null, [{ address: chosen.address, family: chosen.family }]);
        } else {
          (callback as unknown as (
            err: Error | null,
            address: string,
            family: number
          ) => void)(null, chosen.address, chosen.family);
        }
      } catch (err) {
        callback(err as Error, "");
      }
    }).catch((err) => callback(err as Error, ""));
  };

  const agent = new Agent({
    connect: { timeout: connectTimeoutMs, lookup: guardedLookup },
  });

  const extraPorts = options.testExtraAllowedPorts ?? [];

  async function fetchOne(url: string, init: SecureFetchInit, signal: AbortSignal): Promise<SecureFetchResponse> {
    const dest = assertSafeUrl(url, extraPorts);
    const res = await undiciFetch(dest.url, {
      method: init.method ?? "GET",
      headers: init.headers,
      redirect: "manual",
      dispatcher: agent,
      signal,
    });
    return res as unknown as SecureFetchResponse;
  }

  async function fetch(url: string, init: SecureFetchInit = {}): Promise<SecureFetchResponse> {
    const timeoutMs = init.timeoutMs ?? 12_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let res = await fetchOne(url, init, controller.signal);
      if (init.redirect !== "manual") {
        let hops = 0;
        const visited = url;
        while ([301, 302, 303, 307, 308].includes(res.status)) {
          if (hops >= MAX_REDIRECTS) {
            throw new GuardError("Too many redirects.");
          }
          const location = res.headers.get("location");
          if (!location) break;
          let next: URL;
          try {
            next = new URL(location, visited);
          } catch {
            throw new GuardError("Redirect carried an invalid destination.");
          }
          // Validate the hop before following it (throws GuardError if prohibited).
          const approved = assertSafeUrl(next.toString(), extraPorts);
          try {
            await res.body?.cancel();
          } catch {
            // body may already be closed
          }
          res = await fetchOne(approved.url, init, controller.signal);
          hops += 1;
        }
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  async function resolveHost(hostname: string): Promise<ResolvedAddress> {
    const addrs = await resolver(hostname);
    if (addrs.length === 0) throw new GuardError(`No address resolved for ${hostname}.`);
    if (!addrs.every((a) => resolvedIpAllowed(a.address))) {
      throw new GuardError(`Refusing a prohibited address for ${hostname}.`);
    }
    return addrs[0];
  }

  async function connectTls(hostname: string, timeoutMs: number): Promise<tls.TLSSocket> {
    // Validate the hostname form, then pin the connection to a resolved,
    // validated address while preserving SNI (servername) for cert verification.
    assertSafeUrl(`https://${hostname}/`);
    const addr = await resolveHost(hostname);
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (err: Error | null, socket?: tls.TLSSocket) => {
        if (!settled) {
          settled = true;
          if (err) reject(err);
          else resolve(socket as tls.TLSSocket);
        }
      };
      const socket = tls.connect(
        {
          host: addr.address,
          port: 443,
          servername: hostname,
          timeout: timeoutMs,
          rejectUnauthorized: true,
        },
        () => finish(null, socket)
      );
      socket.on("error", (err) => finish(err as Error));
      socket.on("timeout", () => {
        socket.destroy();
        finish(new GuardError("TLS connection timed out."));
      });
    });
  }

  return { fetch, resolveHost, connectTls };
}

export const netGuard = createGuard();
