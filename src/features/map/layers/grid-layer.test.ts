import { describe, expect, it } from "vitest";
import { WORLD_BOUNDS } from "../world";
import { buildGrid } from "./grid-layer";

describe("buildGrid", () => {
  it("covers the world bounds with one line per step on each axis", () => {
    const step = 1_000;
    const { minX, minY, maxX, maxY } = WORLD_BOUNDS;
    const expected = (maxX - minX) / step + 1 + (maxY - minY) / step + 1;
    expect(buildGrid(step, 4)).toHaveLength(expected);
  });

  it("marks every Nth line as major, starting at the edge", () => {
    const lines = buildGrid(1_000, 4);
    expect(lines[0]?.major).toBe(true);
    expect(lines[1]?.major).toBe(false);
    expect(lines[4]?.major).toBe(true);
  });
});
