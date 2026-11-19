import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchResults } from "./SearchResults";
import searchReducer, { runSearch } from "./searchSlice";
import type { MusicItem } from "./types";

const matches: MusicItem[] = (["artist", "song", "album"] as const).flatMap((kind) =>
  Array.from({ length: kind === "song" ? 23 : 2 }, (_, index) => ({
    id: `${kind}:${index}`,
    kind,
    title: `${kind} ${index}`,
    artist: "Test artist",
    artwork: "",
  })),
);

function renderResults(items = matches) {
  const store = configureStore({ reducer: { search: searchReducer } });
  store.dispatch(runSearch.pending("initial", "Music"));
  store.dispatch(runSearch.fulfilled({ term: "Music", items }, "initial", "Music"));
  const onSearch = vi.fn();
  const onRetry = vi.fn();
  render(
    <Provider store={store}>
      <SearchResults onSearch={onSearch} onRetry={onRetry} onPreview={vi.fn()} />
    </Provider>,
  );
  return { store, onSearch, onRetry };
}

// ===== Viewport Simulation =====
// jsdom has no layout or scrolling; tests supply positions and dispatch scroll events explicitly.
beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("search results", () => {
  it("shows ten matches by default with an accurate result announcement", () => {
    renderResults();
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByRole("status").textContent).toBe("Showing 10 of 27 returned matches for “Music”");
    expect(screen.getByRole("button", { name: "All (27)" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("waits until scrolling brings the end marker into view", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, window.innerHeight + 100, 1, 1));
    renderResults();
    fireEvent.scroll(window);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  it("reveals one batch for repeated events, then stops at the final match", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 1, 1));
    renderResults();
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    expect(screen.getByRole("status").textContent).toContain("Showing 20 of 27");
    fireEvent.scroll(window);
    expect(screen.getAllByRole("listitem")).toHaveLength(27);
    expect(screen.queryByRole("button", { name: /Show .* more/ })).toBeNull();
    expect(screen.getByText("You've reached the end of these results.")).toBeTruthy();
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0].textContent).toContain("Artists");
    expect(headings[1].textContent).toContain("Songs");
    expect(headings[2].textContent).toContain("Albums");
    fireEvent.scroll(window);
    expect(screen.getAllByRole("listitem")).toHaveLength(27);
  });

  it("supports Show more and resets to ten when filtering", async () => {
    const user = userEvent.setup();
    const { store } = renderResults();
    await user.click(screen.getByRole("button", { name: "Show 10 more" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    await user.click(screen.getByRole("button", { name: "Songs (23)" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(store.getState().search.visibleCount).toBe(10);
    expect(screen.getByRole("status").textContent).toBe("Showing 10 of 23 returned matches for “Music”");
    expect(screen.queryByRole("heading", { name: /^Artists/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Albums (2)" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("status").textContent).toContain("Showing 2 of 2");
  });

  it("clears previous rows during loading and resets filters for a new query", async () => {
    const user = userEvent.setup();
    const { store } = renderResults();
    await user.click(screen.getByRole("button", { name: "Songs (23)" }));
    act(() => { store.dispatch(runSearch.pending("next", "New artist")); });
    expect(screen.getByRole("status").textContent).toBe("Searching the catalogue…");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    const items: MusicItem[] = [{ id: "artist:99", kind: "artist", title: "New artist", artist: "New artist", artwork: "" }];
    act(() => { store.dispatch(runSearch.fulfilled({ term: "New artist", items }, "next", "New artist")); });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "All (1)" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("New artist")).toBeTruthy();
  });

  it("announces empty results and offers working suggested searches", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderResults([]);
    expect(screen.getByRole("heading", { name: "No results found" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("No results found for “Music”");
    await user.click(screen.getByRole("button", { name: "Adele" }));
    expect(onSearch).toHaveBeenCalledWith("Adele");
  });

  it("distinguishes errors from empty results and provides retry", async () => {
    const user = userEvent.setup();
    const { store, onRetry } = renderResults();
    act(() => {
      store.dispatch(runSearch.pending("failed", "Music"));
      store.dispatch(runSearch.rejected(new Error("Catalogue unavailable"), "failed", "Music"));
    });
    expect(screen.getByRole("alert").textContent).toBe("Catalogue unavailable");
    expect(screen.queryByRole("heading", { name: "No results found" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
