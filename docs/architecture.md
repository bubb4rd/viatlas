# Architecture

## Stack

| Concern       | Choice                                                    | Notes                                           |
| ------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Framework     | Next.js 16 (App Router), React 19, React Compiler         | Static shell; Cache Components on               |
| Map rendering | deck.gl 9 (WebGL2)                                        | GPU layers: tiles, paths, trips, terrain, icons |
| Basemap       | None. Our own tiles through `TileLayer`                   | [ADR-0001](adr/0001-deckgl-without-basemap.md)  |
| Coordinates   | World meters → synthetic Web Mercator                     | [ADR-0002](adr/0002-world-coordinates.md)       |
| Styling       | Tailwind v4 + CSS tokens in `globals.css`                 |                                                 |
| UI primitives | Base UI (`@base-ui/react`)                                | [ADR-0005](adr/0005-base-ui-primitives.md)      |
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

URL state lives in the hash as `key=value` params, so the page stays static and the router never
re-renders. The camera is `#map=zoom/x/y` in 2D and `#map=zoom/x/y/pitch/bearing` in 3D, with x/y in
world meters (`src/features/map/url-camera.ts`). It's written with `replaceState` 250 ms after the
camera settles, and read on load and on `hashchange`. Invalid values are clamped, not rejected.
POI filters (`#hide=<categories>`, `#speculative=1`) and the selected POI (`#poi=<id>`) follow the
same read path (`src/features/map/url-pois.ts`) but are written right after the click that changes
them. Default filters are omitted, and a `#poi` id that is unknown or hidden by the filter is dropped.

## Layers

- One file per layer in `src/features/<feature>/layers/`, exporting `createXLayer(params)`.
- Pure data builders are exported separately and unit tested (see `buildGrid`).
- Static data is built once at module scope. Layer `id`s are stable. Accessors that depend on
  changing values use `updateTriggers`.

## Data pipeline

Today: POIs live in `data/pois/<category>.json`, are validated by `pnpm check`, and are bundled into
the map chunk ([ADR-0004](adr/0004-poi-data-and-clustering.md)). Planned as data grows:

```
data/            reviewed source data (world-meter GeoJSON/JSON + provenance)
  → scripts/     validate against schema, simplify, convert large sets to binary/columnar
  → public/data/ small datasets shipped with the app
  → CDN          static 512px XYZ WebP tiles on Cloudflare R2 (ADR-0007); never in git
```

## Deployment

Hosted on **Netlify** (`viatlas.netlify.app`): every PR gets an automatic Deploy Preview URL with
GitHub status checks, and merges to `main` deploy atomically to production
([ADR-0006](adr/0006-netlify-deployment.md)). Feature flags (`NEXT_PUBLIC_FLAG_*`) and public
endpoints are scoped by deploy context; generated raster tiles are served from a dedicated CDN
rather than Netlify.
