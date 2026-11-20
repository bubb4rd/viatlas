# 0005: Base UI for interactive HUD primitives

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

Phase 1 adds interactive HUD controls over the WebGL canvas: layer filters, POI search, detail
sheets, and opt-in spoiler/speculative toggles. Native HTML covers simple buttons and pressed-state
toggles (`ViewModeToggle`), but popovers, dialogs, switches, comboboxes, and sliders need portal
rendering above `overflow-hidden`, collision-aware positioning, focus management, and WCAG 2.2 AA
keyboard semantics without imposing a SaaS aesthetic or blowing the JS budget.

## Decision

- **Primitive library:** adopt `@base-ui/react` via tree-shakeable subpath imports
  (`@base-ui/react/popover`, `@base-ui/react/switch`, …), staying inside the client-only map chunk.
- **Styling:** unstyled by default; every HUD control styles directly with Tailwind v4 utilities
  and tokens/classes in `src/app/globals.css` (`.hud-panel`, `.hud-popover`, `.hud-button`,
  `.hud-switch`), using CSS `data-[starting-style]` / `data-[ending-style]` hooks behind
  `motion-safe:` instead of a JS animation runtime.
- **Placement:** feature-specific HUD controls live in `src/features/<feature>/components/`;
  shared wrappers move to `src/components/ui/` only when a second feature needs them.
- **Native-first rule:** keep static or single-action controls (like `ViewModeToggle`) as plain
  semantic HTML with zero extra JS.

## Consequences

- `Popover` + `Switch` (including `@floating-ui/*`) add ~49 KB compressed (~103 KB raw) inside the
  lazy-loaded map chunk (190.6 KB gzip total vs. 350 KB budget) and 0 KB to the pre-map shell.
- Full control over diegetic HUD appearance, 44 px touch targets, and focus rings without fighting
  an opinionated theme layer.
- Copy-paste patterns from Base UI registries (such as `coss ui`) can be adapted cleanly whenever
  a richer composite control is needed.
- _Rejected: Radix UI (`@radix-ui/react-*`)._ Splits primitives across many separately versioned
  packages and relies on `asChild` cloning rather than React 19-native `render` composition.
- _Rejected: React Aria / Intent UI._ Strong accessibility, but heavier runtime overhead and a more
  opinionated styling/prop model for a small set of tactical HUD controls.
- _Rejected: Motion-based kits (Motion Primitives, Cult UI, Kokonut UI)._ Adds a JS animation
  runtime when CSS transitions cover our HUD reveals.
- _Rejected: Styled component suites (HeroUI, Untitled UI, MUI)._ Designed around SaaS cards and
  theme providers that work against our diegetic HUD tokens.
