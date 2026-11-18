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
  previewUrl: "https://audio-ssl.itunes.apple.com/hello.m4a",
  trackTimeMillis: 295000,
};
const fetchMock = vi.fn<typeof fetch>();

function respond(results: unknown[]) {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({ results }), { status: 200 }));
}

function pendingRequests() {
  fetchMock.mockImplementation(
    (_input, options) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = options?.signal;
        const cancel = () => reject(new DOMException("Aborted", "AbortError"));
        if (signal?.aborted) cancel();
        else signal?.addEventListener("abort", cancel, { once: true });
      }),
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  respond([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("searchMusic", () => {
  it("makes a single request to the backend with the trimmed term", async () => {
    await searchMusic("  Adele & friends  ");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toBe("/api/search");
    expect(url.searchParams.get("term")).toBe("Adele & friends");
  });

  it("normalizes each result type and orders artists, songs, then albums", async () => {
    respond([
      song,
      { wrapperType: "collection", collectionId: 1, collectionName: "25", artistName: "Adele", releaseDate: "2015-11-20T08:00:00Z" },
      { wrapperType: "artist", artistId: 1, artistName: "Adele", artistLinkUrl: "https://music.apple.com/gb/artist/adele/262836961" },
    ]);
    const results = await searchMusic("Adele");
    expect(results.map((item) => item.id)).toEqual(["artist:1", `song:${song.trackId}`, "album:1"]);
    expect(results[2].detail).toBe("2015");
    expect(results[1]).toMatchObject({
      title: "Hello",
      artist: "Adele",
      detail: "4:55",
      artwork: "https://is1-ssl.mzstatic.com/image/thumb/Music/300x300bb.jpg",
      previewUrl: song.previewUrl,
    });
  });

  it("drops malformed and duplicate items and unsafe links", async () => {
    respond([null, {}, song, song, { ...song, trackId: "x" }, { ...song, kind: "music-video" }, { ...song, trackId: 2, trackViewUrl: "javascript:alert(1)" }]);
    const results = await searchMusic("Adele");
    expect(results).toHaveLength(2);
    expect(results.find((item) => item.id === "song:2")?.externalUrl).toBeUndefined();
  });

  it("returns an empty list when nothing matches", async () => {
    expect(await searchMusic("unmatched query")).toEqual([]);
  });

  it("surfaces the backend's error message", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "The iTunes catalogue is unavailable right now." }), { status: 502 }));
    await expect(searchMusic("Adele")).rejects.toThrow("unavailable right now");
  });

  it("rejects a malformed response body", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ results: null })));
    await expect(searchMusic("Adele")).rejects.toThrow("unexpected response");
  });

  it("validates the term before touching the network", async () => {
    await expect(searchMusic("  ")).rejects.toThrow("search term");
    await expect(searchMusic("a".repeat(201))).rejects.toThrow("search term");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("times out slow requests", async () => {
    vi.useFakeTimers();
    pendingRequests();
    const search = expect(searchMusic("Adele")).rejects.toThrow("too long");
    await vi.advanceTimersByTimeAsync(15_000);
    await search;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("forwards cancellation to the request", async () => {
    pendingRequests();
    const controller = new AbortController();
    const search = expect(searchMusic("Adele", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await search;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("does not request when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(searchMusic("Adele", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers items with artwork within each type", async () => {
    respond([
      { wrapperType: "collection", collectionId: 1, collectionName: "No cover" },
      { wrapperType: "collection", collectionId: 2, collectionName: "25", artworkUrl100: song.artworkUrl100 },
    ]);
    expect((await searchMusic("Adele")).map((item) => item.title)).toEqual(["25", "No cover"]);
  });
});

describe("getFeaturedMusic", () => {
  it("keeps playable songs with distinct covers", async () => {
    respond([
      song,
      { ...song, trackId: 2 },
      { ...song, trackId: 3, artworkUrl100: "https://is1-ssl.mzstatic.com/second/100x100bb.jpg" },
      { ...song, trackId: 4, artworkUrl100: "https://is1-ssl.mzstatic.com/third/100x100bb.jpg", previewUrl: undefined },
      { wrapperType: "artist", artistId: 9, artistName: "Adele" },
    ]);
    const items = await getFeaturedMusic();
    expect(items.map((item) => item.id)).toEqual([`song:${song.trackId}`, "song:3"]);
  });
});
