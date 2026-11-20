# 0001: deck.gl standalone, no third-party basemap

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

Leonida is fictional, so Mapbox, MapLibre styles, ArcGIS, and Google basemaps have nothing to show
for it. We need fast 2D top-down rendering, a pitched 3D mode, animated paths (TripsLayer), terrain,
and thousands of markers, all at 60 fps.

## Decision

Render everything with deck.gl 9 on its own, using a `MapView`, with no basemap library. The base
map is our own raster or vector tiles, served through `TileLayer`. We borrow visual ideas from
deck.gl's ArcGIS and 3D examples, but not their dependencies.

## Consequences

- One rendering engine, one camera model, and a smaller bundle than deck.gl plus a basemap library.
- Every geospatial layer is available: TileLayer, TripsLayer, TerrainLayer, IconLayer, and the rest.
- We have to build what basemap libraries provide for free: label placement (TextLayer with
  collision filtering), a tile pipeline, and attribution UI.
- _Rejected: MapLibre + deck.gl interleaved._ It's only worth it for real-world vector styles we
  don't have. We can revisit if we ever author MapLibre style JSON for our own vector tiles.
- _Rejected: Three.js / react-three-fiber._ Better for freeform 3D, but we'd lose deck.gl's tiling,
  picking, and data layers.
