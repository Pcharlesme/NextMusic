import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import AlbumRounded from "@mui/icons-material/AlbumRounded";
import MusicNoteRounded from "@mui/icons-material/MusicNoteRounded";
import type { MusicItem } from "./types";
const icons = {
  artist: <PersonOutlineRounded fontSize="small" />,
  album: <AlbumRounded fontSize="small" />,
  song: <MusicNoteRounded fontSize="small" />,
};
export function ResultRow({
  item,
  onPreview,
}: {
  item: MusicItem;
  onPreview: (i: MusicItem) => void;
}) {
  return (
    <Box component="li" className="result-row">
      <Avatar
        variant="rounded"
        src={item.artwork || undefined}
        alt=""
        sx={{
          width: { xs: 58, sm: 72 },
          height: { xs: 58, sm: 72 },
          borderRadius: 2,
          bgcolor: "#f3f3f3",
          color: "#171717",
        }}
      >
        {icons[item.kind]}
      </Avatar>
      <Chip
        size="small"
        icon={icons[item.kind]}
        label={item.kind[0].toUpperCase() + item.kind.slice(1)}
        sx={{
          bgcolor: "#f3f3f3",
          color: "#171717",
          fontWeight: 750,
          width: 96,
          display: { xs: "none", sm: "flex" },
          "& .MuiChip-icon": { color: "#171717" },
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={800} fontSize={{ xs: 16, sm: 19 }} noWrap>
          {item.title}
        </Typography>
        <Typography fontSize={13} color="text.secondary" noWrap>
          {item.kind === "artist"
            ? "Artist"
            : `${item.kind === "album" ? "Album" : "Song"} · ${item.artist}${item.detail && item.kind === "song" ? ` · ${item.detail}` : ""}`}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1} alignItems="center">
        {item.kind === "song" && item.previewUrl && (
          <Tooltip title="Play audio preview">
            <IconButton
              aria-label={`Preview ${item.title} by ${item.artist}`}
              onClick={() => onPreview(item)}
              sx={{
                minWidth: 44,
                minHeight: 44,
                bgcolor: "#f3f3f3",
                color: "#171717",
                "&:hover": { bgcolor: "#e5e5e5" },
              }}
            >
              <PlayArrowRounded />
            </IconButton>
          </Tooltip>
        )}
        {item.externalUrl && (
          <Tooltip title="Open in Apple Music">
            <IconButton
              component="a"
              href={item.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${item.title} in Apple Music (opens in a new tab)`}
              sx={{ minWidth: 44, minHeight: 44, bgcolor: "#f3f3f3", color: "#171717" }}
            >
              <OpenInNewRounded />
            </IconButton>
          </Tooltip>
        )}
        {!item.externalUrl && item.kind !== "song" && (
          <Box sx={{ width: 40 }} />
        )}
      </Stack>
    </Box>
  );
}
