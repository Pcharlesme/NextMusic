import { describe, expect, it } from "vitest";
import reducer, { resetVisibleCount, revealMore, runSearch } from "./searchSlice";
import type { MusicItem } from "./types";

const items: MusicItem[] = Array.from({ length: 25 }, (_, index) => ({
  id: `song:${index}`,
  kind: "song",
  title: `Song ${index}`,
  artist: "Test artist",
  artwork: "",
}));

function populated() {
  const pending = reducer(undefined, runSearch.pending("request-1", "Adele"));
  return reducer(pending, runSearch.fulfilled({ term: "Adele", items }, "request-1", "Adele"));
}

describe("search state", () => {
  it("starts idle without results", () => {
    expect(reducer(undefined, { type: "unknown" })).toMatchObject({ status: "idle", query: "", items: [], visibleCount: 10, error: null });
  });

  it("reveals ten at a time and stops at the response boundary", () => {
    let state = populated();
    expect(state.visibleCount).toBe(10);
    state = reducer(state, revealMore());
    expect(state.visibleCount).toBe(20);
    state = reducer(state, revealMore());
    expect(state.visibleCount).toBe(25);
    expect(reducer(state, revealMore()).visibleCount).toBe(25);
  });

  it("resets visibility without discarding results when a filter changes", () => {
    const state = reducer(populated(), revealMore());
    const reset = reducer(state, resetVisibleCount());
    expect(reset.visibleCount).toBe(10);
    expect(reset.items).toEqual(items);
  });

  it("clears old results and errors for a new search", () => {
    const pending = reducer(populated(), runSearch.pending("failed", "Unknown"));
    const failed = reducer(pending, runSearch.rejected(new Error("Unavailable"), "failed", "Unknown"));
    const next = reducer(failed, runSearch.pending("new", "Coldplay"));
    expect(next).toMatchObject({ query: "Coldplay", status: "loading", items: [], visibleCount: 10, error: null, activeRequestId: "new" });
  });

  it("ignores stale successes and errors while a newer search is pending", () => {
    const pending = reducer(populated(), runSearch.pending("new", "Coldplay"));
    const staleSuccess = reducer(pending, runSearch.fulfilled({ term: "Adele", items }, "request-1", "Adele"));
    const staleError = reducer(pending, runSearch.rejected(new Error("Old failure"), "request-1", "Adele"));
    expect(staleSuccess).toEqual(pending);
    expect(staleError).toEqual(pending);
  });

  it("does not replace completed newer results with a late response", () => {
    const pending = reducer(populated(), runSearch.pending("new", "Coldplay"));
    const latest = reducer(pending, runSearch.fulfilled({ term: "Coldplay", items: items.slice(0, 2) }, "new", "Coldplay"));
    expect(reducer(latest, runSearch.fulfilled({ term: "Adele", items }, "request-1", "Adele"))).toEqual(latest);
    expect(reducer(latest, runSearch.rejected(new Error("Old failure"), "request-1", "Adele"))).toEqual(latest);
  });

  it("distinguishes successful empty results from request failure", () => {
    const pending = reducer(undefined, runSearch.pending("request", "Unknown"));
    const empty = reducer(pending, runSearch.fulfilled({ term: "Unknown", items: [] }, "request", "Unknown"));
    const failed = reducer(pending, runSearch.rejected(new Error("Unavailable"), "request", "Unknown"));
    expect(empty).toMatchObject({ status: "empty", error: null, activeRequestId: null });
    expect(failed).toMatchObject({ status: "error", error: "Unavailable", activeRequestId: null });
  });

  it("returns to idle when the current request is cancelled", () => {
    const pending = reducer(undefined, runSearch.pending("cancelled", "Adele"));
    const cancelled = reducer(pending, runSearch.rejected({ name: "AbortError", message: "Aborted" }, "cancelled", "Adele"));
    expect(cancelled.status).toBe("idle");
    expect(cancelled.activeRequestId).toBeNull();
  });
});
