import { describe, expect, it } from "vitest";
import reducer, { resetVisibleCount, revealMore, runSearch } from "./searchSlice";
import type { MusicItem } from "./types";

const items: MusicItem[] = Array.from({ length: 25 }, (_, index) => ({
  id: `song:${index}`,
  kind: "song",
  title: `Track ${index}`,
  artist: "Test artist",
  artwork: "",
}));
function populated() {
  const pending = reducer(undefined, runSearch.pending("request-1", "Adele"));
  return reducer(pending, runSearch.fulfilled({ term: "Adele", items }, "request-1", "Adele"));
}

describe("ten-at-a-time results", () => {
  it("shows ten first, then ten more, and stops at the response boundary", () => {
    let state = populated();
    expect(state.visibleCount).toBe(10);
    state = reducer(state, revealMore());
    expect(state.visibleCount).toBe(20);
    state = reducer(state, revealMore());
    expect(state.visibleCount).toBe(25);
    expect(reducer(state, revealMore()).visibleCount).toBe(25);
  });

  it("resets the visible count for a changed filter", () => {
    const state = reducer(populated(), revealMore());
    const reset = reducer(state, resetVisibleCount());
    expect(reset.visibleCount).toBe(10);
    expect(reset.items).toHaveLength(25);
  });

  it("clears previous results and resets to ten for a new search", () => {
    const state = reducer(populated(), revealMore());
    const pending = reducer(state, runSearch.pending("request-2", "Coldplay"));
    expect(pending.visibleCount).toBe(10);
    expect(pending.items).toEqual([]);
    expect(pending.status).toBe("loading");
  });

  it("ignores a stale response while a newer search is pending", () => {
    const pending = reducer(populated(), runSearch.pending("request-2", "Coldplay"));
    const stale = reducer(pending, runSearch.fulfilled({ term: "Adele", items }, "request-1", "Adele"));
    expect(stale.query).toBe("Coldplay");
    expect(stale.status).toBe("loading");
    expect(stale.items).toEqual([]);
  });
  it("marks a successful empty response separately from a failed request", () => {
    const pending = reducer(undefined, runSearch.pending("empty-request", "Unknown"));
    const empty = reducer(pending, runSearch.fulfilled({ term: "Unknown", items: [] }, "empty-request", "Unknown"));
    expect(empty.status).toBe("empty");
    expect(empty.error).toBeNull();
    const failed = reducer(pending, runSearch.rejected(new Error("Unavailable"), "empty-request", "Unknown"));
    expect(failed.status).toBe("error");
    expect(failed.error).toBe("Unavailable");
  });

  it("ignores errors from a superseded request", () => {
    const pending = reducer(populated(), runSearch.pending("request-2", "Coldplay"));
    const stale = reducer(pending, runSearch.rejected(new Error("Old failure"), "request-1", "Adele"));
    expect(stale.status).toBe("loading");
    expect(stale.error).toBeNull();
    expect(stale.activeRequestId).toBe("request-2");
  });

  it("returns to idle when the active request is cancelled", () => {
    const pending = reducer(undefined, runSearch.pending("cancelled", "Adele"));
    const cancelled = reducer(pending, runSearch.rejected({ name: "AbortError", message: "Aborted" }, "cancelled", "Adele"));
    expect(cancelled.status).toBe("idle");
    expect(cancelled.activeRequestId).toBeNull();
  });

});
