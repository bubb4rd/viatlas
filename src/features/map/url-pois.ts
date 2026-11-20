/**
 * POI filter and selection in the URL hash: `#hide=<categories>`,
 * `#speculative=1`, and `#poi=<id>`. Backed by the shared hash utilities in
 * `url-state.ts`; written with `formatMapHash`.
 */
import { filterPois } from "@/features/pois/filter";
import type { Poi } from "@/features/pois/poi";
import {
  parsePoiFilterHash,
  parseSelectedPoiHash,
  type UrlPoiFilter,
} from "./url-state";

export type UrlPoiState = {
  poiFilter: UrlPoiFilter;
  selectedPoiId: string | null;
};

/**
 * Reads the POI filter and selection from `hash`. A selected id that isn't
 * visible under that filter (unknown, hidden category, or speculative without
 * the toggle) reads as null, so a stale link never selects a hidden marker.
 */
export function parsePoiHash(hash: string, pois: readonly Poi[]): UrlPoiState {
  const poiFilter = parsePoiFilterHash(hash);
  const id = parseSelectedPoiHash(hash);
  const isVisible =
    id !== null && filterPois(pois, poiFilter).some((poi) => poi.id === id);
  return { poiFilter, selectedPoiId: isVisible ? id : null };
}
