import { describe, expect, it } from "vitest";
import { INITIAL_VIEW_STATE } from "./camera";
import { formatCameraHash, parseCameraHash } from "./url-camera";
import { lngLatToWorld, WORLD_BOUNDS } from "./world";

function worldOf(hash: string) {
  const parsed = parseCameraHash(hash);
  if (!parsed) throw new Error(`no camera in ${hash}`);
  const { longitude, latitude } = parsed.viewState;
  return lngLatToWorld([longitude, latitude]).map(Math.round);
}

describe("parseCameraHash", () => {
  it("reads a 2D camera in world meters", () => {
    const parsed = parseCameraHash("#map=13.25/1250/-3400");
    expect(parsed?.mode).toBe("2d");
    expect(parsed?.viewState).toMatchObject({
      zoom: 13.25,
      pitch: 0,
      bearing: 0,
    });
    expect(worldOf("#map=13.25/1250/-3400")).toEqual([1250, -3400]);
  });

  it("reads a 3D camera with pitch and bearing", () => {
    const parsed = parseCameraHash("#map=14/0/0/45/-30");
    expect(parsed?.mode).toBe("3d");
    expect(parsed?.viewState).toMatchObject({ pitch: 45, bearing: -30 });
  });

  it("ignores other hash params", () => {
    expect(parseCameraHash("#poi=x&map=12/0/0")?.viewState.zoom).toBe(12);
  });

  it.each([
    ["no hash", ""],
    ["no map param", "#poi=x"],
    ["wrong part count", "#map=12/0"],
    ["four parts", "#map=12/0/0/30"],
    ["non-numbers", "#map=12/abc/0"],
    ["empty parts", "#map=12//0"],
  ])("returns null for %s", (_, hash) => {
    expect(parseCameraHash(hash)).toBeNull();
  });

  it("clamps out-of-range values instead of rejecting the link", () => {
    const parsed = parseCameraHash("#map=99/999999/-999999/89/540");
    expect(parsed?.viewState).toMatchObject({
      zoom: INITIAL_VIEW_STATE.maxZoom,
      pitch: INITIAL_VIEW_STATE.maxPitch,
      bearing: -180,
    });
    expect(worldOf("#map=99/999999/-999999/89/540")).toEqual([
      WORLD_BOUNDS.maxX,
      WORLD_BOUNDS.minY,
    ]);
  });
});

describe("formatCameraHash", () => {
  it("round-trips a 2D camera, rounded for short URLs", () => {
    const parsed = parseCameraHash("#map=13.256/1250.4/-3400.6");
    if (!parsed) throw new Error("parse failed");
    expect(formatCameraHash("", parsed.viewState, "2d")).toBe(
      "#map=13.26/1250/-3401",
    );
  });

  it("adds pitch and bearing in 3D", () => {
    const parsed = parseCameraHash("#map=14/0/0/45.4/-30.6");
    if (!parsed) throw new Error("parse failed");
    expect(formatCameraHash("", parsed.viewState, "3d")).toBe(
      "#map=14.00/0/0/45/-31",
    );
  });

  it("keeps other hash params", () => {
    expect(formatCameraHash("#poi=x", INITIAL_VIEW_STATE, "2d")).toBe(
      "#poi=x&map=11.50/0/0",
    );
  });
});
