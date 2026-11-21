// Reviewed source data, one file per category (data/README.md). Validated at
// module load and in `pnpm check`, so a bad entry fails the build, not the user.
import activity from "../../../data/pois/activity.json";
import business from "../../../data/pois/business.json";
import landmark from "../../../data/pois/landmark.json";
import nature from "../../../data/pois/nature.json";
import transport from "../../../data/pois/transport.json";
import { isShownByDefault, type PoiCategory, parsePois } from "./poi";

// E2E hook: no reviewed POIs ship yet, so Playwright specs swap in fixture
// files with `page.addInitScript`. Same validation; nothing else sets it.
const e2eFiles = (
  globalThis as { __VIATLAS_E2E_POIS__?: Record<PoiCategory, unknown> }
).__VIATLAS_E2E_POIS__;

export const POIS = parsePois(
  e2eFiles ?? { landmark, business, activity, transport, nature },
);

export const DEFAULT_VISIBLE_POIS = POIS.filter(isShownByDefault);
