#!/usr/bin/env node
// Slices original base map artwork into the ADR-0007 WebP tile pyramid and
// fails if any tile exceeds the size budget. See data/README.md.
//   pnpm tiles [--source data/raw/base-map.png] [--out public/tiles] [--version v1] [--quality 80]
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { WORLD_BOUNDS } from "../src/features/map/world.ts";
import {
  MAX_TILE_BYTES,
  MAX_ZOOM,
  MIN_ZOOM,
  overBudget,
  pyramid,
  TILE_SIZE_PX,
} from "./tile-grid.mjs";

const { values: args } = parseArgs({
  options: {
    source: { type: "string", default: "data/raw/base-map.png" },
    out: { type: "string", default: "public/tiles" },
    version: { type: "string", default: "v1" },
    quality: { type: "string", default: "80" },
  },
});

function fail(message) {
  console.error(`✖ build-tiles: ${message}`);
  process.exit(1);
}

const quality = Number(args.quality);
if (!Number.isInteger(quality) || quality < 1 || quality > 100)
  fail(`--quality must be an integer 1–100, got "${args.quality}"`);
if (!/^v\d+$/.test(args.version))
  fail(`--version must look like v1, v2, …, got "${args.version}"`);
if (!existsSync(args.source)) fail(`source artwork not found: ${args.source}`);

// Published versions are immutable (ADR-0007), so never overwrite one.
const outDir = path.join(args.out, args.version);
if (existsSync(outDir))
  fail(`${outDir} already exists; pick a new --version or delete it`);

// Decode once; every tile then crops raw pixels instead of re-decoding.
const { data, info } = await sharp(args.source, { limitInputPixels: false })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const source = { width: info.width, height: info.height };
const raw = { ...source, channels: 4 };

// The artwork spans WORLD_BOUNDS exactly, so its aspect ratio must match.
const worldAspect =
  (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) /
  (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY);
if (Math.abs(source.width / source.height / worldAspect - 1) > 0.01)
  fail(
    `source is ${source.width}×${source.height}; aspect ratio must match WORLD_BOUNDS (${worldAspect.toFixed(4)})`,
  );

const tiles = [];
for (const tile of pyramid(WORLD_BOUNDS, source)) {
  const patch = await sharp(data, { raw })
    .extract(tile.src)
    .resize(tile.dst.width, tile.dst.height, { fit: "fill" })
    .raw()
    .toBuffer();
  const webp = await sharp({
    create: {
      width: TILE_SIZE_PX,
      height: TILE_SIZE_PX,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: patch,
        raw: { width: tile.dst.width, height: tile.dst.height, channels: 4 },
        left: tile.dst.left,
        top: tile.dst.top,
      },
    ])
    .webp({ quality })
    .toBuffer();
  const dir = path.join(outDir, String(tile.z), String(tile.x));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${tile.y}.webp`), webp);
  tiles.push({ z: tile.z, x: tile.x, y: tile.y, bytes: webp.length });
}

const oversized = overBudget(tiles);
if (oversized.length > 0) {
  // Don't leave a version behind that could be uploaded by mistake.
  await rm(outDir, { recursive: true, force: true });
  console.error(
    `✖ build-tiles: ${oversized.length} of ${tiles.length} tiles exceed ${MAX_TILE_BYTES} bytes:`,
  );
  for (const t of oversized.slice(0, 20))
    console.error(`  ${t.z}/${t.x}/${t.y}.webp  ${t.bytes} bytes`);
  if (oversized.length > 20)
    console.error(`  … and ${oversized.length - 20} more`);
  console.error(
    `  Simplify the artwork or lower --quality. Removed ${outDir}.`,
  );
  process.exit(1);
}

const maxTileBytes = Math.max(0, ...tiles.map((t) => t.bytes));
const manifest = {
  version: args.version,
  bounds: WORLD_BOUNDS,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  tileSize: TILE_SIZE_PX,
  tileCount: tiles.length,
  maxTileBytes,
};
await writeFile(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
process.stdout.write(
  `✔ ${tiles.length} tiles in ${outDir} (largest ${maxTileBytes} bytes)\n`,
);
