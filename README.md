# NextMusic

Search artists, albums and songs from the iTunes catalogue and play 30-second previews.

React, TypeScript, Redux Toolkit and Material UI on the frontend; a small Express server that proxies the iTunes Search API and serves the built app.

## Project structure

```text
next_music/
├── server/
│   └── index.ts          # Express: GET /api/search + static hosting of web/dist
├── web/
│   ├── public/assets/    # logo and background art
│   └── src/
│       ├── app/          # Redux store, typed hooks, MUI theme
│       ├── components/   # header, hero search, spotlight, artwork, suggestions
│       ├── data/         # popular search terms
│       ├── features/     # search (slice, results, rows) and the preview player
│       └── services/     # musicApi.ts, the only place that talks to the backend
└── requirement/          # brief, docs and design references
```

## How search works

The browser calls `GET /api/search?term=…`. The server validates the term and makes a single request to
`https://itunes.apple.com/search` with `entity=musicArtist,album,song`, so artists, albums and songs come back together.
The frontend normalizes the results, shows ten at a time and reveals ten more as you scroll.

## Development

Requires Node.js 22.18 or newer (the server runs TypeScript directly).

```sh
npm install
npm run dev        # Express on :3001 and Vite on :5173 (Vite proxies /api)
```

## Production

```sh
npm run build
npm start          # serves the app and API on PORT (default 3001)
```

## Checks

```sh
npm run typecheck
npm test
```
