import { describe, expect, it } from "vitest";
import { EARTH_RADIUS_M, WORLD_BOUNDS } from "../src/features/map/world.ts";
import {
  MAX_TILE_BYTES,
  overBudget,
  pyramid,
  tileBoundsM,
  tileRange,
  tileSizeM,
  tileWindow,
} from "./tile-grid.mjs";

// Synthetic source dimensions with WORLD_BOUNDS' 3:4 aspect ratio.
const SOURCE = { width: 3000, height: 4000 };

describe("tile grid", () => {
  it("halves tile size per zoom from the full Mercator world", () => {
    expect(tileSizeM(0)).toBeCloseTo(2 * Math.PI * EARTH_RADIUS_M, 6);
    expect(tileSizeM(16)).toBeCloseTo(611.4962, 4);
  });

  it("puts the world origin on a tile corner", () => {
    expect(tileBoundsM(10, 512, 512).minX).toBeCloseTo(0, 6);
    expect(tileBoundsM(10, 512, 512).maxY).toBeCloseTo(0, 6);
    expect(tileRange(WORLD_BOUNDS, 10)).toEqual({
      minX: 511,
      maxX: 512,
      minY: 511,
      maxY: 512,
    });
  });

  it("builds the ADR-0007 z10–z16 pyramid over WORLD_BOUNDS", () => {
    const tiles = [...pyramid(WORLD_BOUNDS, SOURCE)];
    expect(tiles).toHaveLength(2932);
    expect(Math.min(...tiles.map((t) => t.z))).toBe(10);
    expect(Math.max(...tiles.map((t) => t.z))).toBe(16);
  });

  it("maps a tile overhanging the world edge to a partial patch", () => {
    // z10 tile 511/511 holds the world's north-west quadrant in its corner.
    expect(tileWindow(10, 511, 511, WORLD_BOUNDS, SOURCE)).toEqual({
      src: { left: 0, top: 0, width: 1500, height: 2000 },
      dst: { left: 355, top: 303, width: 157, height: 209 },
    });
  });

  it("fills a tile fully inside the world", () => {
    const window = tileWindow(16, 32768, 32768, WORLD_BOUNDS, SOURCE);
    expect(window?.dst).toEqual({ left: 0, top: 0, width: 512, height: 512 });
    expect(window?.src.left).toBe(1500);
    expect(window?.src.top).toBe(2000);
  });

  it("skips tiles outside the world", () => {
    expect(tileWindow(16, 0, 0, WORLD_BOUNDS, SOURCE)).toBeNull();
  });

  it("samples neighbouring tiles without gaps or overlap", () => {
    const a = tileWindow(16, 32768, 32768, WORLD_BOUNDS, SOURCE);
    const east = tileWindow(16, 32769, 32768, WORLD_BOUNDS, SOURCE);
    const south = tileWindow(16, 32768, 32769, WORLD_BOUNDS, SOURCE);
    if (!a || !east || !south) throw new Error("expected tiles inside world");
    expect(east.src.left).toBe(a.src.left + a.src.width);
    expect(south.src.top).toBe(a.src.top + a.src.height);
  });
});

describe("overBudget", () => {
  it("flags only tiles above the budget, largest first", () => {
    const tiles = [
      { z: 10, x: 1, y: 1, bytes: MAX_TILE_BYTES },
      { z: 11, x: 2, y: 2, bytes: MAX_TILE_BYTES + 1 },
      { z: 12, x: 3, y: 3, bytes: 250_000 },
      { z: 13, x: 4, y: 4, bytes: 1_000 },
    ];
    expect(overBudget(tiles).map((t) => t.bytes)).toEqual([
      250_000,
      MAX_TILE_BYTES + 1,
    ]);
  });

  it("passes an empty or all-small pyramid", () => {
    expect(overBudget([])).toEqual([]);
    expect(overBudget([{ z: 10, x: 0, y: 0, bytes: 99_999 }])).toEqual([]);
  });
});
