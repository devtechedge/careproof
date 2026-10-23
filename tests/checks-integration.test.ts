import http from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGuard, type GuardResolver } from "@/lib/net-guard";
import { runSiteChecks } from "@/lib/checks";

// Hostile-input integration: runSiteChecks against controlled loopback
// fixtures through an injected test guard. No third-party site is touched.

let server: http.Server;
let port: number;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    res.on("error", () => undefined);
    if (req.url === "/unreachable-alias") {
      // guard rejects this hostname's resolution; never reached
      res.writeHead(200);
      res.end("should not happen");
      return;
    }
    if (req.url === "/slow-page") {
      setTimeout(() => {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<html></html>");
      }, 10_000);
      return;
    }
    if (req.url === "/garbage") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body><a href='/a'>a</a><a href='http://broken.test/x'>x</a>");
      return;
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html><head><link rel='icon' href='/i.png'></head><body>ok</body></html>");
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as { port: number }).port;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

const resolveLoopback: GuardResolver = async () => [{ address: "127.0.0.1", family: 4 }];

function fixtureGuard() {
  return createGuard({
    resolver: resolveLoopback,
    testAllowResolvedIp: (ip) => ip === "127.0.0.1",
    testExtraAllowedPorts: [port],
  });
}

describe("runSiteChecks against fixtures", () => {
  it("reports dependent checks as explicit skipped-info rows when the homepage is unreachable", async () => {
    const guard = createGuard({
      // hostname resolves to a prohibited address: homepage fetch fails
      resolver: async () => [{ address: "10.9.9.9", family: 4 }],
    });
    const outcomes = await runSiteChecks("https://unreachable-host.example/", guard);
    const byKey = Object.fromEntries(outcomes.map((o) => [o.checkKey, o]));
    expect(byKey.uptime.status).toBe("fail");
    for (const key of ["ttfb", "weight", "headers", "robots", "sitemap", "favicon", "links"]) {
      expect(byKey[key]?.status, key).toBe("info");
      expect(byKey[key]?.value, key).toBe("Not assessed");
    }
    // independent checks still attempted
    expect(byKey.ssl).toBeDefined();
    expect(byKey.httpsRedirect).toBeDefined();
    expect(byKey.domain).toBeDefined();
  }, 30_000);

  it("runs the full row set on a reachable fixture page", async () => {
    const outcomes = await runSiteChecks(`http://ok-site.example:${port}/`, fixtureGuard());
    const keys = outcomes.map((o) => o.checkKey);
    expect(keys).toEqual(expect.arrayContaining(["uptime", "ttfb", "weight", "headers", "robots", "sitemap", "favicon", "links"]));
    expect(outcomes).toHaveLength(11);
  }, 30_000);

  it("classifies a malformed page without crashing", async () => {
    const outcomes = await runSiteChecks(`http://ok-site.example:${port}/garbage`, fixtureGuard());
    const byKey = Object.fromEntries(outcomes.map((o) => [o.checkKey, o]));
    expect(byKey.uptime.status).toBe("pass");
    expect(["pass", "warn", "fail"]).toContain(byKey.links.status);
  }, 30_000);

  it("sorts outcomes into the stable documented order", async () => {
    const outcomes = await runSiteChecks(`http://ok-site.example:${port}/`, fixtureGuard());
    const keys = outcomes.map((o) => o.checkKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  }, 30_000);
});
