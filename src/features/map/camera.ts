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
