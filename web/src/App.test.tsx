import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { ThemeProvider } from "@mui/material/styles";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { theme } from "./app/theme";
import searchReducer from "./features/search/searchSlice";

const songs = Array.from({ length: 25 }, (_, index) => ({
  wrapperType: "track",
  kind: "song",
  trackId: index + 1,
  trackName: `Song ${index + 1}`,
  artistName: "Coldplay",
  artworkUrl100: "https://example.test/100x100bb.jpg",
  previewUrl: `https://example.test/preview-${index + 1}.m4a`,
  trackViewUrl: `https://music.apple.com/song/${index + 1}`,
}));
const featured = [{ ...songs[0], trackId: 99, trackName: "Featured song", artistName: "Adele" }];
const fetchMock = vi.fn<typeof fetch>();

function renderApp() {
  const store = configureStore({ reducer: { search: searchReducer } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </Provider>,
  );
  return store;
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input) => {
    const term = new URL(String(input), "http://localhost").searchParams.get("term");
    return new Response(JSON.stringify({ results: term === "Adele" ? featured : songs }));
  });
  vi.stubGlobal("fetch", fetchMock);
  // ===== Browser APIs =====
  // jsdom cannot scroll or play media; user interactions still exercise the actual React components and Redux thunk.
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("music search page", () => {
  it("submits a trimmed query with Enter and renders the first ten results", async () => {
    const user = userEvent.setup();
    renderApp();
    const input = screen.getByRole<HTMLInputElement>("textbox", { name: "Search music" });
    await user.type(input, "  Coldplay  {Enter}");
    expect(await screen.findByText("Showing 10 of 25 returned matches for “Coldplay”")).toBeTruthy();
    const results = screen.getByRole("region", { name: "Search results" });
    expect(within(results).getAllByRole("listitem")).toHaveLength(10);
    expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/search?term=Coldplay")).toBe(true);
    expect(input.value).toBe("Coldplay");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
  });

  it("announces loading while a request is pending, then reports no results", async () => {
    const user = userEvent.setup();
    let complete!: (response: Response) => void;
    fetchMock.mockImplementation((input) => {
      const term = new URL(String(input), "http://localhost").searchParams.get("term");
      if (term === "Adele") return Promise.resolve(new Response(JSON.stringify({ results: featured })));
      return new Promise<Response>((resolve) => { complete = resolve; });
    });
    renderApp();
    await user.type(screen.getByRole("textbox", { name: "Search music" }), "Unmatched{Enter}");
    const results = screen.getByRole("region", { name: "Search results" });
    expect(within(results).getByRole("status").textContent).toBe("Searching the catalogue…");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Searching…" }).disabled).toBe(true);
    await act(async () => { complete(new Response(JSON.stringify({ results: [] }))); });
    expect(await screen.findByRole("heading", { name: "No results found" })).toBeTruthy();
    expect(within(results).getByRole("status").textContent).toBe("No results found for “Unmatched”");
  });

  it("retries a failed query without showing it as an empty search", async () => {
    const user = userEvent.setup();
    let failed = true;
    fetchMock.mockImplementation(async (input) => {
      const term = new URL(String(input), "http://localhost").searchParams.get("term");
      if (term === "Adele") return new Response(JSON.stringify({ results: featured }));
      return failed
        ? new Response(JSON.stringify({ error: "Catalogue offline" }), { status: 502 })
        : new Response(JSON.stringify({ results: songs }));
    });
    renderApp();
    await user.type(screen.getByRole("textbox", { name: "Search music" }), "Coldplay{Enter}");
    expect((await screen.findByRole("alert")).textContent).toBe("Catalogue offline");
    expect(screen.queryByRole("heading", { name: "No results found" })).toBeNull();
    failed = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Showing 10 of 25 returned matches for “Coldplay”")).toBeTruthy();
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/search?term=Coldplay")).toHaveLength(2);
  });

  it("cancels an older request when a suggested query replaces it", async () => {
    const user = userEvent.setup();
    let oldSignal: AbortSignal | null | undefined;
    fetchMock.mockImplementation((input, options) => {
      const term = new URL(String(input), "http://localhost").searchParams.get("term");
      if (term === "Slow search") {
        oldSignal = options?.signal;
        return new Promise<Response>((_resolve, reject) => {
          oldSignal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
        });
      }
      return Promise.resolve(new Response(JSON.stringify({ results: term === "Adele" ? featured : songs })));
    });
    const store = renderApp();
    await user.type(screen.getByRole("textbox", { name: "Search music" }), "Slow search{Enter}");
    await user.click(screen.getByRole("button", { name: "Coldplay" }));
    expect(await screen.findByText("Showing 10 of 25 returned matches for “Coldplay”")).toBeTruthy();
    expect(oldSignal?.aborted).toBe(true);
    expect(store.getState().search).toMatchObject({ query: "Coldplay", status: "success", error: null });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("contains media failures, keeps one player and restores keyboard focus", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.type(screen.getByRole("textbox", { name: "Search music" }), "Coldplay{Enter}");
    const first = await screen.findByRole("button", { name: "Play preview of Song 1 by Coldplay" });
    first.focus();
    await user.keyboard("{Enter}");
    const firstAudio = screen.getByLabelText("Audio preview of Song 1 by Coldplay");
    fireEvent.error(firstAudio);
    expect((await screen.findByRole("alert")).textContent).toContain("This preview could not be played.");
    expect(screen.getByRole("search", { name: "Music catalogue" })).toBeTruthy();
    const second = screen.getByRole("button", { name: "Play preview of Song 2 by Coldplay" });
    await user.click(second);
    expect(screen.getByLabelText("Audio preview of Song 2 by Coldplay")).toBeTruthy();
    expect(document.querySelectorAll("audio")).toHaveLength(1);
    expect(document.contains(firstAudio)).toBe(false);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    screen.getByRole("button", { name: "Close preview player" }).focus();
    await user.keyboard("{Escape}");
    expect(document.querySelector("audio")).toBeNull();
    expect(document.activeElement).toBe(second);
  });
});
