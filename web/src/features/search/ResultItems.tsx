import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AlbumRounded from "@mui/icons-material/AlbumRounded";
import GraphicEqRounded from "@mui/icons-material/GraphicEqRounded";
import MusicNoteRounded from "@mui/icons-material/MusicNoteRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import type { MusicItem } from "./types";

const newTab = { target: "_blank", rel: "noopener noreferrer" };

export function ArtistCard({ item }: { item: MusicItem }) {
  const content = (
    <>
      <Avatar src={item.artwork || undefined} alt="" className="artist-avatar">
        <PersonOutlineRounded />
      </Avatar>
      <span className="artist-text">
        <span className="item-title">{item.title}</span>
        <span className="item-meta">Artist</span>
      </span>
      {item.externalUrl && <OpenInNewRounded className="card-link-icon" fontSize="small" aria-hidden="true" />}
    </>
  );

  return (
    <li>
      {item.externalUrl ? (
        <a className="artist-card" href={item.externalUrl} {...newTab}>
          {content}
          <span className="sr-only"> on Apple Music (opens in a new tab)</span>
        </a>
      ) : (
        <div className="artist-card">{content}</div>
      )}
    </li>
  );
}

export function AlbumCard({ item }: { item: MusicItem }) {
  const content = (
    <>
      <span className="album-cover">
        {item.artwork ? <img src={item.artwork} alt="" loading="lazy" /> : <AlbumRounded className="album-fallback" aria-hidden="true" />}
        {item.externalUrl && (
          <span className="album-open" aria-hidden="true">
            <OpenInNewRounded fontSize="small" />
          </span>
        )}
      </span>
      <span className="item-title">{item.title}</span>
      <span className="item-meta">{[item.artist, item.detail].filter(Boolean).join(" · ")}</span>
    </>
  );

  return (
    <li>
      {item.externalUrl ? (
        <a className="album-card" href={item.externalUrl} {...newTab}>
          {content}
          <span className="sr-only"> on Apple Music (opens in a new tab)</span>
        </a>
      ) : (
        <div className="album-card">{content}</div>
      )}
    </li>
  );
}

interface SongRowProps {
  item: MusicItem;
  position: number;
  playing: boolean;
  onPreview: (item: MusicItem) => void;
}

export function SongRow({ item, position, playing, onPreview }: SongRowProps) {
  return (
    <li className={`song-row${playing ? " is-playing" : ""}`}>
      {item.previewUrl ? (
        <button
          type="button"
          className="song-play"
          onClick={() => onPreview(item)}
          aria-pressed={playing}
          aria-label={`${playing ? "Now playing" : "Play preview of"} ${item.title} by ${item.artist}`}
        >
          <span className="song-number" aria-hidden="true">
            {position}
          </span>
          <PlayArrowRounded className="song-play-icon" aria-hidden="true" />
          <GraphicEqRounded className="song-playing-icon" aria-hidden="true" />
        </button>
      ) : (
        <span className="song-play song-number" aria-hidden="true">
          {position}
        </span>
      )}
      <Avatar variant="rounded" src={item.artwork || undefined} alt="" className="song-cover">
        <MusicNoteRounded />
      </Avatar>
      <div className="song-text">
        <p className="item-title">{item.title}</p>
        <p className="item-meta">
          {item.artist}
          {playing && <span className="now-playing"> · Now playing</span>}
        </p>
      </div>
      {item.detail && <span className="song-duration">{item.detail}</span>}
      {item.externalUrl && (
        <Tooltip title="Open in Apple Music">
          <IconButton component="a" href={item.externalUrl} {...newTab} className="song-link" aria-label={`Open ${item.title} in Apple Music (opens in a new tab)`}>
            <OpenInNewRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </li>
  );
}
