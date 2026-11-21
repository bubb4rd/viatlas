import { describe, expect, it } from "vitest";
import {
  cameraTransition,
  FLY_TO_TRANSITION,
  focusOn,
  INITIAL_VIEW_STATE,
  MODE_TRANSITION,
  POI_FOCUS_ZOOM,
  resetView,
  zoomBy,
} from "./camera";
import { worldToLngLat } from "./world";

describe("zoomBy", () => {
  it("steps zoom and keeps the center", () => {
    const next = zoomBy(INITIAL_VIEW_STATE, 1);
    expect(next.zoom).toBe(INITIAL_VIEW_STATE.zoom + 1);
    expect(next.longitude).toBe(INITIAL_VIEW_STATE.longitude);
    expect(next.latitude).toBe(INITIAL_VIEW_STATE.latitude);
  });

  it("clamps to the camera zoom limits", () => {
    expect(zoomBy({ ...INITIAL_VIEW_STATE, zoom: 17.5 }, 1).zoom).toBe(
      INITIAL_VIEW_STATE.maxZoom,
    );
    expect(zoomBy({ ...INITIAL_VIEW_STATE, zoom: 10.5 }, -1).zoom).toBe(
      INITIAL_VIEW_STATE.minZoom,
    );
  });
});

describe("resetView", () => {
  const moved = {
    ...INITIAL_VIEW_STATE,
    longitude: 0.01,
    latitude: -0.01,
    zoom: 15,
    pitch: 50,
    bearing: -20,
  };

  it("recenters on the home view facing north", () => {
    const next = resetView(moved, "3d");
    expect(next).toMatchObject({
      longitude: INITIAL_VIEW_STATE.longitude,
      latitude: INITIAL_VIEW_STATE.latitude,
      zoom: INITIAL_VIEW_STATE.zoom,
      pitch: 50,
      bearing: 0,
    });
  });

  it("stays top-down in 2D", () => {
    expect(resetView(moved, "2d")).toMatchObject({ pitch: 0, bearing: 0 });
  });
});

describe("cameraTransition", () => {
  it("keeps the transition when motion is allowed", () => {
    expect(cameraTransition(FLY_TO_TRANSITION, false)).toBe(FLY_TO_TRANSITION);
  });

  it("jumps instantly under reduced motion", () => {
    const next = cameraTransition(MODE_TRANSITION, true);
    expect(next.transitionDuration).toBe(0);
    expect(next.transitionInterpolator).toBe(
      MODE_TRANSITION.transitionInterpolator,
    );
  });
});

describe("focusOn", () => {
  it("centers on the world point and zooms in to the focus zoom", () => {
    const next = focusOn(INITIAL_VIEW_STATE, [1500, -2500]);
    expect([next.longitude, next.latitude]).toEqual(
      worldToLngLat([1500, -2500]),
    );
    expect(next.zoom).toBe(POI_FOCUS_ZOOM);
  });

  it("never zooms out", () => {
    const close = { ...INITIAL_VIEW_STATE, zoom: 17 };
    expect(focusOn(close, [0, 0]).zoom).toBe(17);
  });
});
