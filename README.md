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

