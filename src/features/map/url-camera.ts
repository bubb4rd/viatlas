/**
 * Camera pose in the URL hash, so a view can be shared or reloaded:
 * `#map=zoom/x/y` in 2D, `#map=zoom/x/y/pitch/bearing` in 3D, with x/y in
 * world meters. The hash keeps the page static and never touches the router.
 */
import type { MapViewState } from "@deck.gl/core";
import { INITIAL_VIEW_STATE, MODE_POSE, type ViewMode } from "./camera";
import { lngLatToWorld, WORLD_BOUNDS, worldToLngLat } from "./world";

const KEY = "map";

export type UrlCamera = { viewState: MapViewState; mode: ViewMode };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Reads the camera from a location hash; null if absent or malformed. */
export function parseCameraHash(hash: string): UrlCamera | null {
  const value = new URLSearchParams(hash.replace(/^#/, "")).get(KEY);
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
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const [x, y] = lngLatToWorld([viewState.longitude, viewState.latitude]);
  const parts = [viewState.zoom.toFixed(2), Math.round(x), Math.round(y)];
  if (mode === "3d")
    parts.push(
      Math.round(viewState.pitch ?? 0),
      Math.round(viewState.bearing ?? 0),
    );
  params.set(KEY, parts.join("/"));
  // URLSearchParams escapes "/"; the hash doesn't need it, and it reads better.
  return `#${params.toString().replaceAll("%2F", "/")}`;
}
