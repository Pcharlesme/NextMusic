import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Header } from "./components/Header";
import { SearchHero } from "./components/SearchHero";
import { SearchResults } from "./features/search/SearchResults";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { runSearch } from "./features/search/searchSlice";
import type { MusicItem } from "./features/search/types";

// ===== Optional Audio Player =====
// Keep player controls out of the initial page bundle until a preview is requested.
const PreviewPlayer = lazy(() => import("./features/player/PreviewPlayer").then((module) => ({ default: module.PreviewPlayer })));

export default function App() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.search.status);
  const query = useAppSelector((s) => s.search.query);
  const [preview, setPreview] = useState<MusicItem | null>(null);
  const current = useRef<{ abort: () => void } | null>(null);
  const previewTrigger = useRef<HTMLElement | null>(null);

  // ===== Audio Preview Focus =====
  // Return keyboard users to the selected song after the fixed player closes.
  const openPreview = (item: MusicItem) => {
    const label = `Preview ${item.title} by ${item.artist}`;
    const active = document.activeElement;
    previewTrigger.current = active instanceof HTMLButtonElement && active.getAttribute("aria-label") === label
      ? active
      : Array.from(document.querySelectorAll<HTMLButtonElement>("button[aria-label]"))
        .find((button) => button.getAttribute("aria-label") === label) ?? null;
    setPreview(item);
  };
  const closePreview = () => {
    setPreview(null);
    const target = previewTrigger.current;
    previewTrigger.current = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
    else document.getElementById("music-query")?.focus({ preventScroll: true });
  };

  // ===== Search Lifecycle =====
  // Cancel the previous request and stop its audio when a new search starts.
  const search = (term: string) => {
    current.current?.abort();
    setPreview(null);
    previewTrigger.current = null;
    current.current = dispatch(runSearch(term));
  };

  useEffect(
    () => () => {
      current.current?.abort();
    },
    [],
  );
  return (
    <Box sx={{ minHeight: "100vh", overflowX: "hidden" }}>
      <Header />
      <Box component="main" id="main-content" tabIndex={-1}>
        <SearchHero onSearch={search} loading={status === "loading"} />
        <SearchResults onRetry={() => search(query)} onPreview={openPreview} />
      </Box>
      <Box component="footer" id="about" sx={{ borderTop: "1px solid #dddddd", py: 3, mt: 2 }}>
        <Container maxWidth="xl">
          <Stack direction={{ xs: "column", sm: "row" }} gap={1} justifyContent="space-between">
            <Typography fontWeight={800}>
              NextMusic
              <Box component="span" sx={{ fontWeight: 400, color: "#595959" }}>
                · Discover more.
              </Box>
            </Typography>
            <Typography fontSize={13} color="text.secondary">
              Search artists, albums and songs. Music data and artwork provided by Apple iTunes.
            </Typography>
          </Stack>
        </Container>
      </Box>
      {preview && (
        <Suspense fallback={<p role="status">Loading audio player…</p>}>
          <PreviewPlayer item={preview} onClose={closePreview} />
        </Suspense>
      )}
    </Box>
  );
}
