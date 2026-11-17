import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { Suggestions } from "../../components/Suggestions";
import { revealMore, resetVisibleCount } from "./searchSlice";
import { AlbumCard, ArtistCard, SongRow } from "./ResultItems";
import type { MusicItem, MusicKind } from "./types";

type Filter = "all" | MusicKind;

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "artist", label: "Artists" },
  { value: "album", label: "Albums" },
  { value: "song", label: "Songs" },
];

const groupTitles: Record<MusicKind, string> = { artist: "Artists", album: "Albums", song: "Songs" };

interface Props {
  playingId?: string;
  onPreview: (item: MusicItem) => void;
  onSearch: (term: string) => void;
  onRetry: () => void;
}

export function SearchResults({ playingId, onPreview, onSearch, onRetry }: Props) {
  const dispatch = useAppDispatch();
  const { query, items, status, error, visibleCount } = useAppSelector((s) => s.search);
  const [filter, setFilter] = useState<Filter>("all");
  const section = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "loading") return;
    setFilter("all");
    section.current?.scrollIntoView({ block: "start" });
  }, [status]);

  const counts: Record<Filter, number> = { all: items.length, artist: 0, album: 0, song: 0 };
  for (const item of items) counts[item.kind]++;

  const filtered = filter === "all" ? items : items.filter((item) => item.kind === filter);
  // ===== Ten Items at a Time =====
  // Display only the revealed portion of the matching results, including when a type filter is selected.
  const shown = filtered.slice(0, visibleCount);
  const remaining = filtered.length - shown.length;

  // ===== Infinite Scrolling =====
  // Reveal the next ten when scrolling brings the end marker into view. Allow only one reveal per scroll listener.
  useEffect(() => {
    if (status !== "success" || remaining <= 0) return;
    let revealed = false;
    const onScroll = () => {
      const el = sentinel.current;
      if (revealed || !el || el.getBoundingClientRect().top > window.innerHeight) return;
      revealed = true;
      dispatch(revealMore());
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dispatch, status, remaining, visibleCount, filter]);

  const chooseFilter = (value: Filter) => {
    setFilter(value);
    dispatch(resetVisibleCount());
  };

  if (status === "idle") return null;

  let summary = "Searching the catalogue…";
  if (status === "success") summary = `Showing ${shown.length} of ${filtered.length} results for “${query}”`;
  if (status === "empty") summary = `No results found for “${query}”`;
  if (status === "error") summary = `Search failed for “${query}”`;

  return (
    <Container ref={section} component="section" aria-labelledby="results-title" maxWidth="xl" className="results-section" sx={{ pt: 4, pb: 12 }}>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography id="results-title" component="h2" variant="h4" fontWeight={850}>
            Search results
          </Typography>
          <Typography color="text.secondary" role="status">
            {summary}
          </Typography>
        </Box>
        {status === "success" && (
          <Stack direction="row" gap={1} flexWrap="wrap" role="group" aria-label="Filter results" className="filter-chips">
            {filters.map(({ value, label }) => (
              <Chip
                key={value}
                clickable
                disabled={counts[value] === 0}
                onClick={() => chooseFilter(value)}
                label={`${label} (${counts[value]})`}
                aria-pressed={filter === value}
                sx={{ bgcolor: filter === value ? "#171717" : "#f3f3f3", color: filter === value ? "white" : "#171717", fontWeight: 750, minWidth: 80 }}
              />
            ))}
          </Stack>
        )}
      </Stack>

      {status === "loading" && (
        <Box aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Stack key={i} direction="row" alignItems="center" gap={2} sx={{ p: 2, borderBottom: "1px solid #dddddd" }}>
              <Skeleton variant="rounded" width={70} height={70} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="35%" height={28} />
                <Skeleton width="55%" height={22} />
              </Box>
            </Stack>
          ))}
        </Box>
      )}

      {/* ===== No Results Notification ===== */}
      {/* Tell the user clearly when a successful search returns no matches. */}
      {status === "empty" && (
        <Box className="state-panel">
          <SearchOutlined sx={{ fontSize: 48, color: "#171717" }} />
          <Typography component="h3" variant="h5" fontWeight={800}>
            No results found
          </Typography>
          <Typography color="text.secondary">Check the spelling, or try one of these:</Typography>
          <Suggestions onPick={onSearch} />
        </Box>
      )}

      {status === "error" && (
        <Box className="state-panel">
          <Alert severity="error" sx={{ maxWidth: 540 }}>
            {error || "Something went wrong."}
          </Alert>
          <Button startIcon={<RefreshRounded />} variant="contained" onClick={onRetry}>
            Try again
          </Button>
        </Box>
      )}

      {status === "success" && (
        <>
          {/* ===== Matching Artists, Albums and Songs ===== */}
          {/* Render the visible matches in their relevant groups, using lists for the returned items. */}
          <div className="result-groups">
            {(["artist", "album", "song"] as MusicKind[]).map((kind) => {
              const group = shown.filter((item) => item.kind === kind);
              if (!group.length) return null;
              return (
                <section key={kind} className="result-group" aria-labelledby={`group-${kind}`}>
                  <h3 id={`group-${kind}`} className="group-title">
                    {groupTitles[kind]}
                    <span className="group-count">{counts[kind]}</span>
                  </h3>
                  {kind === "artist" && (
                    <ul className="artist-list">
                      {group.map((item) => (
                        <ArtistCard key={item.id} item={item} />
                      ))}
                    </ul>
                  )}
                  {kind === "album" && (
                    <ul className="album-grid">
                      {group.map((item) => (
                        <AlbumCard key={item.id} item={item} />
                      ))}
                    </ul>
                  )}
                  {kind === "song" && (
                    <ul className="song-list">
                      {group.map((item, index) => (
                        <SongRow key={item.id} item={item} position={index + 1} playing={item.id === playingId} onPreview={onPreview} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
          <Box ref={sentinel} sx={{ py: 3, textAlign: "center" }}>
            {remaining > 0 ? (
              <Button variant="outlined" onClick={() => dispatch(revealMore())}>
                Show {Math.min(10, remaining)} more
              </Button>
            ) : (
              <Typography color="text.secondary" fontSize={13}>
                You've reached the end of these results.
              </Typography>
            )}
          </Box>
        </>
      )}
    </Container>
  );
}
