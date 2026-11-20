# Architecture decision records

Short records of decisions that are hard to reverse or easy to second-guess.

**Write one when** you introduce or change a state library, rendering approach, data format,
coordinate convention, hosting choice, or a significant dependency.

**How:** copy [0000-template.md](0000-template.md) to `NNNN-short-title.md` using the next number,
and land it in the same PR as the change. Accepted ADRs are never edited: supersede them with a
new one and update the old one's status line.

| #                                      | Decision                                        | Status   |
| -------------------------------------- | ----------------------------------------------- | -------- |
| [0001](0001-deckgl-without-basemap.md) | deck.gl standalone, no third-party basemap      | Accepted |
| [0002](0002-world-coordinates.md)      | World meters on a synthetic Web Mercator extent | Accepted |
| [0003](0003-toolchain.md)              | pnpm, Biome, Vitest, Playwright, lefthook       | Accepted |
