import {
  FlyToInterpolator,
  LinearInterpolator,
  type MapViewState,
} from "@deck.gl/core";
import { worldToLngLat } from "./world";

export type ViewMode = "2d" | "3d";

const [longitude, latitude] = worldToLngLat([0, 0]);

export const INITIAL_VIEW_STATE: MapViewState = {
  longitude,
  latitude,
  zoom: 11.5,
  minZoom: 10,
  maxZoom: 18,
  pitch: 0,
  bearing: 0,
  maxPitch: 60,
};

/** Camera pose per mode. 2D is strictly north-up top-down, like an in-game pause map. */
export const MODE_POSE: Record<
  ViewMode,
  Pick<MapViewState, "pitch" | "bearing">
> = {
  "2d": { pitch: 0, bearing: 0 },
  "3d": { pitch: 50, bearing: -20 },
};

export const MODE_TRANSITION = {
  transitionDuration: 600,
  transitionInterpolator: new LinearInterpolator(["pitch", "bearing"]),
} as const;

export const FLY_TO_TRANSITION = {
  transitionDuration: 500,
  transitionInterpolator: new FlyToInterpolator(),
} as const;

/** Zoom levels per HUD +/- press. */
export const ZOOM_STEP = 1;

/** Zoom by `delta` levels around the current center, clamped to the camera limits. */
export function zoomBy(view: MapViewState, delta: number): MapViewState {
  const min = INITIAL_VIEW_STATE.minZoom ?? -Infinity;
  const max = INITIAL_VIEW_STATE.maxZoom ?? Infinity;
  return { ...view, zoom: Math.min(max, Math.max(min, view.zoom + delta)) };
}

/** Home view, facing north, keeping the current mode's pitch. */
export function resetView(view: MapViewState, mode: ViewMode): MapViewState {
  const { longitude, latitude, zoom } = INITIAL_VIEW_STATE;
  return {
    ...view,
    longitude,
    latitude,
    zoom,
    pitch: MODE_POSE[mode].pitch,
    bearing: 0,
  };
}
