/**
 * Pure URL hash state helpers for map concerns (`#map=...`, `#poi=...`,
 * `#hide=...`, `#speculative=1`).
 *
 * State lives in the location hash so the page stays static and never triggers
 * router navigation. Every write preserves unknown hash keys, and every read
 * ignores or clamps malformed values instead of rejecting the link.
 */
import type { MapViewState } from "@deck.gl/core";
import {
  isValidPoiId,
  POI_CATEGORIES,
  type PoiCategory,
} from "@/features/pois/poi";
import { INITIAL_VIEW_STATE, MODE_POSE, type ViewMode } from "./camera";
import { lngLatToWorld, WORLD_BOUNDS, worldToLngLat } from "./world";

export const HASH_KEYS = {
  camera: "map",
  poi: "poi",
  hiddenCategories: "hide",
  speculative: "speculative",
} as const;

export type UrlCamera = { viewState: MapViewState; mode: ViewMode };

export type UrlPoiFilter = {
  categories: Record<PoiCategory, boolean>;
  showSpeculative: boolean;
};

export type MapUrlState = {
  camera: UrlCamera | null;
  selectedPoiId: string | null;
  poiFilter: UrlPoiFilter;
};

export type MapUrlStatePatch = {
  camera?: UrlCamera | null;
  selectedPoiId?: string | null;
  poiFilter?: UrlPoiFilter;
};

const POI_CATEGORY_SET: ReadonlySet<string> = new Set(POI_CATEGORIES);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPoiCategory(value: string): value is PoiCategory {
  return POI_CATEGORY_SET.has(value);
}

/** Parses a location hash (`#a=1&b=2` or `a=1&b=2`) into URLSearchParams. */
export function parseHashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ""));
}

/**
 * Serializes URLSearchParams back into a hash string (`#...`), or `""` when
 * empty. Keeps `/` and `,` unescaped because hash fragments allow them and
 * URLs like `#map=12.00/0/0&hide=business,nature` read cleanly.
 */
export function serializeHashParams(params: URLSearchParams): string {
  const raw = params.toString();
  if (!raw) return "";
  return `#${raw.replaceAll("%2F", "/").replaceAll("%2C", ",")}`;
}

/** Reads one hash parameter by key, or null when absent. */
export function getHashParam(hash: string, key: string): string | null {
  return parseHashParams(hash).get(key);
}

/**
 * Returns `hash` with one key set (or deleted when `value` is null),
 * preserving all other hash keys intact.
 */
export function setHashParam(
  hash: string,
  key: string,
  value: string | null,
): string {
  const params = parseHashParams(hash);
  if (value === null) params.delete(key);
  else params.set(key, value);
  return serializeHashParams(params);
}

/**
 * Returns `hash` with multiple keys updated atomically. `undefined` leaves a
 * key untouched; `null` deletes it; any string sets it. Unknown keys stay.
 */
export function updateHashParams(
  hash: string,
  updates: Readonly<Record<string, string | null | undefined>>,
): string {
  const params = parseHashParams(hash);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  return serializeHashParams(params);
}

function formatCameraValue(viewState: MapViewState, mode: ViewMode): string {
  const [x, y] = lngLatToWorld([viewState.longitude, viewState.latitude]);
  const parts = [viewState.zoom.toFixed(2), Math.round(x), Math.round(y)];
  if (mode === "3d") {
    parts.push(
      Math.round(viewState.pitch ?? 0),
      Math.round(viewState.bearing ?? 0),
    );
  }
  return parts.join("/");
}

/** Reads the camera from a location hash; null if absent or malformed. */
export function parseCameraHash(hash: string): UrlCamera | null {
  const value = getHashParam(hash, HASH_KEYS.camera);
  if (!value) return null;
  const parts = value.split("/");
  if (parts.length !== 3 && parts.length !== 5) return null;
  // `Number("")` is 0, so reject empty parts before converting.
  if (parts.some((part) => part.trim() === "")) return null;
  const numbers = parts.map(Number);
  if (numbers.some((n) => !Number.isFinite(n))) return null;

  const [zoom = 0, x = 0, y = 0, pitch = 0, bearing = 0] = numbers;
  const mode: ViewMode = parts.length === 5 ? "3d" : "2d";
  const [longitude, latitude] = worldToLngLat([
    clamp(x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX),
    clamp(y, WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY),
  ]);
  const { minZoom = 0, maxZoom = 24, maxPitch = 60 } = INITIAL_VIEW_STATE;

  return {
    mode,
    viewState: {
      ...INITIAL_VIEW_STATE,
      ...MODE_POSE[mode],
      longitude,
      latitude,
      zoom: clamp(zoom, minZoom, maxZoom),
      ...(mode === "3d" && {
        pitch: clamp(pitch, 0, maxPitch),
        bearing: ((((bearing + 180) % 360) + 360) % 360) - 180,
      }),
    },
  };
}

