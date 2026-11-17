export type MusicKind = "artist" | "album" | "song";
export interface MusicItem {
  id: string;
  kind: MusicKind;
  title: string;
  artist: string;
  artwork: string;
  detail?: string;
  externalUrl?: string;
  previewUrl?: string;
}
export type SearchStatus = "idle" | "loading" | "success" | "empty" | "error";
