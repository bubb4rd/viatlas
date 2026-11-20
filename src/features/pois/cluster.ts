import { EARTH_RADIUS_M, type WorldPoint } from "@/features/map/world";
import type { Poi } from "./poi";

export type PoiItem =
  | { kind: "poi"; position: WorldPoint; poi: Poi }
  | { kind: "cluster"; position: WorldPoint; count: number };

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
    const [sx, sy] = seed.position;
    const members: Poi[] = [];
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
    });
  });

  return items;
}
