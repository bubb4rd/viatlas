# Data & assets policy

This page is what keeps the project online. Take-Two enforces its IP actively. Read this before
contributing any map data, imagery, or names.

## Never accepted

- Files extracted or datamined from any GTA game, GTA VI included once it ships: textures, models,
  map images, audio, scripts, or text tables.
- Leaked material of any kind, including leaked footage and internal builds.
- Official artwork, logos, key art, screenshots, or trailer frames used as images in the app.
- Data copied from other fan maps or wikis without a compatible license and attribution.
- AI-generated imitations of official art, characters, or logos.
- Invented locations or names presented as fact.

## Accepted

- Original artwork drawn by contributors (coastlines, roads, districts, landmarks, icons).
- Facts derived from public sources (official trailers, screenshots, the official site, and
  in-game observation after release), cited as sources and never reproduced as images.
- Openly licensed data, with its license and attribution recorded.

## Provenance is required

Every data entry records where it came from:

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

- `position` is in **world meters** ([ADR-0002](adr/0002-world-coordinates.md)), not lng/lat.
- `source.kind` is one of `trailer`, `screenshot`, `official-site`, `in-game`, or `community`
  (the last needs a link and a compatible license).
- `confidence` is `confirmed`, `likely`, or `speculative`. Speculative entries are hidden by
  default in the UI.

## Formats and storage

- Source data lives in `data/` as JSON or GeoJSON in world meters, one file per category or region.
- Generated tiles and large derived data stay out of git: they're hosted on a CDN.
  `data/raw/` and `public/tiles/` are gitignored.
- Images are WebP or AVIF, at most 100 KB per tile.

## Licensing

- **Code:** Apache-2.0 ([LICENSE](../LICENSE)).
- **Map data and original artwork:** not yet decided by the maintainers. The candidates are
  CC BY-SA 4.0 and ODbL. Until a license is chosen, contributors agree that their data and artwork
  contributions may be released under the open license the maintainers pick.

## Takedowns

If a rights holder asks us to remove something, maintainers remove it first and discuss afterwards.
The contact route is in [SECURITY.md](../SECURITY.md).
