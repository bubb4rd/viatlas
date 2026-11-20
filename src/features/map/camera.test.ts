import { describe, expect, it } from "vitest";
import { INITIAL_VIEW_STATE, resetView, zoomBy } from "./camera";

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
