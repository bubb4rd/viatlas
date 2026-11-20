# 0004: POI data as validated JSON, clustered in-house

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

POIs are the first real dataset. Every entry needs provenance
([data-and-assets.md](../data-and-assets.md)), bad data must never reach users, and markers must
cluster when zoomed out without re-rendering React on zoom.

## Decision

- **Storage:** `data/pois/<category>.json`, one JSON array per category, in world meters.
- **Validation:** `parsePois` in `src/features/pois/poi.ts` checks schema, world bounds, provenance,
  file/category match, and unique ids. It runs in unit tests (`data.test.ts`), so `pnpm check` and
  CI reject bad data, and again at module load so a bad entry fails loudly instead of rendering.
- **Shipping:** the files are imported statically into the client-only map chunk.
- **Clustering:** greedy radius clustering (`clusterPois`) inside a deck.gl `CompositeLayer`. It
  re-clusters only when the integer zoom changes, read from the layer's viewport, never from React.
- **Visibility:** `speculative` entries are filtered out by default.

## Consequences

- No new dependencies, no build step, and data errors arrive with file and index.
- Adding a category means a new file, a new `POI_CATEGORIES` entry, and an import in `data.ts`;
  the compiler and `data.test.ts` catch a missed step.
- Bundled JSON grows the map chunk. Past a few hundred KB, move to fetched `public/data/` files
  or a binary format, per the planned pipeline in [architecture.md](../architecture.md).
- Clusters snap at integer zoom levels rather than animating apart.
- _Rejected: supercluster._ Hierarchical and fast, but a runtime dependency for a dataset of
  hundreds of points. Revisit at tens of thousands.
- _Rejected: fixed-grid binning._ Simpler, but nearby points on either side of a cell edge render
  as overlapping marker and cluster.
- _Rejected: zod or JSON Schema._ A dependency or a toolchain for ~60 lines of checks.
