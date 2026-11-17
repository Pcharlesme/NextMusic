import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import CloseRounded from "@mui/icons-material/CloseRounded";
import type { MusicItem } from "../search/types";

export function PreviewPlayer({ item, onClose }: { item: MusicItem; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const audio = audioRef.current;
    return () => audio?.pause();
  }, [item.id]);

  if (!item.previewUrl) return null;

  const close = () => {
    audioRef.current?.pause();
    onClose();
  };

  return (
    <Box
      className="player-wrap preview-player"
      role="region"
      aria-label="Audio preview player"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        close();
      }}
    >
      <Box className="preview-track">
        <Avatar src={item.artwork || undefined} variant="square" alt="" sx={{ width: 48, height: 48 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} color="white" noWrap>
            {item.title}
          </Typography>
          <Typography fontSize={12} color="#ddd" noWrap>
            {item.artist} · 30-second preview
          </Typography>
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
        onError={() => setFailed(true)}
      />
      {item.externalUrl && (
        <a className="preview-store-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer">
          Full song on Apple Music<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      <IconButton className="preview-close" onClick={close} aria-label="Close preview player" sx={{ color: "white", minWidth: 44, minHeight: 44 }}>
        <CloseRounded />
      </IconButton>
      {failed && (
        <Typography role="alert" className="preview-error">
          This preview could not be played. Try the Apple Music link.
        </Typography>
      )}
    </Box>
  );
}
