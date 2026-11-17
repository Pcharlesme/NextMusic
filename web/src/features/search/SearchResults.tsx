import { Fragment, useDeferredValue, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { revealMore, resetVisibleCount } from "./searchSlice";
import { ResultRow } from "./ResultRow";
import type { MusicItem, MusicKind } from "./types";
import { SearchOutlined } from "@mui/icons-material";

type Filter = "all" | MusicKind;

export function SearchResults({
  onRetry,
  onPreview,
}: {
  onRetry: () => void;
  onPreview: (item: MusicItem) => void;
}) {
  const dispatch = useAppDispatch();
  const { query, items, status, error, visibleCount } = useAppSelector(
    (s) => s.search,
  );
  const [filter, setFilter] = useState<Filter>("song");
  const sentinel = useRef<HTMLDivElement>(null);
  const revealedBoundary = useRef("");
  useEffect(() => {
    if (status === "loading") {
      setFilter("song");
      revealedBoundary.current = "";
    }
  }, [query, status]);
  const filtered =
    filter === "all" ? items : items.filter((i) => i.kind === filter);
  const deferredCount = useDeferredValue(visibleCount);
  const displayedCount = Math.min(deferredCount, visibleCount);
  const revealing = deferredCount < visibleCount;
  const shown = filtered.slice(0, displayedCount);
  const hasMore = shown.length < filtered.length;
  useEffect(() => {
    if (status !== "success" || !hasMore || revealing || typeof IntersectionObserver === "undefined") return;
    const el = sentinel.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const boundary = `${query}:${filter}:${visibleCount}`;
        if (entries[0]?.isIntersecting && revealedBoundary.current !== boundary) {
          revealedBoundary.current = boundary;
          observer.disconnect();
          dispatch(revealMore());
        }
      },
      { threshold: 1, rootMargin: "0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [dispatch, hasMore, status, visibleCount, filter, query, revealing]);
  if (status === "idle") return null;
  return (
    <Container maxWidth="xl" sx={{ pt: 4, pb: 12 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography component="h2" variant="h4" fontWeight={850}>
            Search results
          </Typography>
          <Typography color="text.secondary" aria-live="polite">
            {status === "loading"
              ? "Searching the catalogue…"
              : status === "success"
                ? `Showing ${shown.length} of ${filtered.length} fetched results for “${query}”.${shown.length > 10 ? ` Added ${Math.min(10, shown.length - 10)} more results.` : hasMore ? " Scroll down to reveal the next ten." : " End of fetched results."}`
                : `Results for “${query}”`}
          </Typography>
        </Box>
        {status === "success" && (
          <Stack
            direction="row"
            gap={1}
            flexWrap="wrap"
            role="group"
            aria-label="Filter results"
          >
            {(["all", "artist", "album", "song"] as Filter[]).map((f) => (
              <Chip
                key={f}
                clickable
                onClick={() => {
                  revealedBoundary.current = "";
                  dispatch(resetVisibleCount());
                  setFilter(f);
                }}
                label={
                  f === "all"
                    ? "All"
                    : f === "artist"
                      ? "Artists"
                      : f === "album"
                        ? "Albums"
                        : "Songs"
                }
                aria-pressed={filter === f}
                sx={{
                  bgcolor: filter === f ? "#171717" : "#f3f3f3",
                  color: filter === f ? "white" : "#171717",
                  fontWeight: 750,
                  minWidth: 80,
                }}
              />
            ))}
          </Stack>
        )}
      </Stack>
      {status === "loading" && (
        <Box aria-label="Loading results" aria-busy="true">
          {Array.from({ length: 10 }, (_, i) => (
            <Stack
              key={i}
              direction="row"
              gap={2}
              sx={{ p: 2, mb: 1, border: "1px solid #dddddd", borderRadius: 3 }}
            >
              <Skeleton variant="rounded" width={70} height={70} />
              <Box sx={{ flex: 1 }}>
                <Skeleton width="35%" height={28} />
                <Skeleton width="55%" height={22} />
              </Box>
            </Stack>
          ))}
        </Box>
      )}
      {status === "empty" && (
        <Box className="state-panel">
          <SearchOutlined sx={{ fontSize: 48, color: "#171717" }} />
          <Typography variant="h5" fontWeight={800}>
            No results found
          </Typography>
          <Typography color="text.secondary">
            Try another artist, album, song title, or check your spelling.
          </Typography>
        </Box>
      )}
      {status === "error" && (
        <Box className="state-panel">
          <Alert severity="error" sx={{ mb: 2, maxWidth: 540 }}>
            {error || "Something went wrong."}
          </Alert>
          <Button
            startIcon={<RefreshRounded />}
            variant="contained"
            onClick={onRetry}
          >
            Try again
          </Button>
        </Box>
      )}
      {status === "success" && (
        <>
          {filtered.length === 0 ? (
            <Box className="state-panel">
              <SearchOffRounded sx={{ fontSize: 42 }} />
              <Typography variant="h6">
                No{" "}
                {filter === "artist"
                  ? "artists"
                  : filter === "album"
                    ? "albums"
                    : "songs"}{" "}
                in these results
              </Typography>
              <Typography color="text.secondary">
                Choose another filter to see matching items.
              </Typography>
            </Box>
          ) : (
            <>
              <Box
                component="ul"
                aria-label="Music search results"
                sx={{ listStyle: "none", p: 0, m: 0 }}
                aria-busy={revealing}
              >
                {shown.map((item, index) => (
                  <Fragment key={item.id}>
                    {index % 10 === 0 && (
                      <Box component="li" className="result-batch-label">
                        Results {index + 1}–{Math.min(index + 10, shown.length)}
                      </Box>
                    )}
                    <ResultRow item={item} onPreview={onPreview} />
                  </Fragment>
                ))}
              </Box>
              {revealing && (
                <Box aria-label="Rendering the next ten results" aria-busy="true">
                  {Array.from({ length: Math.min(10, filtered.length - shown.length) }, (_, index) => (
                    <Stack key={index} direction="row" gap={2} sx={{ p: 2, borderBottom: "1px solid #ddd" }}>
                      <Skeleton variant="rectangular" width={58} height={58} />
                      <Box sx={{ flex: 1 }}><Skeleton width="45%" /><Skeleton width="65%" /></Box>
                    </Stack>
                  ))}
                </Box>
              )}
              <Box ref={sentinel} sx={{ py: 3, textAlign: "center" }}>
                {hasMore ? (
                  <>
                    <Typography color="text.secondary">
                      {revealing ? "Rendering the next ten results…" : `Next: ${shown.length + 1}–${Math.min(shown.length + 10, filtered.length)}. Scroll down or use the button below.`}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="outlined"
                        disabled={revealing}
                        onClick={() => dispatch(revealMore())}
                      >
                        Show next {Math.min(10, filtered.length - shown.length)} results
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Typography color="text.secondary" fontSize={13}>
                    You've reached the end of these results.
                  </Typography>
                )}
              </Box>
            </>
          )}
        </>
      )}
    </Container>
  );
}
