# 0007: Static 512px XYZ WebP base tiles on Cloudflare R2

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

Viatlas renders Leonida without a third-party basemap ([ADR-0001](0001-deckgl-without-basemap.md))
over a synthetic Web Mercator extent centered at 0°, 0° ([ADR-0002](0002-world-coordinates.md)).
Before building the tile pyramid generator (`#16`), the `TileLayer` component (`#17`), or original
base map artwork (`#18`), we need a tile format, zoom pyramid, coordinate bounds mapping, CDN host,
and failure behavior optimized for **60 fps performance, launch-day scalability, dependability, and
security** within our ≤ 100 KB/tile budget ([standards.md](../standards.md#performance-budgets))
and git-exclusion policy ([data-and-assets.md](../data-and-assets.md#formats-and-storage)).

## Decision

- **Format:** static **512×512 px WebP** raster tiles in standard Slippy Map XYZ layout at
  `/{version}/{z}/{x}/{y}.webp`, accompanied by a small `/{version}/manifest.json` (version,
  world bounds, `minZoom`, `maxZoom`, `tileSize`, tile count, max byte size).
  - 512 px tiles match deck.gl's 512 px zoom-0 tile size (`cluster.ts`), cut HTTP requests by 4×
    vs. 256 px tiles, and stay sharp on HiDPI displays.
  - WebP decodes in 1–3 ms across all modern browsers (protecting our 50 ms long-task budget) while
    staying well under the **≤ 100 KB/tile** ceiling, which the build script enforces as a hard
    failure.
- **Zoom pyramid:** `minZoom: 10`, `maxZoom: 16`, with deck.gl `TileLayer` smoothly overzooming up
  to camera `maxZoom: 18` (`INITIAL_VIEW_STATE.maxZoom`).
  - Over the current `WORLD_BOUNDS` (`24 km × 32 km`), `z10–z16` produces ~3,000 tiles (~60–150 MB
    total). Even if the final map doubles in size, the pyramid stays in the low tens of thousands of
    static files.
- **World-meter bounds mapping:** convert `WORLD_BOUNDS` (`minX/minY/maxX/maxY`) via
  `worldToLngLat` into `[minLng, minLat, maxLng, maxLat]` and pass that `extent` to `TileLayer`.
  The tile builder slices source artwork against the exact same synthetic Web Mercator projection
  so raster pixels align 1:1 with world-meter POIs and grid lines.
- **CDN hosting:** **Cloudflare R2** served through a read-only custom domain configured via
  `NEXT_PUBLIC_TILE_BASE_URL` (documented in `.env.example` when `#17` lands).
  - **Scalability & cost safety:** R2 charges **$0 egress**, removing surprise bandwidth bills or
    traffic-spike cutoffs on viral release days, while Cloudflare's edge cache absorbs >95% of
    reads.
  - **Immutable versioning & dependability:** every tile release publishes under a new immutable
    prefix (`v1`, `v2`, …) with `Cache-Control: public, max-age=31536000, immutable`. Updating the
    map requires zero cache purges, enables atomic cutover + instant rollback by switching the
    version prefix, and stays decoupled from Netlify app deploys ([ADR-0006](0006-netlify-deployment.md)).
  - **Security:** the R2 bucket stays private behind the read-only custom domain; publish credentials
    are scoped write tokens used only in offline/CI tile publishing (never in git or client env).
    Responses allow only `GET`/`HEAD`, set `X-Content-Type-Options: nosniff` and
    `Content-Type: image/webp`, and restrict CORS (`Access-Control-Allow-Origin`) to production and
    Netlify preview origins so WebGL textures load cleanly with `crossOrigin="anonymous"`.
- **Local dev & failure/fallback behavior:**
  - `data/raw/` and `public/tiles/` remain gitignored. Locally, `NEXT_PUBLIC_TILE_BASE_URL=/tiles`
    serves developer-built tiles; when unset, `TileLayer` stays inactive and the tactical grid +
    POIs render normally.
  - Tiles outside `extent` are never fetched. HTTP `404` responses (sparse ocean edges) return
    `null` cleanly without breaking neighbors.
  - Network/5xx failures surface a visible, non-blocking HUD error banner with a retry button
    ([standards.md](../standards.md#errors-and-logging)), leaving the grid and POI layers fully
    interactive.

## Consequences

- **Zero new runtime dependencies:** deck.gl 9 `TileLayer` + `BitmapLayer` consume standard XYZ
  WebP URLs directly with browser `ImageBitmap` decoding and no extra client parser or initial
  directory round-trips.
- Plain `GET` requests over HTTP/2 and HTTP/3 maximize CDN hit ratios and avoid proxy/firewall
  breakage on byte-range requests.
- Changing `WORLD_BOUNDS` or source artwork requires regenerating and uploading a new versioned
  prefix (fast for ~3k–30k tiles).
- _Rejected: PMTiles._ Clean single-file archive, but adds a runtime client dependency (`pmtiles`),
  1–2 initial HTTP `Range` round-trips (header + directory) before the first tile paints, and
  stricter CORS/proxy `Range` caching requirements—unnecessary overhead at ~3k–30k tiles. Revisit
  in a future ADR if a high-zoom satellite/terrain pyramid ever exceeds ~100k tiles.
- _Rejected: AVIF as the primary format._ Smaller files, but ~10× slower encoding in tile builds
  and noticeably slower software decode on mid-range mobile CPUs, risking frame drops.
- _Rejected: Netlify static hosting (`public/tiles/`)._ Violates git exclusion, bloats PR preview
  builds, and risks hitting app-host bandwidth limits during traffic spikes.
- _Rejected: AWS S3 + CloudFront._ Reliable, but per-GB egress fees create an unbounded cost/DoS
  billing risk for an open-source community map during launch-day traffic.
