/**
 * Point-of-interest schema. Mirrors the provenance format in
 * docs/data-and-assets.md; see docs/adr/0004-poi-data-and-clustering.md.
 */
import { WORLD_BOUNDS, type WorldPoint } from "@/features/map/world";

export const POI_CATEGORIES = [
  "landmark",
  "business",
  "activity",
  "transport",
  "nature",
] as const;
export const SOURCE_KINDS = [
  "trailer",
  "screenshot",
  "official-site",
  "in-game",
  "community",
] as const;
export const CONFIDENCE_LEVELS = [
  "confirmed",
  "likely",
  "speculative",
] as const;

export type PoiCategory = (typeof POI_CATEGORIES)[number];
export type SourceKind = (typeof SOURCE_KINDS)[number];
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export type PoiSource = {
  kind: SourceKind;
  /** Where in the source, e.g. "Trailer 2 @ 01:23". */
  ref: string;
  addedBy: string;
  /** Required for `community` sources. */
  url?: string;
  /** Required for `community` sources: the license the data is used under. */
  license?: string;
};

export type Poi = {
  id: string;
  name: string;
  category: PoiCategory;
  position: WorldPoint;
  source: PoiSource;
  confidence: Confidence;
};

const ID_PATTERN = /^poi-[a-z0-9]+(-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isOneOf<T extends string>(
  options: readonly T[],
  value: unknown,
): value is T {
  return (options as readonly unknown[]).includes(value);
}

function isInWorld(value: unknown): value is WorldPoint {
  if (!Array.isArray(value) || value.length !== 2) return false;
  const [x, y] = value as unknown[];
  return (
    typeof x === "number" &&
    typeof y === "number" &&
    x >= WORLD_BOUNDS.minX &&
    x <= WORLD_BOUNDS.maxX &&
    y >= WORLD_BOUNDS.minY &&
    y <= WORLD_BOUNDS.maxY
  );
}

/** Returns every problem with one entry; an empty list means it is a valid `Poi`. */
export function validatePoi(value: unknown): string[] {
  if (!isRecord(value)) return ["entry is not an object"];
  const errors: string[] = [];
  const { id, name, category, position, source, confidence } = value;

  if (typeof id !== "string" || !ID_PATTERN.test(id))
    errors.push("id must look like `poi-kebab-case`");
  if (!isNonEmptyString(name)) errors.push("name is required");
  if (!isOneOf(POI_CATEGORIES, category))
    errors.push(`category must be one of ${POI_CATEGORIES.join(", ")}`);
  if (!isInWorld(position))
    errors.push("position must be [x, y] world meters inside WORLD_BOUNDS");
  if (!isOneOf(CONFIDENCE_LEVELS, confidence))
    errors.push(`confidence must be one of ${CONFIDENCE_LEVELS.join(", ")}`);

  if (!isRecord(source)) {
    errors.push("source is required");
  } else {
    if (!isOneOf(SOURCE_KINDS, source.kind))
      errors.push(`source.kind must be one of ${SOURCE_KINDS.join(", ")}`);
    if (!isNonEmptyString(source.ref)) errors.push("source.ref is required");
    if (!isNonEmptyString(source.addedBy))
      errors.push("source.addedBy is required");
    if (source.url !== undefined && !isNonEmptyString(source.url))
      errors.push("source.url must be a non-empty string");
    if (source.license !== undefined && !isNonEmptyString(source.license))
      errors.push("source.license must be a non-empty string");
    if (source.kind === "community" && !(source.url && source.license))
      errors.push("community sources need source.url and source.license");
  }

  return errors;
}

/**
 * Validates every category file and merges them. Throws one error listing all
 * problems, so a bad data PR fails `pnpm check` with everything to fix at once.
 */
export function parsePois(files: Record<PoiCategory, unknown>): Poi[] {
  const pois: Poi[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const category of POI_CATEGORIES) {
    const file = `data/pois/${category}.json`;
    const entries = files[category];
    if (!Array.isArray(entries)) {
      problems.push(`${file}: must be a JSON array`);
      continue;
    }
    entries.forEach((entry: unknown, i) => {
      const where = `${file}[${i}]`;
      const errors = validatePoi(entry);
      if (errors.length > 0) {
        for (const error of errors) problems.push(`${where}: ${error}`);
        return;
      }
      const poi = entry as Poi;
      if (poi.category !== category)
        problems.push(`${where}: category "${poi.category}" in ${file}`);
      if (seen.has(poi.id)) problems.push(`${where}: duplicate id ${poi.id}`);
      seen.add(poi.id);
      pois.push(poi);
    });
  }

  if (problems.length > 0)
    throw new Error(`Invalid POI data:\n${problems.join("\n")}`);
  return pois;
}

/** Speculative entries stay hidden unless a user opts in (docs/data-and-assets.md). */
export function isShownByDefault(poi: Poi): boolean {
  return poi.confidence !== "speculative";
}
