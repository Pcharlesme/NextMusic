import express from "express";
import path from "node:path";

const port = Number(process.env.PORT) || 3001;
const webDist = path.resolve(import.meta.dirname, "../web/dist");

const app = express();

app.get("/api/search", async (req, res) => {
  const term = typeof req.query.term === "string" ? req.query.term.trim() : "";
  if (!term || term.length > 200) {
    res.status(400).json({ error: "Enter a search term between 1 and 200 characters." });
    return;
  }

  const params = new URLSearchParams({ term, media: "music", entity: "musicArtist,album,song", country: "gb", limit: "50" });

  try {
    const response = await fetch(`https://itunes.apple.com/search?${params}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`iTunes responded with ${response.status}`);
    const data = (await response.json()) as { results?: unknown };
    res.json({ results: Array.isArray(data.results) ? data.results : [] });
  } catch (error) {
    console.error("Search failed:", error);
    res.status(502).json({ error: "The iTunes catalogue is unavailable right now. Please try again." });
  }
});

app.use(express.static(webDist));
app.use((_req, res) => res.sendFile(path.join(webDist, "index.html")));

app.listen(port, () => console.log(`NextMusic running on http://localhost:${port}`));
