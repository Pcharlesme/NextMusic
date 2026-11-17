import { useEffect, useState, type FormEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchRounded from "@mui/icons-material/SearchRounded";
import KeyboardOutlined from "@mui/icons-material/KeyboardOutlined";
import MusicNoteRounded from "@mui/icons-material/MusicNoteRounded";
import AlbumOutlined from "@mui/icons-material/AlbumOutlined";
import GraphicEqRounded from "@mui/icons-material/GraphicEqRounded";

import { getFeaturedMusic } from "../services/musicApi";
import type { MusicItem } from "../features/search/types";

interface Props {
  onSearch: (q: string) => void;
  loading: boolean;
  initial?: string;
}

const features = [
  { title: "Artists", description: "Find your favourite artists and discover new ones.", Icon: MusicNoteRounded },
  { title: "Albums", description: "Explore complete albums and iconic releases.", Icon: AlbumOutlined },
  { title: "Songs", description: "Search and discover songs across genres.", Icon: GraphicEqRounded },
];

export function SearchHero({ onSearch, loading, initial = "" }: Props) {
  const [value, setValue] = useState(initial);
  const [artwork, setArtwork] = useState<MusicItem[]>([]);
  const [artworkStatus, setArtworkStatus] = useState<"loading" | "success" | "error">("loading");
  const [artworkAttempt, setArtworkAttempt] = useState(0);

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
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim() && !loading) onSearch(value.trim());
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
            <Typography className="hero-subtitle">Discover artists, albums and songs from the iTunes catalogue.</Typography>
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
                    htmlInput: { "aria-describedby": "search-hint", maxLength: 200 },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchRounded aria-hidden="true" />
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
              <Typography id="search-hint" className="search-hint">
                <KeyboardOutlined aria-hidden="true" /> Press Enter to search
              </Typography>
              <span className="sr-only" role="status">
                {loading ? "Searching the music catalogue." : ""}
              </span>
            </Box>
          </Box>
          <Box component="aside" className="hero-art" aria-label="Featured music from iTunes" aria-busy={artworkStatus === "loading"}>
            <div className="art-orbit orbit-mint" aria-hidden="true" />
            <div className="art-orbit orbit-yellow" aria-hidden="true" />
            <div className="art-orbit orbit-purple" aria-hidden="true" />
            {artworkStatus === "success" &&
              artwork.map((item, index) => (
                <a
                  key={item.id}
                  className={`artist-tile tile-${["left", "main", "right"][index]}`}
                  href={item.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Listen on Apple Music (opens in a new tab)"
                >
                  <img
                    src={item.artwork}
                    alt=""
                    width="100"
                    height="100"
                    onError={(event) => {
                      event.currentTarget.style.visibility = "hidden";
                    }}
                  />
                  <span>
                    {item.title} <small>{item.artist} · Song</small>
                  </span>
                  <small className="sr-only"> Listen on Apple Music (opens in a new tab)</small>
                </a>
              ))}
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
        <Box component="ul" className="discovery-features" aria-label="Explore the music catalogue">
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
      <svg className="landing-wave" viewBox="0 0 1440 130" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="landing-wave-gradient">
            <stop stopColor="#D9A6FF" />
            <stop offset=".35" stopColor="#8BF1DB" />
            <stop offset=".65" stopColor="#FFFA70" />
            <stop offset="1" stopColor="#CBFFF0" />
          </linearGradient>
        </defs>
        <path d="M0 12C180 30 210 160 420 100S650 35 800 90 1100 180 1440 40V130H0Z" fill="url(#landing-wave-gradient)" />
        <path d="M0 95C220 170 400 170 600 90S900 30 1080 100 1300 150 1440 85V130H0Z" fill="#B7F9D8" opacity=".55" />
      </svg>
    </Box>
  );
}
