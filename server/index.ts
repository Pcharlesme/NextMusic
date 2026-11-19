import express from "express";
import compression from "compression";
import path from "node:path";

const webDist = path.resolve(import.meta.dirname, "../web/dist");
const ITUNES_URL = "https://itunes.apple.com/search";

export function createApp({ fetcher = fetch, timeoutMs = 10000, staticDirectory = webDist } = {}) {
  const app = express();
  app.use(compression());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/search", async (req, res) => {
    if (typeof req.query.term !== "string") {
      return res.status(400).json({ error: "Provide a single search term." });
    }
    const term = req.query.term.trim();

    if (!term || term.length > 200) {
      return res.status(400).json({ error: "Search term must be between 1 and 200 characters." });
    }

    const params = new URLSearchParams({
      term,
      media: "music",
      entity: "musicArtist,album,song",
      country: "gb",
      limit: "100",
    });

    try {
      const response = await fetcher(`${ITUNES_URL}?${params}`, { signal: AbortSignal.timeout(timeoutMs) });
      const data = (await response.json()) as { results?: unknown[] };

      if (!response.ok || !Array.isArray(data.results)) {
        throw new Error("Bad response from iTunes");
      }

      res.json({ results: data.results });
    } catch (error) {
      console.error("Search failed:", error);
      res.status(502).json({ error: "Could not reach iTunes. Please try again." });
    }
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(
    express.static(staticDirectory, {
      setHeaders(res, filePath) {
        if (/-[\w-]{8,}\.(js|css)$/.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  app.get("/{*route}", (req, res, next) => {
    if (path.extname(req.path)) return next();
    res.sendFile(path.join(staticDirectory, "index.html"));
  });

  return app;
}

if (import.meta.main) {
  const port = process.env.PORT || 3001;
  createApp().listen(port, () => console.log(`Server running on http://localhost:${port}`));
}
