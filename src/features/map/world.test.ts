import { describe, expect, it } from "vitest";
import { lngLatToWorld, WORLD_BOUNDS, worldToLngLat } from "./world";

describe("world coordinates", () => {
  it("maps the world origin to 0°, 0°", () => {
    const [lng, lat] = worldToLngLat([0, 0]);
    expect(lng).toBeCloseTo(0, 12);
    expect(lat).toBeCloseTo(0, 12);
  });

  it("round-trips every corner of the world bounds to sub-millimeter precision", () => {
    const { minX, minY, maxX, maxY } = WORLD_BOUNDS;
    for (const point of [
      [minX, minY],
      [minX, maxY],
      [maxX, minY],
      [maxX, maxY],
    ] as const) {
      const [x, y] = lngLatToWorld(worldToLngLat([...point]));
      expect(x).toBeCloseTo(point[0], 3);
      expect(y).toBeCloseTo(point[1], 3);
    }
  });

  it("keeps north positive and east positive", () => {
    const [lng, lat] = worldToLngLat([1_000, 1_000]);
    expect(lng).toBeGreaterThan(0);
    expect(lat).toBeGreaterThan(0);
  });
});
