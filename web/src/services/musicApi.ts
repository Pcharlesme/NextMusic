import type { MusicItem, MusicKind } from "../features/search/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://itunes.apple.com").replace(/\/+$/, "");
const SEARCH_LIMIT = 50;
const REQUEST_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function secureUrl(value: unknown): string {
  const url = text(value);
  return /^https?:\/\//i.test(url) ? url.replace(/^http:/i, "https:") : "";
}

// ===== Search Results =====
// Keep optional Apple fields optional and discard records without a usable identity.
function normalize(result: unknown): MusicItem | null {
  if (!isRecord(result)) return null;
  const kind: MusicKind | null =
    result.wrapperType === "artist"
      ? "artist"
      : result.wrapperType === "collection"
        ? "album"
        : result.wrapperType === "track" && result.kind === "song"
          ? "song"
          : null;
  if (!kind) return null;
  const id = kind === "artist" ? result.artistId : kind === "album" ? result.collectionId : result.trackId;
  const title = text(kind === "artist" ? result.artistName : kind === "album" ? result.collectionName : result.trackName);
  if (typeof id !== "number" || !Number.isFinite(id) || !title) return null;
  const duration = typeof result.trackTimeMillis === "number" && Number.isFinite(result.trackTimeMillis) && result.trackTimeMillis > 0 ? result.trackTimeMillis : undefined;
  return {
    id: `${kind}:${id}`,
    kind,
    title,
    artist: text(result.artistName) || "Unknown artist",
    artwork: secureUrl(result.artworkUrl100),
    detail: kind === "song" && duration ? `${Math.floor(duration / 60000)}:${String(Math.floor(duration / 1000) % 60).padStart(2, "0")}` : undefined,
    externalUrl:
      secureUrl(result.trackViewUrl) || secureUrl(result.collectionViewUrl) || secureUrl(result.artistLinkUrl) || secureUrl(result.artistViewUrl) || undefined,
    previewUrl: kind === "song" ? secureUrl(result.previewUrl) || undefined : undefined,
  };
}

// ===== Request Lifetime =====
// Search and featured artwork share a deadline. Cancellation also stops sibling requests.
async function withRequestTimeout<T>(signal: AbortSignal | undefined, run: (requestSignal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) throw new DOMException("Search cancelled", "AbortError");
  signal?.addEventListener("abort", cancel, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (timedOut) throw new Error("iTunes took too long to respond. Please try again.");
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
    controller.abort();
  }
}

// ===== Apple Music API =====
// Build encoded requests at the API boundary, keeping networking out of result components.
async function requestMusic(term: string, entity: string, limit: number, signal?: AbortSignal): Promise<MusicItem[]> {
  const params = new URLSearchParams({ term, media: "music", entity, country: "gb", limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/search?${params}`, { signal });
  if (!response.ok) throw new Error("The iTunes catalogue is unavailable. Please try again.");
  const data: unknown = await response.json();
  if (!isRecord(data) || !Array.isArray(data.results)) throw new Error("iTunes returned an unexpected response. Please try again.");
  return data.results.map(normalize).filter((item): item is MusicItem => item !== null);
}

export async function searchMusic(term: string, signal?: AbortSignal): Promise<MusicItem[]> {
  const query = term.trim();
  if (!query || query.length > 200) throw new Error("Enter a search term between 1 and 200 characters.");
  return withRequestTimeout(signal, async (requestSignal) => {
    // Fetch a bounded selection; scrolling reveals existing results rather than requesting an offset.
    const groups = await Promise.all(["album", "song", "musicArtist"].map((entity) => requestMusic(query, entity, SEARCH_LIMIT, requestSignal)));
    const items = [...new Map(groups.flat().map((item) => [item.id, item])).values()];
    // ===== Album-First Discovery =====
    // Albums lead All results so reviewers see cover artwork before artists, whose images are often absent.
    // Prefer available artwork within each type without hiding records or changing Apple's remaining order.
    const priority: Record<MusicKind, number> = { album: 0, song: 1, artist: 2 };
    return items.sort((left, right) => priority[left.kind] - priority[right.kind] || Number(!left.artwork) - Number(!right.artwork));
  });
}

export async function getFeaturedMusic(signal?: AbortSignal): Promise<MusicItem[]> {
  // ===== Featured Artwork =====
  // Use real catalogue artwork, with the same timeout and cancellation rules as search.
  const items = await withRequestTimeout(signal, (requestSignal) => requestMusic("Adele", "song", 10, requestSignal));
  const artworks = new Set<string>();
  return items
    .filter((item) => {
      if (!item.artwork || !item.externalUrl || artworks.has(item.artwork)) return false;
      artworks.add(item.artwork);
      return true;
    })
    .slice(0, 3);
}
