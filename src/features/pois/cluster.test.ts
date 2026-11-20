import { describe, expect, it } from "vitest";
import {
  clusterPois,
  computeClusterExpansion,
  metersPerPixel,
  type PoiCluster,
} from "./cluster";
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
    const a = poi("a", 100, 100);
    const b = poi("b", 300, 100);
    const c = poi("c", 200, 400);
    const items = clusterPois([a, b, c], zoom, radiusPx);
    expect(items).toEqual([
      { kind: "cluster", position: [200, 200], count: 3, members: [a, b, c] },
    ]);
  });

  it("merges close POIs on either side of a grid-index cell edge", () => {
    const a = poi("a", -10, 0);
    const b = poi("b", 10, 0);
    const items = clusterPois([a, b], zoom, radiusPx);
    expect(items).toEqual([
      { kind: "cluster", position: [0, 0], count: 2, members: [a, b] },
    ]);
  });

  it("splits a cluster apart when zoomed in far enough", () => {
    const pois = [poi("a", 100, 100), poi("b", 300, 100)];
    expect(clusterPois(pois, zoom, radiusPx)).toHaveLength(1);
    expect(clusterPois(pois, 17, radiusPx)).toHaveLength(2);
  });
});

describe("computeClusterExpansion", () => {
  const radiusPx = 48;

  it("centers on the cluster centroid and picks the smallest zoom that splits it", () => {
    const pois = [poi("a", 100, 100), poi("b", 300, 100)];
    const [cluster] = clusterPois(pois, 11, radiusPx);
    expect(cluster?.kind).toBe("cluster");
    const target = computeClusterExpansion(cluster as PoiCluster, 11.4, {
      radiusPx,
      maxZoom: 18,
    });

    expect(target.center).toEqual([200, 100]);
    expect(target.zoom).toBe(15);
    expect(clusterPois(pois, target.zoom - 1, radiusPx)).toHaveLength(1);
    expect(clusterPois(pois, target.zoom, radiusPx).length).toBeGreaterThan(1);
  });

  it("advances at least one integer zoom level above the current zoom", () => {
    const pois = [poi("a", 0, 0), poi("b", 800, 0)];
    const [cluster] = clusterPois(pois, 12, radiusPx);
    const target = computeClusterExpansion(cluster as PoiCluster, 12.7, {
      radiusPx,
      maxZoom: 18,
    });

    expect(target.zoom).toBe(13);
    expect(clusterPois(pois, target.zoom, radiusPx)).toHaveLength(2);
  });

  it("steps zoom by +1 when all cluster members share identical coordinates", () => {
    const pois = [poi("a", 500, -500), poi("b", 500, -500)];
    const [cluster] = clusterPois(pois, 12, radiusPx);
    const target = computeClusterExpansion(cluster as PoiCluster, 12.3, {
      radiusPx,
      maxZoom: 18,
    });

    expect(target).toEqual({ center: [500, -500], zoom: 13 });
  });

  it("clamps expansion zoom to maxZoom", () => {
    const pois = [poi("a", 0, 0), poi("b", 1, 0)];
    const [cluster] = clusterPois(pois, 12, radiusPx);
    const target = computeClusterExpansion(cluster as PoiCluster, 12, {
      radiusPx,
      maxZoom: 18,
    });

    expect(target.zoom).toBe(18);
  });
});
