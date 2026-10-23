import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  GuardError,
  assertSafeUrl,
  createGuard,
  isProhibitedIp,
  type GuardResolver,
} from "@/lib/net-guard";
import { fetchPage, httpsRedirectOutcome } from "@/lib/checks";

// These tests make no database calls and touch no external systems: the only
// network endpoints involved are loopback test servers that the guard is
// supposed to REFUSE (or, in redirect tests, an explicitly-overridden origin).

describe("isProhibitedIp", () => {
  const prohibited = [
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.7", // CGNAT
    "127.0.0.1",
    "127.8.8.8", // whole 127/8 loopback
    "169.254.169.254", // cloud metadata
    "169.254.0.99",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.10",
    "192.0.0.9",
    "192.0.2.10", // TEST-NET-1
    "198.18.0.5",
    "198.51.100.7",
    "203.0.113.7",
    "224.0.0.1", // multicast
    "239.255.255.250",
    "240.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:127.0.0.1", // IPv4-mapped loopback
    "::ffff:10.0.0.5", // IPv4-mapped private
    "fe80::1", // link-local
    "fc00::123", // ULA
    "fd12:3456:789a::1",
    "ff02::1", // multicast
    "2001:db8::1", // documentation
  ];
  const allowed = ["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111", "2a00:1450:4001:81b::200e"];

  it.each(prohibited)("prohibits %s", (ip) => {
    expect(isProhibitedIp(ip)).toBe(true);
  });
  it.each(allowed)("allows %s", (ip) => {
    expect(isProhibitedIp(ip)).toBe(false);
  });
  it("prohibits unparseable input (fail closed)", () => {
    expect(isProhibitedIp("not-an-ip")).toBe(true);
    expect(isProhibitedIp("")).toBe(true);
  });
});

describe("assertSafeUrl", () => {
  const rejected = [
    "http://localhost/x",
    "http://localhost:3000/",
    "http://127.0.0.1/",
    "http://10.0.0.5/",
    "http://192.168.1.1/admin",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[::ffff:10.0.0.1]/",
    "http://0x7f000001/", // hex IPv4 -> normalizes to 127.0.0.1
    "http://2130706433/", // integer IPv4 -> normalizes to 127.0.0.1
    "http://0177.0.0.1/", // octal IPv4 -> 127.0.0.1
    "http://printer.local/",
    "http://intranet.internal/",
    "http://something.onion/",
    "http://intranet/", // dotless internal name
    "ftp://example.com/",
    "file:///etc/passwd",
    "https://user:pass@example.com/",
    "https://example.com:22/",
    "https://example.com:8080/",
    "not a url",
  ];
  it.each(rejected)("rejects %s", (u) => {
    expect(() => assertSafeUrl(u)).toThrow(GuardError);
  });

  it("canonicalizes alternative IPv4 notations before rejecting", () => {
    // The WHATWG parser normalizes these to dotted 127.0.0.1, which is then prohibited.
    expect(new URL("http://0x7f000001/").hostname).toBe("127.0.0.1");
    expect(new URL("http://2130706433/").hostname).toBe("127.0.0.1");
  });

  it("accepts public destinations and explicit allowed ports", () => {
    expect(assertSafeUrl("https://example.com/path").url).toBe("https://example.com/path");
    expect(assertSafeUrl("http://example.com:80/").hostname).toBe("example.com");
    expect(assertSafeUrl("https://example.com:443/").hostname).toBe("example.com");
  });
});

