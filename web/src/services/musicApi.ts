import type { MusicItem, MusicKind } from "../features/search/types";

const REQUEST_TIMEOUT_MS = 15_000;
const kindOrder: Record<MusicKind, number> = { artist: 0, song: 1, album: 2 };

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function secureUrl(value: unknown) {
  const url = text(value);
  return /^https?:\/\//i.test(url) ? url.replace(/^http:/i, "https:") : "";
}

function formatDuration(ms: unknown) {
  if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return undefined;
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function releaseYear(date: unknown) {
  const year = text(date).slice(0, 4);
  return /^\d{4}$/.test(year) ? year : undefined;
}

function normalize(result: unknown): MusicItem | null {
  if (typeof result !== "object" || result === null) return null;
  const r = result as Record<string, unknown>;

  const kind: MusicKind | null =
    r.wrapperType === "artist" ? "artist" : r.wrapperType === "collection" ? "album" : r.wrapperType === "track" && r.kind === "song" ? "song" : null;
  if (!kind) return null;

  const id = { artist: r.artistId, album: r.collectionId, song: r.trackId }[kind];
  const title = text({ artist: r.artistName, album: r.collectionName, song: r.trackName }[kind]);
  if (typeof id !== "number" || !Number.isFinite(id) || !title) return null;

  return {
    id: `${kind}:${id}`,
    kind,
    title,
    artist: text(r.artistName) || "Unknown artist",
    artwork: secureUrl(r.artworkUrl100).replace("/100x100bb.", "/300x300bb."),
    detail: kind === "song" ? formatDuration(r.trackTimeMillis) : kind === "album" ? releaseYear(r.releaseDate) : undefined,
    externalUrl: secureUrl(r.trackViewUrl) || secureUrl(r.collectionViewUrl) || secureUrl(r.artistLinkUrl) || secureUrl(r.artistViewUrl) || undefined,
    previewUrl: kind === "song" ? secureUrl(r.previewUrl) || undefined : undefined,
  };
}

export async function searchMusic(term: string, signal?: AbortSignal): Promise<MusicItem[]> {
  const query = term.trim();
  if (!query || query.length > 200) throw new Error("Enter a search term between 1 and 200 characters.");
  if (signal?.aborted) throw new DOMException("Search cancelled", "AbortError");

  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/search?${new URLSearchParams({ term: query })}`, { signal: controller.signal });
    const body = (await response.json().catch(() => null)) as { results?: unknown; error?: unknown } | null;

    if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "The music catalogue is unavailable. Please try again.");
    if (!Array.isArray(body?.results)) throw new Error("Got an unexpected response. Please try again.");

    // ===== Result Identity =====
    // Type-prefixed IDs keep artists, albums and songs distinct when Apple reuses numeric IDs.
    const items = new Map<string, MusicItem>();
    for (const item of body.results.map(normalize)) {
      if (item && !items.has(item.id)) items.set(item.id, item);
    }
    return [...items.values()].sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind] || Number(!a.artwork) - Number(!b.artwork));
  } catch (error) {
    if (timedOut) throw new Error("The search took too long. Please try again.", { cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}

export async function getFeaturedMusic(signal?: AbortSignal): Promise<MusicItem[]> {
  const covers = new Set<string>();
  const songs = (await searchMusic("Adele", signal)).filter((item) => {
    if (item.kind !== "song" || !item.previewUrl || !item.artwork || covers.has(item.artwork)) return false;
    covers.add(item.artwork);
    return true;
  });
  return songs.slice(0, 3);
}
