import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";
import { WORLD_BOUNDS, worldToLngLat } from "../world";

/** Pyramid from ADR-0007; must match scripts/tile-grid.mjs. */
export const TILE_SIZE_PX = 512;
export const TILE_MIN_ZOOM = 10;
export const TILE_MAX_ZOOM = 16;

const [minLng, minLat] = worldToLngLat([WORLD_BOUNDS.minX, WORLD_BOUNDS.minY]);
const [maxLng, maxLat] = worldToLngLat([WORLD_BOUNDS.maxX, WORLD_BOUNDS.maxY]);
/** WORLD_BOUNDS as [west, south, east, north]; tiles outside it are never fetched. */
export const TILE_EXTENT = [minLng, minLat, maxLng, maxLat] as const;

/** XYZ URL template under a versioned tile root such as `/tiles/v1`. */
export function tileUrlTemplate(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/{z}/{x}/{y}.webp`;
}

/**
 * Fetches one tile. A 404 is an empty tile (sparse ocean edges) and resolves to
 * null; any other failure throws so the layer reports it.
 */
export async function loadTileImage(
  url: string,
  signal?: AbortSignal,
): Promise<ImageBitmap | null> {
  const response = await fetch(url, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return createImageBitmap(await response.blob());
}

type Params = {
  /** Versioned tile root, e.g. `/tiles/v1` or the CDN prefix. */
  baseUrl: string;
  /** Bump to refetch every tile, e.g. from a retry button. */
  retryKey: number;
  onTileError: (error: unknown) => void;
};

/** Original base map artwork as 512 px WebP XYZ tiles over WORLD_BOUNDS. */
export function createBaseTileLayer({
  baseUrl,
  retryKey,
  onTileError,
}: Params) {
  return new TileLayer<ImageBitmap | null>({
    id: "base-tiles",
    data: tileUrlTemplate(baseUrl),
    extent: [...TILE_EXTENT],
    tileSize: TILE_SIZE_PX,
    minZoom: TILE_MIN_ZOOM,
    maxZoom: TILE_MAX_ZOOM,
    getTileData: ({ url, signal }) => (url ? loadTileImage(url, signal) : null),
    updateTriggers: { getTileData: retryKey },
    onTileError,
    pickable: false,
    renderSubLayers: ({ id, data, tile }) => {
      // Geospatial views always give a west/south/east/north box.
      if (!data || !("west" in tile.bbox)) return null;
      const { west, south, east, north } = tile.bbox;
      return new BitmapLayer({
        id,
        image: data,
        bounds: [west, south, east, north],
      });
    },
  });
}
