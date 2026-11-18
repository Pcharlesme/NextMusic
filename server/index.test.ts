import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "./index.ts";

// ===== Isolated Express Endpoint Tests =====
// Send real HTTP requests to Express while replacing only the external Apple dependency.
const fetcher = vi.fn<typeof fetch>();
let server: Server;
let baseUrl: string;
let directory: string;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "nextmusic-server-test-"));
  await mkdir(path.join(directory, "assets"));
  await writeFile(path.join(directory, "index.html"), "<!doctype html><title>NextMusic test build</title>");
  await writeFile(path.join(directory, "assets", "app.js"), "console.log('test asset');");
  await writeFile(path.join(directory, "assets", "main-abc12345.js"), "console.log('compressed asset');\n".repeat(200));
  await writeFile(path.join(directory, "assets", "main-abc12345.css"), ".test { color: black; }\n".repeat(200));
  const app = createApp({ fetcher, timeoutMs: 25, staticDirectory: directory });
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
beforeEach(() => {
  fetcher.mockReset();
  fetcher.mockImplementation(async () => new Response(JSON.stringify({ results: [] })));
});
afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (directory) await rm(directory, { recursive: true, force: true });
});

// ===== Health and Query Validation =====
describe("health and query validation", () => {
  it("reports health without contacting Apple", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", service: "nextmusic" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["", "?term=", "?term=%20%20", `?term=${"a".repeat(201)}`, "?term=Adele&term=Coldplay"])("rejects invalid query %s", async (query) => {
    const response = await fetch(`${baseUrl}/api/search${query}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty("error");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

// ===== Apple Search Integration =====
describe("search proxy", () => {
  it("forwards a trimmed, encoded query and returns all supplied result types", async () => {
    const results = [{ wrapperType: "artist", artistId: 1 }, { wrapperType: "collection", collectionId: 2 }, { wrapperType: "track", kind: "song", trackId: 3 }];
    fetcher.mockResolvedValue(new Response(JSON.stringify({ results })));
    const response = await fetch(`${baseUrl}/api/search?${new URLSearchParams({ term: " Adele & friends " })}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results });
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.origin).toBe("https://itunes.apple.com");
    expect(url.pathname).toBe("/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({ term: "Adele & friends", media: "music", entity: "musicArtist,album,song", country: "gb", limit: "50" });
    expect(fetcher.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });
  it("preserves a successful empty result", async () => {
    const response = await fetch(`${baseUrl}/api/search?term=unmatched`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [] });
  });
  it.each([null, {}, { results: null }, { results: "invalid" }])("rejects invalid envelopes rather than reporting no matches: %j", async (body) => {
    fetcher.mockResolvedValue(new Response(JSON.stringify(body)));
    expect((await fetch(`${baseUrl}/api/search?term=Adele`)).status).toBe(502);
  });
  it("handles invalid JSON", async () => {
    fetcher.mockResolvedValue(new Response("invalid JSON"));
    expect((await fetch(`${baseUrl}/api/search?term=Adele`)).status).toBe(502);
  });
  it("handles unsuccessful upstream responses without leaking details", async () => {
    fetcher.mockResolvedValue(new Response("private upstream detail", { status: 503 }));
    const response = await fetch(`${baseUrl}/api/search?term=Adele`);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private upstream detail");
  });
  it("handles network errors", async () => {
    fetcher.mockRejectedValue(new Error("connection refused"));
    expect((await fetch(`${baseUrl}/api/search?term=Adele`)).status).toBe(502);
  });
  it("aborts a stalled upstream request", async () => {
    fetcher.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
      const signal = options?.signal;
      if (signal?.aborted) reject(signal.reason);
      else signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    }));
    expect((await fetch(`${baseUrl}/api/search?term=Adele`)).status).toBe(502);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});

// ===== Static Files and Route Boundaries =====
describe("production serving", () => {
  it.each(["/", "/search/results"])("serves the React entry page for %s", async (route) => {
    const response = await fetch(baseUrl + route);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("NextMusic test build");
  });
  it("serves real assets", async () => {
    const response = await fetch(`${baseUrl}/assets/app.js`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("test asset");
  });
  it.each(["/api/unknown", "/assets/missing.js"])("does not return HTML for missing resource %s", async (route) => {
    const response = await fetch(baseUrl + route);
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
  it("does not serve the page for unsupported HTTP methods", async () => {
    const response = await fetch(`${baseUrl}/api/search`, { method: "POST" });
    expect(response.status).toBe(404);
  });
});

describe("production delivery", () => {
  it.each(["js", "css"])("compresses versioned %s without changing its contents", async (extension) => {
    const route = `${baseUrl}/assets/main-abc12345.${extension}`;
    const compressed = await fetch(route, { headers: { "Accept-Encoding": "gzip" } });
    expect(compressed.headers.get("content-encoding")).toBe("gzip");
    expect(compressed.headers.get("vary")).toContain("Accept-Encoding");
    const original = await fetch(route, { headers: { "Accept-Encoding": "identity" } });
    expect(original.headers.get("content-encoding")).toBeNull();
    expect(await compressed.text()).toBe(await original.text());
  });

  it.each(["js", "css"])("caches versioned %s with immutable content", async (extension) => {
    const response = await fetch(`${baseUrl}/assets/main-abc12345.${extension}`);
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it.each(["/", "/search/results", "/assets/app.js"])("keeps %s revalidatable", async (route) => {
    const response = await fetch(baseUrl + route);
    expect(response.headers.get("cache-control")).toContain("max-age=0");
    expect(response.headers.get("cache-control")).not.toContain("immutable");
  });

  it("does not apply the immutable asset policy to API responses", async () => {
    const response = await fetch(`${baseUrl}/api/search?term=Adele`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control") || "").not.toContain("immutable");
  });
});
