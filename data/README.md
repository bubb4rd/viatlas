# Map data

Reviewed source data, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
([ADR-0008](../docs/adr/0008-data-and-artwork-license.md)). Read
[docs/data-and-assets.md](../docs/data-and-assets.md) before adding anything: every entry needs a
cited source, and invented places are rejected.

## POIs

`pois/<category>.json`: one JSON array per category. The categories are `landmark`, `business`,
`activity`, `transport`, and `nature`.

```json
{
  "id": "poi-example-lighthouse",
  "name": "Example Lighthouse",
  "category": "landmark",
  "position": [1250, -3400],
  "source": {
    "kind": "trailer",
    "ref": "Trailer 2 @ 01:23",
    "addedBy": "github-handle"
  },
  "confidence": "confirmed"
}
```

- `id`: `poi-` plus kebab case, unique across all files.
- `category`: must match the file it's in.
- `position`: `[x, y]` world meters (+x east, +y north), inside `WORLD_BOUNDS`.
- `source.kind` of `community` also needs `source.url` and `source.license`.
- `source.url`, when present, must be an `http(s)` URL.
- `confidence: "speculative"` entries are hidden by default.

`pnpm check` validates every file and prints each problem with its file and index.
See [ADR-0004](../docs/adr/0004-poi-data-and-clustering.md).

## Base map tiles

`pnpm tiles` slices original base map artwork into the WebP tile pyramid from
[ADR-0007](../docs/adr/0007-base-tiles-and-cdn.md): 512 px tiles, zoom 10–16, XYZ layout.

1. Put the artwork in `data/raw/base-map.png` (gitignored; PNG, WebP, TIFF, or JPEG). It must span
   `WORLD_BOUNDS` in `src/features/map/world.ts` edge to edge, north up, so its aspect ratio must
   match (currently 3:4). About 1.2 m per pixel (≈ 20,000 × 26,800 px) is sharp at zoom 16;
   smaller artwork is upscaled.
2. Run `pnpm tiles`. Output goes to `public/tiles/v1/{z}/{x}/{y}.webp` plus `manifest.json`.
   Options: `--source <file>`, `--out <dir>`, `--version v2`, `--quality 1–100` (default 80).
3. Upload `public/tiles/<version>/` to the CDN as a new immutable prefix. Never commit tiles.

The script fails and deletes the output if any tile is over 100,000 bytes, listing the offenders.
Simplify those areas of the artwork or lower `--quality`. It also refuses to overwrite an existing
version and rejects artwork with the wrong aspect ratio.
