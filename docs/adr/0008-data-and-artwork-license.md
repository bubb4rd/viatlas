# 0008: CC BY-SA 4.0 for map data and original artwork

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

Viatlas keeps its application code under **Apache-2.0** ([LICENSE](../../LICENSE)), while
non-code contributions span both **structured map datasets** (`data/pois/*.json`, routes, regions)
and **original creative artwork** (base map coastlines, roads, stylized terrain, custom icons, and
rendered raster tiles). Contributors need clear, durable license terms before contributing large
datasets or Phase 1 base map artwork (`#18`), and the license must keep community work open,
compatible with public gaming wikis, and legally unambiguous.

## Decision

- **License for map data and original artwork:** adopt **Creative Commons Attribution-ShareAlike 4.0
  International (`CC BY-SA 4.0`)** for all reviewed map datasets under `data/`, original map source
  artwork, custom map iconography, and derived base map tiles.
- **Code stays Apache-2.0:** application source code (`src/`, `scripts/`, `e2e/`, build config)
  remains under Apache-2.0 with its explicit patent grant, cleanly separated from data and artwork.
- **Inbound = outbound:** submitting map data or original artwork in a PR licenses the contribution
  under CC BY-SA 4.0 without requiring a separate CLA.
- **Compatible community sources:** external `community` data entries (`source.kind: "community"`)
  must carry a compatible open license (such as CC BY-SA 4.0, CC BY 4.0, or CC0 / public domain)
  with `source.url` and `source.license` recorded per [data-and-assets.md](../data-and-assets.md).

## Consequences

- **One license for both data and artwork:** CC BY-SA 4.0 explicitly covers both creative visual
  works (illustrations, SVG/raster artwork, rendered tiles) and sui generis database rights,
  eliminating dual-licensing ambiguity between source GeoJSON and rendered map tiles.
- **Community & wiki compatibility:** CC BY-SA 4.0 is the standard license across major gaming
  wikis and Wikimedia projects, allowing clean cross-attribution with `community` sources.
- **Long-term ShareAlike durability:** downstream mirrors, forks, or commercial wrappers that build
  upon Viatlas's map data or artwork must credit contributors and release their adaptations under
  CC BY-SA 4.0, preventing closed-source enclosure of community mapping work.
- **Trademark & non-endorsement clarity:** CC BY-SA 4.0 explicitly excludes trademark and endorsement
  rights, reinforcing Viatlas's unofficial fan-project posture alongside our takedown policy.
- _Rejected: ODbL 1.0._ Designed strictly for databases and not artistic works; adopting ODbL would
  require a second license for original artwork and rendered tiles, introduce a legally murky
  boundary between "Derivative Databases" and "Produced Works," and break compatibility with
  CC BY-SA 4.0 gaming wikis.
- _Rejected: CC BY 4.0 / CC0._ Simpler for commercial scrapers, but allows third parties to take
  community-built map data and artwork into closed, proprietary clones without sharing improvements
  back.
