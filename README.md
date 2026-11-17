# NEXT Music Search

React, TypeScript and Vite frontend with Redux Toolkit and Material UI.

## Project structure

```text
next_music/
├── package.json          # npm workspace and root commands
├── tsconfig.base.json    # shared TypeScript compiler settings
├── requirement/
│   ├── task.pdf          # original assessment brief
│   ├── docs/             # engineering rules and original bundle documentation
│   └── UI/nextmusic/     # design reference images
├── server/               # reserved for the backend; currently empty
└── web/                  # React + Vite application
    ├── public/assets/    # static logos, backgrounds and artwork
    ├── src/
    │   ├── app/          # Redux store, typed hooks and theme
    │   ├── components/   # shared page components
    │   ├── data/         # retained legacy file; no catalogue data
    │   ├── features/     # search and audio player
    │   ├── services/     # music API boundary
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── styles.css
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    └── vite.config.ts
```

The original empty asset bundle directory is retained. Its files now live in
`web/public/assets/`, `requirement/docs/nextmusic/` and `requirement/UI/nextmusic/`.
Bundled documentation is preserved verbatim and may describe the original paths.
Static public assets are served at `/assets/...`; Vite copies them into the build.

## Development

From the repository root:

```sh
npm install
npm run dev
```

The development server uses port 5173. All catalogue data comes from the live
Apple iTunes Search API; there is no offline or generated-data fallback.
`VITE_API_BASE_URL` defaults to `https://itunes.apple.com`. To override it,
copy `web/.env.example` to `web/.env.local`, set the URL and restart Vite.
The service appends `/search` to this API base URL. The home link uses Vite's
`import.meta.env.BASE_URL`, so it also works under a configured app subpath.

Search requests use `media=music` and `country=gb`, with separate artist, album
and song queries capped at 50 results each. Results are deduplicated by type and
Apple ID, displayed ten at a time, and another ten are revealed on scroll.
This is progressive disclosure of a bounded response, not server-side pagination
or an exhaustive catalogue count. Any failed entity request displays an error
instead of silently presenting partial results.

The landing cards use the live Adele song query with `limit=10`, showing up to
three distinct artwork URLs returned by Apple, linked to their actual store items.
Loading, unavailable-artwork and retry states do not substitute invented content.
Network failures appear as errors; browser access depends on Apple's CORS response.
The Express backend and proxy are not implemented yet.

```sh
npm run typecheck
npm run build
npm run preview
```

`npm run test` runs the API service and Redux pagination tests with Vitest. Network responses are
isolated in tests; application requests always use the live API. Tests cover
query parameters, normalization, deduplication, featured artwork, empty results,
invalid responses, request failures and cancellation.

The server directory is not an npm workspace until a backend package exists.

## Previews and visible result batches

Song rows display a play control only when Apple supplies a preview URL. The
responsive player uses native browser audio controls for play, pause, seeking
and volume, shows the clip's actual duration and links to Apple Music. The
preview is a short clip, not the full song; the row duration is the full track's
metadata, while the player duration is the available clip length.

Results include persistent batch markers (1–10, 11–20, etc.), a next-batch button
and a polite count announcement. The initial request displays ten skeleton rows.
Further rows are already fetched; rendering uses a deferred update with skeletons
while pending, without a simulated network delay or continuous loading spinner.
Changing a result filter returns the list to ten items.

## Lighthouse checks

Audit the production build with `npm run build` followed by `npm run preview`,
then open the preview URL printed by Vite. Keep the browser tab in the foreground
during an audit. The initial HTML includes visible startup content and a module
load error message; real catalogue requests do not block the first render.
Library imports use direct component paths to reduce Vite development work,
and the audio player is loaded only when needed. A NO_FCP audit result does not
by itself identify a root cause; inspect console/network errors if it recurs.
