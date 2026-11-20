/**
 * Leonida world coordinate system.
 *
 * Game-world positions are meters on a flat plane: +x east, +y north,
 * origin at the world center. deck.gl's geospatial layers want lng/lat, so we
 * place the world on a synthetic Web Mercator extent at 0°, 0° where projected
 * meters equal world meters exactly. See docs/adr/0002-world-coordinates.md.
 */

/** World position in meters. */
export type WorldPoint = [x: number, y: number];
/** Synthetic geographic position fed to deck.gl. */
export type LngLat = [lng: number, lat: number];

export const EARTH_RADIUS_M = 6_378_137;
const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Playable extent in world meters.
 * Placeholder until the map's real size is known; nothing outside it is rendered.
 */
export const WORLD_BOUNDS = {
  minX: -12_000,
  minY: -16_000,
  maxX: 12_000,
  maxY: 16_000,
} as const;

export function worldToLngLat([x, y]: WorldPoint): LngLat {
  const lng = (x / EARTH_RADIUS_M) * RAD_TO_DEG;
  const lat =
    (2 * Math.atan(Math.exp(y / EARTH_RADIUS_M)) - Math.PI / 2) * RAD_TO_DEG;
  return [lng, lat];
}

export function lngLatToWorld([lng, lat]: LngLat): WorldPoint {
  const x = lng * DEG_TO_RAD * EARTH_RADIUS_M;
  const y =
    EARTH_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + (lat * DEG_TO_RAD) / 2));
  return [x, y];
}
