<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Viatlas: agent rules

Unofficial interactive map of Leonida (GTA VI). Next.js 16 App Router + deck.gl 9: a static
HTML shell with a client-only WebGL map inside it.

These rules bind every coding agent (Claude Code, Codex, Cursor, Copilot, …) and summarize
what humans follow in [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/standards.md](docs/standards.md).
If this file and another doc disagree, this file wins; flag the conflict in your PR.

## Before writing code

1. Read [docs/architecture.md](docs/architecture.md) and any ADR in [docs/adr/](docs/adr/) touching your area.
2. Next.js: read the bundled docs (block above) for every API you use.
   deck.gl is **v9**: check <https://deck.gl/docs>, not memory. v8-era snippets are often wrong.
3. Copy an existing pattern before inventing one. `src/features/map/` is the reference implementation.

## Commands

| Task                          | Command                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| Setup                         | `nvm use && corepack enable && pnpm install` (installs git hooks) |
| Dev server                    | `pnpm dev`                                                        |
| **Gate before saying "done"** | `pnpm check` (lint + typecheck + unit tests)                      |
| E2E smoke                     | `pnpm test:e2e`                                                   |
| Bundle size                   | `pnpm analyze`                                                    |
| Autofix lint/format           | `pnpm lint:fix`                                                   |

If you changed UI or map rendering, also run `pnpm test:e2e` and look at it in a browser. Report
what you verified and what you could not.

## Hard rules

Breaking any of these gets the PR rejected.

- **No game-extracted, leaked, datamined, or official Rockstar/Take-Two assets.** No textures,
  models, map renders, logos, key art, trailer frames, or audio. Never invent POI names or
  locations: data needs a cited source. See [docs/data-and-assets.md](docs/data-and-assets.md).
  When unsure, stop and ask.
- **deck.gl, luma.gl, and anything touching `window` or WebGL stay client-only**, behind the
  `next/dynamic(..., { ssr: false })` boundary in `src/features/map/components/map-shell.tsx`.
  Never import `@deck.gl/*` into a Server Component or into `src/app/**`.
- **No per-frame React state.** Camera pose, hover, pointer position, animation time go in refs,
  deck props, or a store read outside render. A React re-render on every pan/zoom frame is a bug.
- **Game positions are world meters** (`WorldPoint`, +x east, +y north). Convert with
  `worldToLngLat` at the layer boundary only. Never hand-write lng/lat for game locations.
- **Never weaken guardrails to get green.** That covers Biome rules, tsconfig strictness, tests,
  CI steps, and git hooks. Fix the code instead. Every `biome-ignore` carries a reason.
- **No new runtime dependency without a reason in the PR**: what it does, its size from
  `pnpm analyze`, and the alternatives you rejected. `next`, `react`, `react-dom`, and
  `@deck.gl/*` stay pinned to exact versions, and all `@deck.gl/*` packages upgrade together.
- **No secrets** in code, fixtures, or logs. Document new env vars in `.env.example`.
- **Hands off generated files:** `pnpm-lock.yaml` (pnpm changes it), `next-env.d.ts`, `.next/`, and
  the Next.js block at the top of this file.

## Scope discipline

- One concern per change. Don't reformat, rename, or refactor outside the task.
- No speculative abstractions, options, or "for later" code.
- Changing an architectural pattern (state library, layer pattern, data format, rendering approach)
  requires an ADR in `docs/adr/` in the same PR.
- Changing behavior means updating the doc that describes it.

## Where things go

```
src/app/                 routes, layouts, metadata. Thin: compose features, no logic
src/features/<feature>/  components/, layers/, hooks, pure logic, colocated *.test.ts(x)
src/components/ui/       shared feature-agnostic UI (create when a 2nd feature needs it)
src/lib/                 cross-feature pure utilities
data/                    reviewed source map data with provenance
scripts/                 node scripts (.mjs): data pipeline, repo tooling
e2e/                     Playwright specs
docs/                    vision, architecture, standards, data policy, ADRs
```

## Git

- Commit subject: `scope: outcome`, with a lowercase scope, at most 72 characters, and no period.
  A hook enforces this, and scopes are listed in CONTRIBUTING.md.
- Bodies are optional: at most 3 lines, and only the _why_. Never restate the diff.
- Never push to `main`, force-push a shared branch, or merge without review.
- A human owns every PR. Whoever opens it has read every line, including agent-written code.
