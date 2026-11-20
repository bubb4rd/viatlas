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
- `confidence: "speculative"` entries are hidden by default.

`pnpm check` validates every file and prints each problem with its file and index.
See [ADR-0004](../docs/adr/0004-poi-data-and-clustering.md).
