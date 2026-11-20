# 0002: World meters on a synthetic Web Mercator extent

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

deck.gl's richest layers (TileLayer, TripsLayer, TerrainLayer) assume geographic coordinates and
Web Mercator. Our data describes a flat game world, where positions are naturally meters.

## Decision

- All game data is stored and handled as **world meters**: `WorldPoint = [x, y]`, with +x east,
  +y north, and the origin at the world center.
- `worldToLngLat` / `lngLatToWorld` in `src/features/map/world.ts` map world meters to lng/lat
  through the exact inverse Web Mercator projection, centered at 0°, 0°. One projected meter
  equals one world meter, so there's no distortion.
- Conversion happens only where a deck.gl layer is built.

## Consequences

- Every geospatial layer works unmodified, and tiles follow the standard XYZ scheme over that extent.
- Data files stay human-meaningful (meters) and independent of the rendering engine.
- Meter-based sizes in deck.gl (`widthUnits: "meters"`, extrusion heights) are off by under 0.001%
  at our latitudes, which is negligible.
- `WORLD_BOUNDS` is a placeholder until the real map extent is known. Changing it means
  regenerating tiles.
- _Rejected: `OrthographicView` with raw meters._ It has no pitch or bearing (so no 3D mode), and
  TileLayer and TripsLayer need extra work.
