# Engineering standards

Biome, `tsc`, and CI enforce what they can. This page covers the rest.
**Must** means review blocks the PR. **Should** is the default; deviating needs a reason in the PR.

## TypeScript

- **Must:** keep strict mode on, including `noUncheckedIndexedAccess`. No `any`: use `unknown` and
  narrow it. No non-null `!`: handle the null.
- **Must:** validate external data (fetch, JSON files, `localStorage`) at the boundary before
  giving it a type.
- **Should:** prefer `type` to `interface` unless you're extending, and literal unions to `enum`.
  Use `as const` for config tables.
- **Should:** use named exports. Default exports are only for files Next.js requires them in
  (`page`, `layout`) and for `next/dynamic` targets.
- **Should:** put units in ambiguous names: `stepM`, `durationMs`, `zoom`.

## Files and naming

- File names are kebab-case: `view-mode-toggle.tsx`. Components are PascalCase. Hooks are named
  `useThing` and live in `use-thing.ts`.
- Unit tests sit next to their code as `*.test.ts(x)`. E2E specs go in `e2e/*.spec.ts`.
- One exported component per file. Small private helpers in the same file are fine.

## React and Next.js

- Default to Server Components, and add `"use client"` at the smallest leaf that needs it.
- **Must:** anything importing deck.gl or luma.gl, or touching `window`, stays under the
  client-only boundary.
- The React Compiler is on. Don't hand-write `useMemo` or `useCallback` without a profile that
  justifies it. Follow the Rules of React: no reading refs during render, no mutating props.
- Effects are a last resort. Derive values during render or handle them in event handlers.
- **Must:** no React state that changes per animation frame or per pointer move.

## deck.gl

- Layer `id`s are stable and unique.
- **Must:** keep data referentially stable. A new array means a full GPU re-upload. Build static
  data at module scope.
- Accessors that depend on changing values declare `updateTriggers`.
- For more than about 10k features, use binary attributes or typed arrays instead of object arrays.
- Set `pickable: true` only on layers that need interaction.
- Drive animation (for example TripsLayer `currentTime`) with `requestAnimationFrame` and deck
  props, never with React re-renders.
- Respect `prefers-reduced-motion`: pause ambient animation and shorten camera transitions.
- Check APIs against the v9 docs. Older snippets found online are often v8.

## Styling

- Use Tailwind utilities plus the tokens in `src/app/globals.css`. No raw hex values in
  components: add a token instead.
- HUD UI reuses the `.hud-*` component classes, so extend those rather than copying them.
- Decorative motion goes behind `motion-safe:`.

## Accessibility (WCAG 2.2 AA)

- All DOM UI is keyboard reachable, with a visible focus ring, accessible names, targets of at
  least 44 px, and text contrast of at least 4.5:1.
- The canvas isn't accessible by itself, so every map capability needs a DOM path too: search,
  POI lists, zoom buttons, and keyboard pan/zoom.

## Performance budgets

| Metric                        | Budget                                                      |
| ----------------------------- | ----------------------------------------------------------- |
| LCP of the shell              | < 1.5 s on mid-range mobile over fast 4G                    |
| JS before the map chunk       | < 120 KB gzip                                               |
| Map chunk (deck.gl + layers)  | < 350 KB gzip; check with `pnpm analyze`                    |
| Pan/zoom frame rate           | 60 fps on an M1-class laptop; ≥ 45 fps on a mid-range phone |
| Long tasks during interaction | None over 50 ms                                             |
| Raster tile                   | ≤ 100 KB, WebP or AVIF                                      |

PRs that touch rendering or add dependencies include before/after evidence: `pnpm analyze` output
or a Chrome Performance trace.

## Testing

- **Unit (Vitest):** pure logic such as coordinate math, data builders, parsers, and URL state.
  Tests run in Node by default; component tests opt in with `// @vitest-environment jsdom`.
- **Component:** Testing Library, querying by role or label. Never query by class name.
- **E2E (Playwright):** critical journeys only (map loads, search flies to a result, deep links).
  Keep the suite under 2 minutes.
- Every bug fix comes with a regression test.
- Don't snapshot WebGL output.

## Errors and logging

- No `console.log` in committed code. `console.warn` and `console.error` are allowed with context.
- Fail visibly: a failed data load shows a HUD message, never a silently empty map.

## Dependencies

- **Must:** justify every new runtime dependency in the PR, covering purpose, gzip size, and
  rejected alternatives.
- Pin `next`, `react`, `react-dom`, and `@deck.gl/*` exactly, and upgrade the `@deck.gl/*`
  packages together.
- For a Dependabot PR, the reviewer runs the app, not just CI.
