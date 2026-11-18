import express from "express";
import compression from "compression";
import path from "node:path";

const webDist = path.resolve(import.meta.dirname, "../web/dist");

// ===== Server Configuration =====
export function createApp({ fetcher = fetch, timeoutMs = 10_000, staticDirectory = webDist } = {}) {
  const app = express();
  app.use(compression());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "nextmusic" });
  });

  // ===== Apple Search Proxy =====
  app.get("/api/search", async (req, res) => {
    const term = typeof req.query.term === "string" ? req.query.term.trim() : "";
    if (!term || term.length > 200) {
      res.status(400).json({ error: "Enter a search term between 1 and 200 characters." });
      return;
    }

    const params = new URLSearchParams({ term, media: "music", entity: "musicArtist,album,song", country: "gb", limit: "100" });
    try {
      const response = await fetcher(`https://itunes.apple.com/search?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error(`iTunes responded with ${response.status}`);
      const data: unknown = await response.json();
      // Invalid upstream data must remain an error rather than appear as zero matches.
      if (typeof data !== "object" || data === null || !("results" in data) || !Array.isArray(data.results)) {
        throw new Error("iTunes returned an invalid result envelope");
      }
      res.json({ results: data.results });
    } catch {
      res.status(502).json({ error: "The iTunes catalogue is unavailable right now. Please try again." });
    }
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found." });
  });

  // ===== Production Asset Caching =====
  // Only versioned scripts and styles are immutable; HTML and unversioned files still revalidate.
  app.use(express.static(staticDirectory, {
    setHeaders(res, filePath) {
      if (/-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(path.basename(filePath))) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }));
  app.get("/{*route}", (req, res, next) => {
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(staticDirectory, "index.html"));
  });
  app.use((_req, res) => {
    res.status(404).json({ error: "Resource not found." });
  });
  return app;
}

if (import.meta.main) {
  const port = Number(process.env.PORT) || 3001;
  createApp().listen(port, () => console.log(`NextMusic running on http://localhost:${port}`));
}
