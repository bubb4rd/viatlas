# 0006: Netlify for app hosting and PR deploy previews

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

Viatlas ships a prerendered Next.js 16 static HTML shell with a client-only WebGL map chunk and no
application database. Every pull request needs an automatic preview URL so reviewers can verify UI
and map changes in a real browser before merging, and `main` must deploy cleanly and reproducibly.

## Decision

- **Hosting platform:** deploy the Next.js app on **Netlify** (`viatlas.netlify.app`), connected
  directly to the GitHub repository.
- **Production & PR previews:** merges to `main` trigger atomic production deploys with instant
  rollback. Every pull request gets an automatic Deploy Preview
  (`deploy-preview-<n>--viatlas.netlify.app`) with GitHub commit status checks (`netlify/viatlas/deploy-preview`,
  header rules, and redirect rules).
- **Environment flags:** feature flags (`NEXT_PUBLIC_FLAG_*`, per [CONTRIBUTING.md](../../CONTRIBUTING.md))
  and public endpoint config (such as the base tile CDN URL) are configured per Netlify deploy
  context (`production`, `deploy-preview`, `branch-deploy`). All new env vars must be documented in
  `.env.example`, and no secrets may ever be placed in `NEXT_PUBLIC_*` variables or exposed to
  untrusted fork PR previews.
- **Security & headers:** serve strictly over HTTPS with Netlify edge security headers (HSTS,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a Content Security Policy allowing
  WebGL workers and the configured tile CDN origin). Follow-up infra work may add a checked-in
  `netlify.toml` once custom headers or redirects are codified in git.
- **Scope boundary:** Netlify hosts the Next.js application shell and JS/CSS bundles only. High-volume
  map tiles stay off Netlify and on a dedicated object-storage CDN (covered in ADR-0007).

## Consequences

- Already verified live on repository pull requests (including `#28`, `#30`, and `#31`), giving
  every contributor instant shareable preview URLs with zero manual deploy scripts.
- Atomic, immutable deploys simplify rollbacks if a release regresses rendering or performance.
- Keeping tile traffic off Netlify avoids bandwidth-cap surprises during high-traffic launch spikes.
- If we later add server-side Next.js features heavily tied to a specific runtime, we remain
  portable because the app keeps its static shell + client-only map boundary.
- _Rejected: Vercel._ Strong Next.js integration and previously noted as an unchosen placeholder,
  but Netlify is already live and verified on this repo with automatic PR previews and no vendor
  lock-in to server-side middleware.
- _Rejected: Cloudflare Pages / Workers (OpenNext)._ Strong edge network, but adds an extra
  OpenNext adapter layer for Next.js 16 Cache Components compared to Netlify's turnkey Next.js
  support.
- _Rejected: GitHub Pages._ Requires full static export, lacks per-PR deploy previews, and cannot
  configure custom HTTP security headers.
