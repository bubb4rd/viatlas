import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_VISIBLE_POIS, POIS } from "./data";
import { POI_CATEGORIES } from "./poi";

// The real data files: this is the gate that runs in `pnpm check` and CI.
describe("data/pois", () => {
  it("passes validation (importing ./data throws otherwise)", () => {
    expect(Array.isArray(POIS)).toBe(true);
    expect(
      DEFAULT_VISIBLE_POIS.every((p) => p.confidence !== "speculative"),
    ).toBe(true);
  });

  it("has exactly one file per category", () => {
    const dir = fileURLToPath(new URL("../../../data/pois", import.meta.url));
    const files = readdirSync(dir).sort();
    expect(files).toEqual(POI_CATEGORIES.map((c) => `${c}.json`).sort());
  });
});