describe("guarded connections actually prevent prohibited egress", () => {
  let server: http.Server;
  let port: number;
  let hits: number;

  beforeAll(async () => {
    hits = 0;
    server = http.createServer((req, res) => {
      hits += 1;
      if (req.url === "/redirect-to-metadata") {
        res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" });
        res.end();
        return;
      }
      if (req.url === "/loop-forever") {
        res.writeHead(302, { location: "http://origin.example:" + port + "/loop-forever" });
        res.end();
        return;
      }
      if (req.url === "/slow") {
        res.writeHead(200);
        setTimeout(() => res.end("finally"), 5_000);
        res.on("error", () => undefined);
        return;
      }
      if (req.url === "/huge") {
        res.writeHead(200, { "content-type": "text/html" });
        const chunk = "x".repeat(64 * 1024);
        let sent = 0;
        const timer = setInterval(() => {
          res.write(chunk);
          sent += chunk.length;
          if (sent >= 6 * 1024 * 1024) {
            clearInterval(timer);
            res.end();
          }
        }, 5);
        res.on("close", () => clearInterval(timer));
        res.on("error", () => clearInterval(timer));
        return;
      }
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body>ok</body></html>");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    port = (server.address() as { port: number }).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const resolveLoopback: GuardResolver = async () => [{ address: "127.0.0.1", family: 4 }];

  it("refuses a hostname whose DNS resolves to loopback; server receives zero requests", async () => {
    const guard = createGuard({ resolver: resolveLoopback });
    await expect(
      guard.fetch(`http://origin.example/`, { timeoutMs: 3_000 })
    ).rejects.toThrow();
    expect(hits).toBe(0);
  });

  it("refuses when ANY resolved address is prohibited (split DNS / rebinding shape)", async () => {
    const guard = createGuard({
      resolver: async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.9", family: 4 },
      ],
    });
    let err: unknown;
    await guard.fetch("http://mixed.example/", { timeoutMs: 3_000 }).then(
      () => {
        throw new Error("connection was not refused");
      },
      (e) => {
        err = e;
      }
    );
    const chain = `${(err as Error)?.message ?? ""} ${((err as Error)?.cause as Error)?.message ?? ""}`;
    expect(chain).toMatch(/prohibited|address/i);
    expect(hits).toBe(0);
  });

  it("blocks redirects to cloud metadata at the hop, before any second connection", async () => {
    // Origin is explicitly allowed for the test (loopback); the redirect
    // target is an IP literal and must be rejected by assertSafeUrl.
    const guard = createGuard({
      resolver: resolveLoopback,
      testAllowResolvedIp: (ip) => ip === "127.0.0.1",
      testExtraAllowedPorts: [port],
    });
    await expect(
      guard.fetch(`http://origin.example:${port}/redirect-to-metadata`, { timeoutMs: 3_000 })
    ).rejects.toThrow(GuardError);
    expect(hits).toBe(1); // origin hit; metadata endpoint never contacted
  });

  it("stops redirect loops within the hop limit", async () => {
    const guard = createGuard({
      resolver: resolveLoopback,
      testAllowResolvedIp: (ip) => ip === "127.0.0.1",
      testExtraAllowedPorts: [port],
    });
    await expect(
      guard.fetch(`http://origin.example:${port}/loop-forever`, { timeoutMs: 5_000 })
    ).rejects.toThrow(/Too many redirects|redirect/i);
  });

  it("enforces the total timeout against a slow origin", async () => {
    const guard = createGuard({
      resolver: resolveLoopback,
      testAllowResolvedIp: (ip) => ip === "127.0.0.1",
      testExtraAllowedPorts: [port],
    });
    const start = Date.now();
    await expect(
      guard.fetch(`http://origin.example:${port}/slow`, { timeoutMs: 600 })
    ).rejects.toThrow();
    expect(Date.now() - start).toBeLessThan(3_000);
  });

  it("fetchPage caps downloaded bytes and cancels the stream", async () => {
    const testGuard = createGuard({
      resolver: resolveLoopback,
      testAllowResolvedIp: (ip) => ip === "127.0.0.1",
      testExtraAllowedPorts: [port],
    });
    const page = await fetchPage(`http://origin.example:${port}/huge`, 10_000, testGuard);
    expect(page.bytes).toBeLessThanOrEqual(2 * 1024 * 1024 + 64 * 1024);
    expect(page.status).toBe(200);
  }, 20_000);
});

describe("httpsRedirectOutcome semantics", () => {
  it("treats an unreachable HTTP endpoint as unknown, never pass", () => {
    const o = httpsRedirectOutcome({ errored: true });
    expect(o.status).toBe("info");
    expect(o.value).toContain("unreachable");
  });
  it("passes only an observed 3xx to https", () => {
    expect(httpsRedirectOutcome({ status: 301, location: "https://x.example/" }).status).toBe("pass");
    expect(httpsRedirectOutcome({ status: 308, location: "https://x.example/a" }).status).toBe("pass");
  });
  it("fails 200-on-http and 3xx to http", () => {
    expect(httpsRedirectOutcome({ status: 200, location: null }).status).toBe("fail");
    expect(httpsRedirectOutcome({ status: 301, location: "http://x.example/" }).status).toBe("fail");
    expect(httpsRedirectOutcome({ status: 302, location: null }).status).toBe("fail");
  });
});
