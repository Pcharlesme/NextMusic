import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { searchMusic } from "../../services/musicApi";
import type { MusicItem, SearchStatus } from "./types";

export const runSearch = createAsyncThunk("search/run", async (term: string, { signal }) => ({
  term,
  items: await searchMusic(term, signal),
}));

interface SearchState {
  query: string;
  items: MusicItem[];
  status: SearchStatus;
  error: string | null;
  visibleCount: number;
  activeRequestId: string | null;
}

const PAGE_SIZE = 10;

const initialState: SearchState = {
  query: "",
  items: [],
  status: "idle",
  error: null,
  visibleCount: PAGE_SIZE,
  activeRequestId: null,
};

const slice = createSlice({
  name: "search",
  initialState,
  reducers: {
    revealMore(s) {
      s.visibleCount = Math.min(s.items.length, s.visibleCount + PAGE_SIZE);
    },
    resetVisibleCount(s) {
      s.visibleCount = PAGE_SIZE;
    },
  },
  extraReducers: (b) =>
    b
      .addCase(runSearch.pending, (s, a) => {
        s.query = a.meta.arg;
        s.status = "loading";
        s.error = null;
        s.items = [];
        s.visibleCount = PAGE_SIZE;
        s.activeRequestId = a.meta.requestId;
      })
      .addCase(runSearch.fulfilled, (s, a) => {
        if (s.activeRequestId !== a.meta.requestId) return;
        s.items = a.payload.items;
        s.status = s.items.length ? "success" : "empty";
        s.activeRequestId = null;
      })
      .addCase(runSearch.rejected, (s, a) => {
        if (s.activeRequestId !== a.meta.requestId) return;
        s.status = a.meta.aborted ? "idle" : "error";
        s.error = a.error.message || "Search failed";
        s.activeRequestId = null;
      }),
});

export const { revealMore, resetVisibleCount } = slice.actions;
export default slice.reducer;