/** Returns `hash` with the camera set, keeping any other hash params. */
export function formatCameraHash(
  hash: string,
  viewState: MapViewState,
  mode: ViewMode,
): string {
  return setHashParam(
    hash,
    HASH_KEYS.camera,
    formatCameraValue(viewState, mode),
  );
}

/** Reads the selected POI id (`#poi=poi-...`), or null if absent or invalid. */
export function parseSelectedPoiHash(hash: string): string | null {
  const raw = getHashParam(hash, HASH_KEYS.poi)?.trim();
  if (!raw || !isValidPoiId(raw)) return null;
  return raw;
}

/** Returns `hash` with `#poi=<id>` set, or removed when null/invalid. */
export function formatSelectedPoiHash(
  hash: string,
  poiId: string | null,
): string {
  const valid = poiId && isValidPoiId(poiId) ? poiId : null;
  return setHashParam(hash, HASH_KEYS.poi, valid);
}

/**
 * Reads POI filter state from `#hide=<cat1>,<cat2>` and `#speculative=1`.
 * Unknown category tokens and invalid speculative flags are ignored safely.
 */
export function parsePoiFilterHash(hash: string): UrlPoiFilter {
  const params = parseHashParams(hash);
  const categories: Record<PoiCategory, boolean> = {
    landmark: true,
    business: true,
    activity: true,
    transport: true,
    nature: true,
  };

  const rawHidden = params.get(HASH_KEYS.hiddenCategories);
  if (rawHidden) {
    for (const token of rawHidden.split(",")) {
      const normalized = token.trim().toLowerCase();
      if (isPoiCategory(normalized)) {
        categories[normalized] = false;
      }
    }
  }

  const rawSpeculative = params
    .get(HASH_KEYS.speculative)
    ?.trim()
    .toLowerCase();
  const showSpeculative = rawSpeculative === "1" || rawSpeculative === "true";

  return { categories, showSpeculative };
}

function formatPoiFilterParams(filter: UrlPoiFilter): {
  hidden: string | null;
  speculative: string | null;
} {
  const hiddenCategories = POI_CATEGORIES.filter(
    (category) => !filter.categories[category],
  );
  return {
    hidden: hiddenCategories.length > 0 ? hiddenCategories.join(",") : null,
    speculative: filter.showSpeculative ? "1" : null,
  };
}

/**
 * Returns `hash` with POI filter params updated, omitting keys that match the
 * default visible state so clean links stay short.
 */
export function formatPoiFilterHash(
  hash: string,
  filter: UrlPoiFilter,
): string {
  const { hidden, speculative } = formatPoiFilterParams(filter);
  return updateHashParams(hash, {
    [HASH_KEYS.hiddenCategories]: hidden,
    [HASH_KEYS.speculative]: speculative,
  });
}

/** Reads all known map concerns from `hash` in one pass. */
export function parseMapHash(hash: string): MapUrlState {
  return {
    camera: parseCameraHash(hash),
    selectedPoiId: parseSelectedPoiHash(hash),
    poiFilter: parsePoiFilterHash(hash),
  };
}

/**
 * Updates any subset of map concerns in `hash` without clobbering untouched
 * concerns or unknown hash keys.
 */
export function formatMapHash(hash: string, patch: MapUrlStatePatch): string {
  const updates: Record<string, string | null | undefined> = {};

  if (patch.camera !== undefined) {
    updates[HASH_KEYS.camera] = patch.camera
      ? formatCameraValue(patch.camera.viewState, patch.camera.mode)
      : null;
  }

  if (patch.selectedPoiId !== undefined) {
    updates[HASH_KEYS.poi] =
      patch.selectedPoiId && isValidPoiId(patch.selectedPoiId)
        ? patch.selectedPoiId
        : null;
  }

  if (patch.poiFilter !== undefined) {
    const { hidden, speculative } = formatPoiFilterParams(patch.poiFilter);
    updates[HASH_KEYS.hiddenCategories] = hidden;
    updates[HASH_KEYS.speculative] = speculative;
  }

  return updateHashParams(hash, updates);
}
