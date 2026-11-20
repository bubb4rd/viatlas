import { PathLayer } from "@deck.gl/layers";
import { type LngLat, WORLD_BOUNDS, worldToLngLat } from "../world";

export type GridLine = { path: LngLat[]; major: boolean };

const MINOR_COLOR: [number, number, number, number] = [120, 190, 210, 28];
const MAJOR_COLOR: [number, number, number, number] = [120, 190, 210, 64];

/** Tactical reference grid over the world bounds. Pure, so it can be unit tested. */
export function buildGrid(stepM: number, majorEvery: number): GridLine[] {
  const { minX, minY, maxX, maxY } = WORLD_BOUNDS;
  const lines: GridLine[] = [];

  for (let i = 0, x = minX; x <= maxX; i++, x += stepM) {
    lines.push({
      path: [worldToLngLat([x, minY]), worldToLngLat([x, maxY])],
      major: i % majorEvery === 0,
    });
  }
  for (let i = 0, y = minY; y <= maxY; i++, y += stepM) {
    lines.push({
      path: [worldToLngLat([minX, y]), worldToLngLat([maxX, y])],
      major: i % majorEvery === 0,
    });
  }
  return lines;
}

// Static data: build once at module load, never per render.
const GRID = buildGrid(1_000, 4);

export function createGridLayer() {
  return new PathLayer<GridLine>({
    id: "grid",
    data: GRID,
    getPath: (d) => d.path,
    getColor: (d) => (d.major ? MAJOR_COLOR : MINOR_COLOR),
    getWidth: 1,
    widthUnits: "pixels",
    pickable: false,
  });
}
