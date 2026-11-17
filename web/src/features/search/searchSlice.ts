import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { searchMusic } from "../../services/musicApi";
import type { MusicItem, SearchStatus } from "./types";
// ===== Search Requests =====
// Redux Thunk connects the API result to a single loading, success, empty or error state.
export const runSearch = createAsyncThunk("search/run", async (term: string, { signal }) => ({
  term,
  items: await searchMusic(term, signal),
}));
// ===== Search State =====
// Keep fetched items separate from how many the user has revealed.
interface SearchState {
  query: string;
  items: MusicItem[];
  status: SearchStatus;
  error: string | null;
  visibleCount: number;
  activeRequestId: string | null;
}
const initialState: SearchState = {
  query: "",
  items: [],
  status: "idle",
  error: null,
  visibleCount: 10,
  activeRequestId: null,
};
const slice = createSlice({
  name: "search",
  initialState,
  reducers: {
    // ===== Progressive Result Visibility =====
    // Reveal ten more fetched items and stop at the response boundary.
    revealMore(s) {
      s.visibleCount = Math.min(s.items.length, s.visibleCount + 10);
    },
    resetVisibleCount(s) {
      s.visibleCount = 10;
    },
  },
  // ===== Stale Request Protection =====
  // Only the latest request may replace results or report an error.
  extraReducers: (b) =>
    b
      .addCase(runSearch.pending, (s, a) => {
        s.query = a.meta.arg;
        s.status = "loading";
        s.error = null;
        s.items = [];
        s.visibleCount = 10;
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
