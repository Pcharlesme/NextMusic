import { useEffect, useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchRounded from "@mui/icons-material/SearchRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import MusicNoteRounded from "@mui/icons-material/MusicNoteRounded";
import AlbumOutlined from "@mui/icons-material/AlbumOutlined";
import GraphicEqRounded from "@mui/icons-material/GraphicEqRounded";
import { useAppSelector } from "../app/hooks";
import { getFeaturedMusic } from "../services/musicApi";
import { Suggestions } from "./Suggestions";
import type { MusicItem } from "../features/search/types";

interface Props {
  onSearch: (term: string) => void;
  onPreview: (item: MusicItem) => void;
  playingId?: string;
  loading: boolean;
}

const features = [
  { title: "Artists", description: "Find your favourite artists and discover new ones.", Icon: MusicNoteRounded },
  { title: "Albums", description: "Explore complete albums and iconic releases.", Icon: AlbumOutlined },
  { title: "Songs", description: "Play a 30-second preview of any song you find.", Icon: GraphicEqRounded },
];

const tilePositions = ["left", "main", "right"];

export function SearchHero({ onSearch, onPreview, playingId, loading }: Props) {
  const query = useAppSelector((s) => s.search.query);
  const [value, setValue] = useState("");
  const [artwork, setArtwork] = useState<MusicItem[]>([]);
  const [artworkStatus, setArtworkStatus] = useState<"loading" | "success" | "error">("loading");
  const [artworkAttempt, setArtworkAttempt] = useState(0);

  useEffect(() => {
    setValue(query);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setArtworkStatus("loading");
    getFeaturedMusic(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setArtwork(items);
        setArtworkStatus("success");
      })
      .catch(() => {
        if (!controller.signal.aborted) setArtworkStatus("error");
      });
    return () => controller.abort();
  }, [artworkAttempt]);

  // ===== Search Form =====
  // Users can search for an artist, album or song. Enter and the Search button submit the same trimmed query.
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const term = value.trim();
    if (term && !loading) onSearch(term);
  };

  const clear = () => {
    setValue("");
    document.getElementById("music-query")?.focus();
  };

  return (
    <Box component="section" className="landing" aria-labelledby="landing-title">
      <Container maxWidth="xl">
        <Box className="hero-layout">
          <Box className="hero-copy">
            <Typography className="eyebrow">MUSIC DISCOVERY</Typography>
            <Typography component="h1" variant="h1" id="landing-title" className="hero-title">
              Explore the
              <br className="desktop-break" /> world of music.
            </Typography>
            <Typography className="hero-subtitle">Search artists, albums and songs from the iTunes catalogue, then listen to a preview.</Typography>
            <Box component="form" role="search" aria-label="Music catalogue" onSubmit={submit} className="search-form">
              <Typography component="label" htmlFor="music-query" className="search-label">
                Search music
              </Typography>
              <Stack direction="row" alignItems="center" className="search-shell">
                <TextField
                  id="music-query"
                  fullWidth
                  placeholder="Search artists, albums or songs..."
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  size="small"
                  slotProps={{
                    htmlInput: { maxLength: 200, enterKeyHint: "search", autoComplete: "off" },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRounded aria-hidden="true" />
                        </InputAdornment>
                      ),
                      endAdornment: value && (
                        <InputAdornment position="end">
                          <IconButton aria-label="Clear search" onClick={clear} edge="end" size="small">
                            <CloseRounded fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ minWidth: 0, "& fieldset": { border: 0 }, "& .MuiInputBase-root": { fontSize: { xs: 16, sm: 17 }, minHeight: 56 } }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="success"
                  disabled={!value.trim() || loading}
                  startIcon={<SearchRounded />}
                  className="search-button"
                >
                  {loading ? "Searching…" : "Search"}
                </Button>
              </Stack>
              <Suggestions label="Try" onPick={onSearch} />
              <span className="sr-only" role="status">
                {loading ? "Searching the music catalogue." : ""}
              </span>
            </Box>
          </Box>
          <Box component="aside" className="hero-art" aria-label="Featured songs" aria-busy={artworkStatus === "loading"}>
            <div className="art-orbit orbit-mint" aria-hidden="true" />
            <div className="art-orbit orbit-yellow" aria-hidden="true" />
            <div className="art-orbit orbit-purple" aria-hidden="true" />
            {artworkStatus === "success" &&
              artwork.map((item, index) => {
                const playing = item.id === playingId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`artist-tile tile-${tilePositions[index]}${playing ? " is-playing" : ""}`}
                    onClick={() => onPreview(item)}
                    aria-label={`${playing ? "Now playing" : "Play preview of"} ${item.title} by ${item.artist}`}
                  >
                    <img
                      src={item.artwork}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.visibility = "hidden";
                      }}
                    />
                    <span className="tile-play" aria-hidden="true">
                      {playing ? <GraphicEqRounded /> : <PlayArrowRounded />}
                    </span>
                    <span className="tile-caption" aria-hidden="true">
                      {item.title} <small>{playing ? "Now playing" : item.artist}</small>
                    </span>
                  </button>
                );
              })}
            {(artworkStatus !== "success" || artwork.length === 0) && (
              <Box className="artwork-status">
                <Typography role="status">
                  {artworkStatus === "loading"
                    ? "Loading music from iTunes…"
                    : artworkStatus === "error"
                      ? "Featured music could not be loaded."
                      : "No featured artwork is available."}
                </Typography>
                {artworkStatus === "error" && <Button onClick={() => setArtworkAttempt((attempt) => attempt + 1)}>Retry featured music</Button>}
              </Box>
            )}
          </Box>
        </Box>
        <Box component="ul" className="discovery-features" aria-label="What you can search">
          {features.map(({ title, description, Icon }) => (
            <Box component="li" key={title} className="discovery-feature">
              <span className="feature-icon">
                <Icon aria-hidden="true" />
              </span>
              <Box>
                <Typography component="h2" className="feature-title">
                  {title}
                </Typography>
                <Typography>{description}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
