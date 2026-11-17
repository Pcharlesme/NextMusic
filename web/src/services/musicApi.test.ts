import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFeaturedMusic, searchMusic } from "./musicApi";

const song = {
  wrapperType: "track",
  kind: "song",
  trackId: 1450695739,
  trackName: "Hello",
  artistName: "Adele",
  artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music/100x100bb.jpg",
  trackViewUrl: "https://music.apple.com/gb/album/hello/1450695723?i=1450695739",
  trackTimeMillis: 295000,
};
const fetchMock = vi.fn<typeof fetch>();

function respond(results: unknown[]) {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ results }), { status: 200 }));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  respond([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("live catalogue service", () => {
  it("requests artists, albums and songs with encoded terms and cancellation", async () => {
    const signal = new AbortController().signal;
    await searchMusic("  Adele & friends  ", signal);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const entities = fetchMock.mock.calls.map(([input, options]) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/search");
      expect(url.searchParams.get("term")).toBe("Adele & friends");
      expect(url.searchParams.get("media")).toBe("music");
      expect(url.searchParams.get("country")).toBe("gb");
      expect(url.searchParams.get("limit")).toBe("50");
      expect(options?.signal).toBe(signal);
      return url.searchParams.get("entity");
    });
    expect(entities).toEqual(["musicArtist", "album", "song"]);
  });

  it("normalizes real response fields and deduplicates type-prefixed IDs", async () => {
    respond([
      song,
      { wrapperType: "artist", artistId: song.trackId, artistName: "Adele", artistLinkUrl: "https://music.apple.com/gb/artist/adele/262836961" },
      { wrapperType: "collection", collectionId: song.trackId, collectionName: "25", artistName: "Adele" },
    ]);
    const results = await searchMusic("Adele");
    expect(results.map((item) => item.id)).toEqual([`song:${song.trackId}`, `artist:${song.trackId}`, `album:${song.trackId}`]);
    expect(results[0]).toMatchObject({ title: "Hello", artist: "Adele", kind: "song", detail: "4:55", artwork: song.artworkUrl100 });
    expect(results[0].previewUrl).toBeUndefined();
    expect(results[2].artwork).toBe("");
  });

  it("ignores malformed items, unsupported media and unsafe external links", async () => {
    respond([null, {}, { ...song, trackId: "invalid" }, { ...song, kind: "music-video" }, { ...song, trackViewUrl: "javascript:alert(1)" }]);
    const results = await searchMusic("Adele");
    expect(results).toHaveLength(1);
    expect(results[0].externalUrl).toBeUndefined();
  });

  it("preserves an empty response without substituting data", async () => {
    expect(await searchMusic("unmatched query")).toEqual([]);
    expect(await getFeaturedMusic()).toEqual([]);
  });

  it("uses the supplied Adele query for distinct featured artwork", async () => {
    respond([song, { ...song, trackId: 2 }, { ...song, trackId: 3, artworkUrl100: "https://is1-ssl.mzstatic.com/second.jpg" }]);
    const items = await getFeaturedMusic();
    expect(items).toHaveLength(2);
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(Object.fromEntries(url.searchParams)).toEqual({ term: "Adele", media: "music", entity: "song", country: "gb", limit: "10" });
  });

  it("rejects unsuccessful and partial requests instead of returning fallback results", async () => {
    respond([song]);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(searchMusic("Adele")).rejects.toThrow("unavailable");
  });

  it("rejects malformed response envelopes", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ results: null })));
    await expect(searchMusic("Adele")).rejects.toThrow("unexpected response");
  });

  it("propagates network and cancellation failures", async () => {
    const error = new DOMException("Aborted", "AbortError");
    fetchMock.mockRejectedValue(error);
    await expect(searchMusic("Adele")).rejects.toBe(error);
  });

  it("validates search terms before requesting the network", async () => {
    await expect(searchMusic("  ")).rejects.toThrow("search term");
    await expect(searchMusic("a".repeat(201))).rejects.toThrow("search term");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
