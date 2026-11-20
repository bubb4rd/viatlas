import { describe, expect, it } from "vitest";
import { clusterPois, metersPerPixel } from "./cluster";
import type { Poi } from "./poi";

function poi(id: string, x: number, y: number): Poi {
  return {
    id: `poi-test-${id}`,
    name: `Test ${id}`,
    category: "landmark",
    position: [x, y],
    source: { kind: "trailer", ref: "test", addedBy: "tester" },
    confidence: "confirmed",
  };
}

describe("metersPerPixel", () => {
  it("halves with each zoom level", () => {
    expect(metersPerPixel(11)).toBeCloseTo(metersPerPixel(10) / 2);
  });

  it("matches Web Mercator at zoom 0 with 512px tiles", () => {
    expect(metersPerPixel(0)).toBeCloseTo(78_271.517, 2);
  });
});

describe("clusterPois", () => {
  // At zoom 12 a 48px radius is ~917 m.
  const zoom = 12;
  const radiusPx = 48;

  it("returns nothing for no POIs", () => {
    expect(clusterPois([], zoom, radiusPx)).toEqual([]);
  });

  it("keeps POIs farther apart than the radius as individual markers", () => {
    const items = clusterPois(
      [poi("a", 0, 0), poi("b", 1_000, 0)],
      zoom,
      radiusPx,
    );
    expect(items.map((i) => i.kind)).toEqual(["poi", "poi"]);
  });

  it("merges POIs within the radius into one cluster at their centroid", () => {
    const items = clusterPois(
      [poi("a", 100, 100), poi("b", 300, 100), poi("c", 200, 400)],
      zoom,
      radiusPx,
    );
    expect(items).toEqual([
      { kind: "cluster", position: [200, 200], count: 3 },
    ]);
  });

  it("merges close POIs on either side of a grid-index cell edge", () => {
    const items = clusterPois(
      [poi("a", -10, 0), poi("b", 10, 0)],
      zoom,
      radiusPx,
    );
    expect(items).toEqual([{ kind: "cluster", position: [0, 0], count: 2 }]);
  });

  it("splits a cluster apart when zoomed in far enough", () => {
    const pois = [poi("a", 100, 100), poi("b", 300, 100)];
    expect(clusterPois(pois, zoom, radiusPx)).toHaveLength(1);
    expect(clusterPois(pois, 17, radiusPx)).toHaveLength(2);
  });
});
