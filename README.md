# NextMusic

A React and Express application built for the NEXT frontend assessment. Search the iTunes catalogue for artists, albums and songs, view matching results, and reveal ten more items as you scroll.

![NextMusic landing page with search and featured song previews](web/public/assets/localhost_5173_%20%283%29.png)

<details>
<summary>See search results and the audio player</summary>

**Artists and albums**

![Coldplay search results with type filters and album artwork](web/public/assets/Screenshot%202026-11-18%20at%2001.45.52.png)

**Songs and playback**

![Song results with the fixed audio-preview player](web/public/assets/Screenshot%202026-11-18%20at%2001.46.42.png)

</details>

## Features

**Assessment requirements:** artist, album and song search; matching results; ten-at-a-time scroll reveal; explicit no-results feedback.

**Optional:** type filters, suggestions, artwork, Apple Music links and a shared preview player. Loading skeletons, empty/error messages and retry controls cover request states.

## Tech stack

| Technology | Responsibility |
| --- | --- |
| React + TypeScript | Typed UI components and application behavior. |
| Redux Toolkit + Redux Thunk | Search state, asynchronous requests and visible-result count. |
| Vite | Frontend development server and production build. |
| Material UI + Emotion + CSS | Shared controls, theme and responsive layouts. |
| Node.js + Express | iTunes proxy, health endpoint and production static serving. |
| Vitest | API-service, Redux and Express endpoint tests. |

## Getting started

Requires **Node.js 22.18+** and npm. No API key or environment file is required.

```sh
git clone https://github.com/Pcharlesme/NextMusic.git
cd NextMusic
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to Express on **3001**. Catalogue data requires both servers; there is no offline fallback.

To run them in separate terminals:

```sh
npm run dev --workspace=@nextmusic/server
npm run dev --workspace=@nextmusic/web
```

Build and run production:

```sh
npm run build
npm start
```

Open **http://localhost:3001**. Express serves `web/dist` and the API together. Production accepts `PORT=8080 npm start`; development's proxy expects port 3001.

```sh
npm test                 # Frontend and Express tests
npm run typecheck        # Both TypeScript workspaces
```

No lint script is configured. Vite preview alone does not provide the API.

## Project structure

```text
server/
  index.ts               Express API and production hosting
  index.test.ts          HTTP endpoint and delivery tests
web/src/
  app/                   Redux store, typed hooks and MUI theme
  components/            Search form, header and suggestions
  features/search/       Search state, filters and result components
  features/player/       Shared audio-preview player
  services/              API requests, normalization and tests
  data/                  Suggested search terms
web/public/assets/       Branding and screenshots
requirement/             Assessment brief and local review notes
```

## Architecture and data flow

**Search form → Redux thunk → API service → Express → iTunes → normalized results → React.**

`SearchHero` submits the term; `runSearch` manages request state. `musicApi.ts` calls Express and normalizes/deduplicates the response. Express validates queries and contacts Apple; result components handle presentation and filtering.

## Key implementation decisions

- **Redux Toolkit and Thunk:** keep asynchronous search and loading/error/empty states together. Request IDs prevent old responses from replacing newer searches.
- **Express proxy:** avoids direct browser-to-Apple CORS dependencies and also fulfills the brief's Node.js static-serving requirement.
- **Result types:** one normalized model feeds separate artist, album and song lists, in that order.
- **Scrolling:** show ten fetched items, then reveal ten more at the end marker. Filters reset visibility; Show more provides an alternative. This is **not server-side pagination**.
- **Failures:** browser requests time out after 15 seconds; Apple requests after ten. Errors remain separate from successful empty results.
- **Accessibility:** labeled native form, Enter submission, skip link, visible focus, semantic headings/lists, status announcements and native audio controls. Closing the player restores focus to its trigger.
- **Delivery:** compression reduces transfer; versioned JS/CSS is cached long-term while HTML revalidates.

## Testing

```sh
npm test
```

**Latest verification: 49 tests passed**—19 frontend and 30 Express tests. Coverage includes API normalization, cancellation/timeouts, Redux visibility and stale responses, empty/error states, endpoint validation, static serving, compression and caching. Express tests use real local HTTP requests with Apple isolated.

UI interactions were checked separately in Chrome; repeatable UI tests are not yet in the repository.

## Limitations and trade-offs

- Apple controls artwork and preview availability. Missing artwork uses fallbacks; previews are short clips, not full tracks.
- Multi-entity `limit=50` requests can return more than fifty combined records. Counts describe the fetched selection, not the entire catalogue.
- Featured music depends on a live query. External API, artwork and font timing can affect Lighthouse results; there is no guaranteed score.
- Album cards use a grid inside a semantic list. This differs from `skill.md`'s vertical-row direction, although the PDF leaves presentation flexible.

## Deployment

No public deployment URL is verified. On a Node.js host, install dependencies including build tools, run `npm run build`, then `npm start`. Preserve the workspace layout so Express can find `web/dist`; set `PORT` if required.

Check the running server:

```sh
curl http://localhost:3001/api/health
curl 'http://localhost:3001/api/search?term=Adele'
```

Health returns `{"status":"ok","service":"nextmusic"}`; it confirms Express is running, not Apple's availability.

## Assessment compliance

- [x] Search artists, albums and songs through iTunes.
- [x] Display matching results and explicit no-results feedback.
- [x] Show ten initially and reveal another ten on scroll.
- [x] React, TypeScript, Redux and Redux Thunk.
- [x] Node.js + Express static serving.
- [x] Meaningful automated unit and endpoint tests.

Catalogue data, artwork and previews are provided by Apple iTunes. Screenshots illustrate particular searches; live results can change. `requirement/` is Git-ignored, so local assessment notes are not automatically included in a clone.
