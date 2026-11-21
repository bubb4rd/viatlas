import { afterEach, describe, expect, it, vi } from "vitest";
import { lngLatToWorld, WORLD_BOUNDS } from "../world";
import { loadTileImage, TILE_EXTENT, tileUrlTemplate } from "./base-tile-layer";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("base tile layer config", () => {
  it("maps its extent back onto WORLD_BOUNDS", () => {
    const [west, south, east, north] = TILE_EXTENT;
    const [minX, minY] = lngLatToWorld([west, south]);
    const [maxX, maxY] = lngLatToWorld([east, north]);
    expect(minX).toBeCloseTo(WORLD_BOUNDS.minX, 6);
    expect(minY).toBeCloseTo(WORLD_BOUNDS.minY, 6);
    expect(maxX).toBeCloseTo(WORLD_BOUNDS.maxX, 6);
    expect(maxY).toBeCloseTo(WORLD_BOUNDS.maxY, 6);
  });

  it.each([
    ["/tiles/v1", "/tiles/v1/{z}/{x}/{y}.webp"],
    ["https://cdn.example/v2/", "https://cdn.example/v2/{z}/{x}/{y}.webp"],
  ])("builds the XYZ template for %s", (base, expected) => {
    expect(tileUrlTemplate(base)).toBe(expected);
  });
});

describe("loadTileImage", () => {
  function stubFetch(status: number) {
    const fetchMock = vi.fn(async () => new Response("x", { status }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("decodes a successful response", async () => {
    stubFetch(200);
    const bitmap = { width: 512 };
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => bitmap),
    );
    await expect(loadTileImage("/t/10/1/2.webp")).resolves.toBe(bitmap);
  });

  it("treats a 404 as an empty tile", async () => {
    stubFetch(404);
    await expect(loadTileImage("/t/10/1/2.webp")).resolves.toBeNull();
  });

  it("throws on server errors so the layer can report them", async () => {
    stubFetch(503);
    await expect(loadTileImage("/t/10/1/2.webp")).rejects.toThrow("HTTP 503");
  });

  it("passes the abort signal through", async () => {
    const fetchMock = stubFetch(404);
    const { signal } = new AbortController();
    await loadTileImage("/t/10/1/2.webp", signal);
    expect(fetchMock).toHaveBeenCalledWith("/t/10/1/2.webp", { signal });
  });
});
