# Contributing

Thanks for helping map Leonida. This takes five minutes to read.

## Ground rules

1. **Original work only.** The [data & assets policy](docs/data-and-assets.md) is non-negotiable:
   breaking it is the fastest way to get this project taken down.
2. **Follow the [engineering standards](docs/standards.md).** Biome, TypeScript, and CI enforce
   most of them for you.
3. **Be kind.** See the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

```bash
nvm use               # Node 24
corepack enable       # pnpm version comes from package.json
pnpm install          # installs git hooks via lefthook
pnpm dev
```

Install the recommended VS Code extensions (Biome, Tailwind). Format-on-save is preconfigured.

## Workflow (trunk-based)

- `main` is always releasable. It's protected: a PR, one approval, and green CI are required, and
  direct pushes are blocked.
- Branch from the latest `main` as `<type>/<short-desc>`, where type is `feat`, `fix`, `data`,
  `perf`, `refactor`, `docs`, or `chore`. Examples: `feat/poi-search`, `data/vice-city-landmarks`.
- Keep branches short-lived (days, not weeks). Rebase on `main` rather than merging it in.
- Ship big features as a series of small PRs. Hide unfinished UI behind a
  `NEXT_PUBLIC_FLAG_*` env flag instead of keeping a long-running branch.
- PRs are squash-merged, so the PR title becomes the commit and follows the commit format below.

## Picking up work

- Look for `good first issue` and `help wanted`, and comment to claim one. A claim with no activity
  for 7 days is up for grabs again.
- For a new feature or a large change, open an issue first. That beats a rejected PR.
- For map data corrections, use the **Map data** issue form and include your source.

## Commit messages

```
scope: outcome

Optional body, ≤ 3 lines: the why, only if the diff doesn't show it.
```

- **scope**: the area changed. One of `map`, `camera`, `layers`, `hud`, `ui`, `search`, `data`,
  `tiles`, `perf`, `a11y`, `infra`, `ci`, `deps`, `docs`, `agents`, `test`, `repo`. Sub-scopes are
  fine: `layers/trips: …`.
- **outcome**: imperative, saying what is now true. At most 72 characters, no trailing period.
- The `commit-msg` hook enforces the format, and CI checks PR titles the same way.

| ✅                                            | ❌                                           |
| --------------------------------------------- | -------------------------------------------- |
| `camera: keep bearing when leaving 3D`        | `Updated stuff`                              |
| `data: add Port Gellhorn ferry routes`        | `feat(map): Added a new MapThing component.` |
| `perf: build grid once instead of per render` | `fix bug`                                    |

## Pull requests

- Fill in the template (What / Why / Risk / Test), delete any empty lines, and aim for about 50 words.
- **Changes to UI or map visuals need a screenshot or short recording.**
- Keep diffs reviewable: under about 400 changed lines, not counting data or the lockfile.
  Split anything bigger.
- Draft PRs are welcome for early feedback.
- CI must pass: lint, typecheck, unit tests, build, e2e smoke, and the PR title check.

## Review

- Reviewers respond within 2 business days. Approve when the change beats `main` and meets the
  standards; it doesn't have to be perfect.
- Prefix non-blocking comments with `nit:`. A blocking comment says what to change.
- The author replies `Done` (or with a SHA) and resolves the thread.
- Code owners must approve changes to `AGENTS.md`, `docs/adr/`, CI, and tooling config.

## AI-assisted contributions

These are welcome and held to the same bar as hand-written code.

- **You open it, you own it.** Read and understand every line, and be ready to explain it in review.
- Agents follow [AGENTS.md](AGENTS.md). Don't accept agent changes that weaken lint, types, tests,
  or CI to go green.
- No AI-generated imitations of official characters, logos, or key art.
- AI "facts" about the game world aren't sources. Data needs a real citation.

## Questions

Open a GitHub Discussion or an issue. Report security problems privately: see [SECURITY.md](SECURITY.md).
