import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import CloseRounded from "@mui/icons-material/CloseRounded";
import type { MusicItem } from "../search/types";

export function PreviewPlayer({ item, onClose }: { item: MusicItem | null; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setDuration(0);
    setFailed(false);
    const audio = audioRef.current;
    return () => audio?.pause();
  }, [item?.id]);
  if (!item?.previewUrl) return null;
  const seconds = Math.round(duration);
  return (
    <Box className="player-wrap preview-player" role="region" aria-label="Audio preview player">
      <Box className="preview-track">
        <Avatar src={item.artwork || undefined} variant="square" alt="" sx={{ width: 48, height: 48 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} color="white" noWrap>{item.title}</Typography>
          <Typography fontSize={12} color="#ddd" noWrap>{item.artist}</Typography>
          <Typography fontSize={12} color="#ddd">Audio preview{seconds > 0 ? ` · ${seconds} seconds` : ""}</Typography>
        </Box>
      </Box>
      <audio
        key={item.id}
        ref={audioRef}
        className="preview-audio"
        aria-label={`Audio preview of ${item.title} by ${item.artist}`}
        src={item.previewUrl}
        controls
        autoPlay
        preload="metadata"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          setDuration(Number.isFinite(value) ? value : 0);
        }}
        onError={() => setFailed(true)}
      />
      {item.externalUrl && (
        <a className="preview-store-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer">
          Listen on Apple Music<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      <IconButton className="preview-close" onClick={() => { audioRef.current?.pause(); onClose(); }}
        aria-label="Close preview player" sx={{ color: "white", minWidth: 44, minHeight: 44 }}>
        <CloseRounded />
      </IconButton>
      {failed && <Typography role="alert" className="preview-error">This preview could not be played. Try the Apple Music link.</Typography>}
    </Box>
  );
}
