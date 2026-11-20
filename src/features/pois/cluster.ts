import { EARTH_RADIUS_M, type WorldPoint } from "@/features/map/world";
import type { Poi } from "./poi";

export type PoiMarker = {
  kind: "poi";
  position: WorldPoint;
  poi: Poi;
};

export type PoiCluster = {
  kind: "cluster";
  position: WorldPoint;
  count: number;
  /** POIs grouped in this cluster, starting with the clustering seed. */
  members: readonly Poi[];
};

export type PoiItem = PoiMarker | PoiCluster;

export type ClusterExpansionTarget = {
  center: WorldPoint;
  zoom: number;
};

export type ClusterExpansionOptions = {
  radiusPx?: number;
  minZoom?: number;
  maxZoom?: number;
};

/** POIs closer than this on screen merge into a cluster. */
export const DEFAULT_CLUSTER_RADIUS_PX = 48;

/** deck.gl renders 512px world tiles at zoom 0. */
const TILE_SIZE_PX = 512;

/**
 * Meters covered by one screen pixel at a zoom level. Constant across the map,
 * because world meters are projected Web Mercator meters (ADR-0002).
 */
export function metersPerPixel(zoom: number): number {
  return (2 * Math.PI * EARTH_RADIUS_M) / (TILE_SIZE_PX * 2 ** zoom);
}

/**
 * Greedy radius clustering: in input order, each unclaimed POI claims every
 * unclaimed POI within `radiusPx` on screen at `zoom`. A POI that claims no
 * others stays a marker; otherwise the group becomes a cluster at its centroid.
 * A grid index with cells of one radius keeps each lookup to 3×3 cells.
 */
export function clusterPois(
  pois: readonly Poi[],
  zoom: number,
  radiusPx: number,
): PoiItem[] {
  const radiusM = radiusPx * metersPerPixel(zoom);
  const cellOf = (v: number) => Math.floor(v / radiusM);
  const index = new Map<string, number[]>();
  pois.forEach(({ position: [x, y] }, i) => {
    const key = `${cellOf(x)}:${cellOf(y)}`;
    const cell = index.get(key);
    if (cell) cell.push(i);
    else index.set(key, [i]);
  });

  const claimed = new Uint8Array(pois.length);
  const items: PoiItem[] = [];

  pois.forEach((seed, i) => {
    if (claimed[i]) return;
    claimed[i] = 1;
    const [sx, sy] = seed.position;
    const members: Poi[] = [seed];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const j of index.get(`${cellOf(sx) + dx}:${cellOf(sy) + dy}`) ??
          []) {
          const other = pois[j];
          if (claimed[j] || !other) continue;
          const [ox, oy] = other.position;
          if (Math.hypot(ox - sx, oy - sy) > radiusM) continue;
          claimed[j] = 1;
          members.push(other);
        }
      }
    }

    if (members.length === 1) {
      items.push({ kind: "poi", position: seed.position, poi: seed });
      return;
    }
    let sumX = 0;
    let sumY = 0;
    for (const { position } of members) {
      sumX += position[0];
      sumY += position[1];
    }
    items.push({
      kind: "cluster",
      position: [sumX / members.length, sumY / members.length],
      count: members.length,
      members,
    });
  });

  return items;
}

/**
 * Computes the target world center and integer zoom level needed to expand a
 * clicked cluster into at least two items, advancing at least one integer zoom
 * level above `currentZoom` and clamping to `[minZoom, maxZoom]`.
 */
export function computeClusterExpansion(
  cluster: PoiCluster,
  currentZoom: number,
  {
    radiusPx = DEFAULT_CLUSTER_RADIUS_PX,
    minZoom = 0,
    maxZoom = 18,
  }: ClusterExpansionOptions = {},
): ClusterExpansionTarget {
  const baseZoom = Math.floor(currentZoom) + 1;
  const seed = cluster.members[0];
  let maxDistM = 0;
  if (seed) {
    const [sx, sy] = seed.position;
    for (let i = 1; i < cluster.members.length; i++) {
      const member = cluster.members[i];
      if (!member) continue;
      const dist = Math.hypot(member.position[0] - sx, member.position[1] - sy);
      if (dist > maxDistM) maxDistM = dist;
    }
  }

  let targetZoom = baseZoom;
  if (maxDistM > 0 && radiusPx > 0) {
    const splitZoom =
      Math.floor(Math.log2((radiusPx * metersPerPixel(0)) / maxDistM)) + 1;
    if (splitZoom > targetZoom) targetZoom = splitZoom;
    while (
      targetZoom < maxZoom &&
      radiusPx * metersPerPixel(targetZoom) >= maxDistM
    ) {
      targetZoom += 1;
    }
  }

  return {
    center: cluster.position,
    zoom: Math.min(maxZoom, Math.max(minZoom, targetZoom)),
  };
}
