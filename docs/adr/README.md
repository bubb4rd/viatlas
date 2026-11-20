# Architecture decision records

Short records of decisions that are hard to reverse or easy to second-guess.

**Write one when** you introduce or change a state library, rendering approach, data format,
coordinate convention, hosting choice, or a significant dependency.

**How:** copy [0000-template.md](0000-template.md) to `NNNN-short-title.md` using the next number,
and land it in the same PR as the change. Accepted ADRs are never edited: supersede them with a
new one and update the old one's status line.

| #                                       | Decision                                        | Status   |
| --------------------------------------- | ----------------------------------------------- | -------- |
| [0001](0001-deckgl-without-basemap.md)  | deck.gl standalone, no third-party basemap      | Accepted |
| [0002](0002-world-coordinates.md)       | World meters on a synthetic Web Mercator extent | Accepted |
| [0003](0003-toolchain.md)               | pnpm, Biome, Vitest, Playwright, lefthook       | Accepted |
| [0004](0004-poi-data-and-clustering.md) | POI data as validated JSON, clustered in-house  | Accepted |
| [0005](0005-base-ui-primitives.md)      | Base UI for interactive HUD primitives          | Accepted |
| [0006](0006-netlify-deployment.md)      | Netlify for app hosting and PR deploy previews  | Accepted |
| [0007](0007-base-tiles-and-cdn.md)      | Static 512px XYZ WebP base tiles on R2 CDN      | Accepted |
