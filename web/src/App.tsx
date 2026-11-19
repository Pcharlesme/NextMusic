import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Header } from "./components/Header";
import { SearchHero } from "./components/SearchHero";
import { SearchResults } from "./features/search/SearchResults";
import { PreviewPlayer } from "./features/player/PreviewPlayer";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { runSearch } from "./features/search/searchSlice";
import type { MusicItem } from "./features/search/types";

export default function App() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.search.status);
  const query = useAppSelector((s) => s.search.query);
  const [preview, setPreview] = useState<MusicItem | null>(null);
  const request = useRef<{ abort: () => void } | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  const openPreview = (item: MusicItem) => {
    if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement;
    setPreview(item);
  };

  const closePreview = () => {
    setPreview(null);
    const target = returnFocus.current?.isConnected ? returnFocus.current : document.getElementById("music-query");
    returnFocus.current = null;
    target?.focus({ preventScroll: true });
  };

  const search = (term: string) => {
    request.current?.abort();
    request.current = dispatch(runSearch(term));
  };

  return (
    <Box sx={{ minHeight: "100vh", overflowX: "hidden" }}>
      <Header />
      <Box component="main" id="main-content" tabIndex={-1}>
        <SearchHero onSearch={search} onPreview={openPreview} playingId={preview?.id} loading={status === "loading"} />
        <SearchResults onSearch={search} onRetry={() => search(query)} onPreview={openPreview} playingId={preview?.id} />
      </Box>
      <Box component="footer" id="about" sx={{ borderTop: "1px solid #dddddd", py: 3, mt: 2 }}>
        <Container maxWidth="xl">
          <Stack direction={{ xs: "column", sm: "row" }} gap={1} justifyContent="space-between">
            <Typography fontWeight={800}>
              NextMusic
              <Box component="span" sx={{ fontWeight: 400, color: "#595959" }}>
                {" "}
                · Discover more.
              </Box>
            </Typography>
            <Typography fontSize={13} color="text.secondary">
              Search artists, albums and songs. Music data, artwork and previews provided by Apple iTunes.
            </Typography>
          </Stack>
        </Container>
      </Box>
      {preview && <PreviewPlayer item={preview} onClose={closePreview} />}
    </Box>
  );
}
