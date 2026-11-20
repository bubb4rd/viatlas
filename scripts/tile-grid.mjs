// Pure XYZ tile math for build-tiles.mjs. See docs/adr/0007-base-tiles-and-cdn.md.
// World meters are Web Mercator meters (ADR-0002), so tiles follow the standard
// XYZ grid: x grows east from -πR, y grows south from +πR.
import { EARTH_RADIUS_M } from "../src/features/map/world.ts";

export const TILE_SIZE_PX = 512;
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 16;
/** Per-tile budget from docs/standards.md (100 KB, read as 100,000 bytes). */
export const MAX_TILE_BYTES = 100_000;

const HALF_WORLD_M = Math.PI * EARTH_RADIUS_M;

/** Edge length of one tile at `zoom`, in meters. */
export function tileSizeM(zoom) {
  return (2 * HALF_WORLD_M) / 2 ** zoom;
}

/** Inclusive x/y tile index range covering `bounds` at `zoom`. */
export function tileRange(bounds, zoom) {
  const s = tileSizeM(zoom);
  return {
    minX: Math.floor((bounds.minX + HALF_WORLD_M) / s),
    maxX: Math.ceil((bounds.maxX + HALF_WORLD_M) / s) - 1,
    minY: Math.floor((HALF_WORLD_M - bounds.maxY) / s),
    maxY: Math.ceil((HALF_WORLD_M - bounds.minY) / s) - 1,
  };
}

/** Tile extent in world meters. */
export function tileBoundsM(zoom, x, y) {
  const s = tileSizeM(zoom);
  const minX = x * s - HALF_WORLD_M;
  const maxY = HALF_WORLD_M - y * s;
  return { minX, minY: maxY - s, maxX: minX + s, maxY };
}

/**
 * Where tile (zoom, x, y) samples the source image and where that patch lands
 * in the tile. The source image spans `bounds` exactly. Returns null when the
 * tile doesn't overlap `bounds`.
 */
export function tileWindow(zoom, x, y, bounds, source) {
  const tile = tileBoundsM(zoom, x, y);
  const left = Math.max(tile.minX, bounds.minX);
  const right = Math.min(tile.maxX, bounds.maxX);
  const bottom = Math.max(tile.minY, bounds.minY);
  const top = Math.min(tile.maxY, bounds.maxY);
  if (left >= right || bottom >= top) return null;

  const s = tileSizeM(zoom);
  const srcX = (m) =>
    Math.round(
      ((m - bounds.minX) / (bounds.maxX - bounds.minX)) * source.width,
    );
  const srcY = (m) =>
    Math.round(
      ((bounds.maxY - m) / (bounds.maxY - bounds.minY)) * source.height,
    );
  const dstX = (m) => Math.round(((m - tile.minX) / s) * TILE_SIZE_PX);
  const dstY = (m) => Math.round(((tile.maxY - m) / s) * TILE_SIZE_PX);

  const src = rect(srcX(left), srcY(top), srcX(right), srcY(bottom));
  const dst = rect(dstX(left), dstY(top), dstX(right), dstY(bottom));
  if (!src.width || !src.height || !dst.width || !dst.height) return null;
  return { src, dst };
}

function rect(x0, y0, x1, y1) {
  return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
}

/** Every tile in the pyramid that overlaps `bounds`, with its sampling window. */
export function* pyramid(bounds, source) {
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const r = tileRange(bounds, z);
    for (let x = r.minX; x <= r.maxX; x++) {
      for (let y = r.minY; y <= r.maxY; y++) {
        const window = tileWindow(z, x, y, bounds, source);
        if (window) yield { z, x, y, ...window };
      }
    }
  }
}

/** Tiles larger than `maxBytes`, largest first. */
export function overBudget(tiles, maxBytes = MAX_TILE_BYTES) {
  return tiles
    .filter((t) => t.bytes > maxBytes)
    .sort((a, b) => b.bytes - a.bytes);
}
