import type { MusicItem, MusicKind } from "../features/search/types";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://itunes.apple.com").replace(/\/+$/, "");
const SEARCH_LIMIT = 50;

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
  const duration = typeof result.trackTimeMillis === "number" && result.trackTimeMillis > 0 ? result.trackTimeMillis : undefined;
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
  // Fetch a bounded catalogue selection; Redux reveals ten items at a time.
  const groups = await Promise.all(["musicArtist", "album", "song"].map((entity) => requestMusic(query, entity, SEARCH_LIMIT, signal)));
  return [...new Map(groups.flat().map((item) => [item.id, item])).values()];
}

export async function getFeaturedMusic(signal?: AbortSignal): Promise<MusicItem[]> {
  // Use the supplied Adele query for genuine catalogue artwork on the landing page.
  const items = await requestMusic("Adele", "song", 10, signal);
  const artworks = new Set<string>();
  return items
    .filter((item) => {
      if (!item.artwork || !item.externalUrl || artworks.has(item.artwork)) return false;
      artworks.add(item.artwork);
      return true;
    })
    .slice(0, 3);
}
