# 0003: pnpm, Biome, Vitest, Playwright, lefthook

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

With several contributors and coding agents, the setup has to be fast to install, give a single
verdict on style, and catch mistakes before review.

## Decision

| Tool                                           | Role                 | Why                                                                         |
| ---------------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| pnpm (pinned via `packageManager` + Corepack)  | Packages             | Strict dependency graph, fast, deterministic lockfile                       |
| Node 24 LTS (`.nvmrc`, `engine-strict`)        | Runtime              | Current LTS; test tooling requires ≥ 22.22                                  |
| Biome                                          | Lint + format        | One fast tool and one config; first-party Next/React rule domains           |
| TypeScript strict + `noUncheckedIndexedAccess` | Types                | Catches index and null bugs common in coordinate code                       |
| Vitest                                         | Unit/component tests | Vite-native and fast; Node by default, jsdom opt-in                         |
| Playwright                                     | E2E smoke            | Real Chromium with WebGL against the production build                       |
| lefthook                                       | Git hooks            | Format staged files, enforce commit format, run typecheck and tests on push |
| GitHub Actions                                 | CI                   | Lint, typecheck, test, build, e2e, PR title                                 |

## Consequences

- `pnpm check` gives one local command matching CI's fast path.
- Biome has fewer plugins than ESLint. If we need a rule it lacks, add a targeted check rather than
  a second linter.
- Contributors on Node 20 must upgrade: `engine-strict` fails the install with a clear message.
