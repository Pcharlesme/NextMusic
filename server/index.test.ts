import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { createApp } from "./index.ts";
import vercelApp from "./api/index.ts";

const fetcher = vi.fn<typeof fetch>();
let server: Server;
let baseUrl: string;
let directory: string;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "nextmusic-server-test-"));
  await mkdir(path.join(directory, "assets"));
  await writeFile(path.join(directory, "index.html"), "<!doctype html><title>NextMusic test build</title>");
  await writeFile(path.join(directory, "assets/app.js"), "export const asset = true;");
  await writeFile(path.join(directory, "assets/main-abc12345.js"), "export const asset = true;\n".repeat(200));
  await writeFile(path.join(directory, "assets/main-abc12345.css"), ".test { color: black; }\n".repeat(200));
  const app = createApp({ fetcher, timeoutMs: 40, staticDirectory: directory });
  server = await new Promise<Server>((resolve, reject) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    listening.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

beforeEach(() => {
  fetcher.mockReset();
  fetcher.mockImplementation(async () => new Response(JSON.stringify({ results: [] })));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

afterAll(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("health and query validation", () => {
  it("reports health without contacting Apple", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each(["", "?term=", "?term=%20%20", `?term=${"a".repeat(201)}`, "?term[]=Adele", "?term=Adele&term=Coldplay"])(
    "rejects invalid search parameters %s before contacting Apple",
    async (query) => {
      const response = await fetch(`${baseUrl}/api/search${query}`);
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty("error");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("explains why repeated search terms are invalid", async () => {
    const response = await fetch(`${baseUrl}/api/search?term=Adele&term=Adele`);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Provide a single search term." });
  });
});

describe("Apple search proxy", () => {
  it("encodes a trimmed term and preserves all returned result types", async () => {
    const results = [{ wrapperType: "artist", artistId: 1 }, { wrapperType: "collection", collectionId: 2 }, { wrapperType: "track", kind: "song", trackId: 3 }];
    fetcher.mockResolvedValue(new Response(JSON.stringify({ results })));
    const response = await fetch(`${baseUrl}/api/search?${new URLSearchParams({ term: " Adele & friends " })}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.origin).toBe("https://itunes.apple.com");
    expect(url.pathname).toBe("/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({ term: "Adele & friends", media: "music", entity: "musicArtist,album,song", country: "gb", limit: "100" });
    expect(fetcher.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("accepts a term at the length boundary", async () => {
    const response = await fetch(`${baseUrl}/api/search?term=${"a".repeat(200)}`);
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("preserves a successful empty result", async () => {
    const response = await fetch(`${baseUrl}/api/search?term=unmatched`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [] });
  });

  it.each([null, {}, { results: null }, { results: "invalid" }])("treats an invalid envelope as an error: %j", async (body) => {
    fetcher.mockResolvedValue(new Response(JSON.stringify(body)));
    const response = await fetch(`${baseUrl}/api/search?term=Adele`);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Could not reach iTunes. Please try again." });
  });

  it("handles invalid JSON", async () => {
    fetcher.mockResolvedValue(new Response("invalid JSON"));
    expect((await fetch(`${baseUrl}/api/search?term=Adele`)).status).toBe(502);
  });

  it("does not expose upstream error details", async () => {
    fetcher.mockResolvedValue(new Response(JSON.stringify({ privateDetail: "upstream secret" }), { status: 503 }));
    const response = await fetch(`${baseUrl}/api/search?term=Adele`);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("upstream secret");
  });

  it("handles network failures", async () => {
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

describe("production serving", () => {
  it.each(["/", "/search/results"])("serves the frontend for %s", async (route) => {
    const response = await fetch(baseUrl + route);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toContain("NextMusic test build");
  });

  it("serves real assets", async () => {
    const response = await fetch(`${baseUrl}/assets/app.js`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("export const asset = true;");
  });

  it("keeps unknown API routes separate from the frontend", async () => {
    const response = await fetch(`${baseUrl}/api/unknown`);
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("does not return the frontend for missing assets", async () => {
    const response = await fetch(`${baseUrl}/assets/missing.js`);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("NextMusic test build");
  });

  it("rejects unsupported search methods", async () => {
    expect((await fetch(`${baseUrl}/api/search`, { method: "POST" })).status).toBe(404);
  });

  it.each(["js", "css"])("compresses versioned %s without changing its contents", async (extension) => {
    const route = `${baseUrl}/assets/main-abc12345.${extension}`;
    const compressed = await fetch(route, { headers: { "Accept-Encoding": "gzip" } });
    const original = await fetch(route, { headers: { "Accept-Encoding": "identity" } });
    expect(compressed.headers.get("content-encoding")).toBe("gzip");
    expect(compressed.headers.get("vary")).toContain("Accept-Encoding");
    expect(original.headers.get("content-encoding")).toBeNull();
    expect(await compressed.text()).toBe(await original.text());
  });

  it.each(["js", "css"])("caches versioned %s immutably", async (extension) => {
    const response = await fetch(`${baseUrl}/assets/main-abc12345.${extension}`);
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });

  it.each(["/", "/search/results", "/assets/app.js"])("keeps %s revalidatable", async (route) => {
    const response = await fetch(baseUrl + route);
    expect(response.headers.get("cache-control")).toContain("max-age=0");
    expect(response.headers.get("cache-control")).not.toContain("immutable");
  });

  it("does not cache API results as immutable assets", async () => {
    const response = await fetch(`${baseUrl}/api/search?term=Adele`);
    expect(response.headers.get("cache-control") || "").not.toContain("immutable");
  });
});

describe("Vercel adapter", () => {
  let adapterServer: Server;
  let adapterUrl: string;

  beforeAll(async () => {
    adapterServer = await new Promise<Server>((resolve, reject) => {
      const listening = vercelApp.listen(0, "127.0.0.1", () => resolve(listening));
      listening.once("error", reject);
    });
    adapterUrl = `http://127.0.0.1:${(adapterServer.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (adapterServer) await new Promise<void>((resolve, reject) => adapterServer.close((error) => error ? reject(error) : resolve()));
  });

  it("emits imports matching the packaged JavaScript files", async () => {
    const config = ts.readConfigFile(path.join(import.meta.dirname, "tsconfig.json"), ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, import.meta.dirname);
    const entry = path.join(import.meta.dirname, "api/index.ts");
    const emitted = ts.transpileModule(await readFile(entry, "utf8"), { fileName: entry, compilerOptions: parsed.options }).outputText;
    expect(emitted).toContain('"../index.js"');
    expect(emitted).not.toContain('"../index.ts"');
  });

  it("exports a callable app serving the shared health route", async () => {
    expect(typeof vercelApp).toBe("function");
    const response = await fetch(`${adapterUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("preserves validation and API route boundaries", async () => {
    expect((await fetch(`${adapterUrl}/api/search?term=Adele&term=Coldplay`)).status).toBe(400);
    const response = await fetch(`${adapterUrl}/api/unknown`);
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});
