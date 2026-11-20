# Architecture

## Stack

| Concern       | Choice                                                    | Notes                                           |
| ------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Framework     | Next.js 16 (App Router), React 19, React Compiler         | Static shell; Cache Components on               |
| Map rendering | deck.gl 9 (WebGL2)                                        | GPU layers: tiles, paths, trips, terrain, icons |
| Basemap       | None. Our own tiles through `TileLayer`                   | [ADR-0001](adr/0001-deckgl-without-basemap.md)  |
| Coordinates   | World meters → synthetic Web Mercator                     | [ADR-0002](adr/0002-world-coordinates.md)       |
| Styling       | Tailwind v4 + CSS tokens in `globals.css`                 |                                                 |
| Tooling       | pnpm, Biome, Vitest, Playwright, lefthook, GitHub Actions | [ADR-0003](adr/0003-toolchain.md)               |

## Render pipeline

```
src/app/page.tsx              Server Component, prerendered static HTML
└─ MapShell                   "use client"; next/dynamic(..., { ssr: false })
   └─ MapCanvas               <DeckGL> root: view, controller, layers
      ├─ layers/*.ts          one factory per layer: createXLayer() → Layer
      └─ HUD components       DOM overlay above the canvas
```

- The shell HTML ships first. The deck.gl chunk loads after, behind a loading state.
- HUD containers are `pointer-events-none`, and their controls are `pointer-events-auto`, so drags
  reach the map.

## Coordinates

Game positions are **world meters** (`WorldPoint`): +x east, +y north, origin at the world center.
`worldToLngLat` places them on a synthetic Web Mercator extent at 0°, 0°, where one projected meter
equals one world meter exactly. This lets every deck.gl geospatial layer (TileLayer, TripsLayer,
TerrainLayer, …) work unmodified. Convert at the layer boundary and nowhere else.

## State

| Kind                                                 | Where it lives                                               |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| Camera pose (per frame)                              | deck.gl, uncontrolled; latest pose mirrored in a ref         |
| Camera mode, panels, local UI                        | `useState` in the owning component                           |
| UI state shared across distant components            | A small store, introduced with an ADR when first needed      |
| URL state (camera, layers, selection)                | Written when an interaction ends, debounced; never per frame |
| Persisted user state (explore progress, collections) | `localStorage` behind a versioned, validated schema          |

## Layers

- One file per layer in `src/features/<feature>/layers/`, exporting `createXLayer(params)`.
- Pure data builders are exported separately and unit tested (see `buildGrid`).
- Static data is built once at module scope. Layer `id`s are stable. Accessors that depend on
  changing values use `updateTriggers`.

## Data pipeline (planned)

```
data/            reviewed source data (world-meter GeoJSON/JSON + provenance)
  → scripts/     validate against schema, simplify, convert large sets to binary/columnar
  → public/data/ small datasets shipped with the app
  → CDN          raster tiles (XYZ or PMTiles) built from original artwork; never in git
```

## Deployment

Not chosen yet. Vercel is the natural fit: a preview per PR, and production on merge to `main`.
Record the choice in an ADR.
