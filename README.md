# Viatlas

An interactive map of Leonida, the state in Grand Theft Auto VI. It runs in the browser as a
top-down tactical map with a 3D mode, built on Next.js and deck.gl.

> **Unofficial fan project.** Not affiliated with, endorsed by, or connected to Rockstar Games or
> Take-Two Interactive. _Grand Theft Auto_ and related marks belong to Take-Two Interactive. The
> project neither uses nor accepts game files or official assets. See the
> [data & assets policy](docs/data-and-assets.md).

## Quick start

Requires Node 24 (see `.nvmrc`) and pnpm via Corepack.

```bash
nvm use
corepack enable
pnpm install        # also installs git hooks
pnpm dev            # http://localhost:3000
```

## Scripts

| Command                     | What it does                                                          |
| --------------------------- | --------------------------------------------------------------------- |
| `pnpm dev`                  | Dev server (Turbopack)                                                |
| `pnpm check`                | Lint, typecheck, and unit tests: run before every PR                  |
| `pnpm test:e2e`             | Playwright smoke tests (`pnpm exec playwright install chromium` once) |
| `pnpm build` / `pnpm start` | Production build / serve                                              |
| `pnpm analyze`              | Interactive bundle analyzer                                           |
| `pnpm lint:fix`             | Autofix lint and formatting                                           |

## Docs

- [Vision](docs/vision.md): what we're building and the experience pillars
- [Architecture](docs/architecture.md): stack, rendering pipeline, coordinates, state
- [Engineering standards](docs/standards.md): code, deck.gl, performance budgets, testing
- [Data & assets policy](docs/data-and-assets.md): what map data we accept, and how to source it
- [Architecture decisions](docs/adr/)
- [Contributing](CONTRIBUTING.md) · [Agent rules](AGENTS.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Security](SECURITY.md)

## License

Code is licensed under [Apache-2.0](LICENSE). The license for map data and artwork is still being
decided; see the [data policy](docs/data-and-assets.md#licensing).
