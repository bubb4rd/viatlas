import { describe, expect, it } from "vitest";
import {
  countActiveCategories,
  countPoisByCategory,
  DEFAULT_POI_FILTER,
  filterPois,
  isDefaultPoiFilter,
  setCategoryEnabled,
} from "./filter";
import type { Poi } from "./poi";

const makePoi = (
  id: string,
  category: Poi["category"],
  confidence: Poi["confidence"] = "confirmed",
): Poi => ({
  id,
  name: id,
  category,
  position: [0, 0],
  source: { kind: "trailer", ref: "test", addedBy: "tester" },
  confidence,
});

const SAMPLE_POIS: Poi[] = [
  makePoi("poi-pier", "landmark", "confirmed"),
  makePoi("poi-diner", "business", "likely"),
  makePoi("poi-rumor", "landmark", "speculative"),
  makePoi("poi-dock", "transport", "confirmed"),
];

describe("filterPois", () => {
  it("hides speculative entries under the default filter", () => {
    const visible = filterPois(SAMPLE_POIS, DEFAULT_POI_FILTER);
    expect(visible.map((p) => p.id)).toEqual([
      "poi-pier",
      "poi-diner",
      "poi-dock",
    ]);
  });

  it("includes speculative entries when opted in", () => {
    const visible = filterPois(SAMPLE_POIS, {
      ...DEFAULT_POI_FILTER,
      showSpeculative: true,
    });
    expect(visible.map((p) => p.id)).toEqual([
      "poi-pier",
      "poi-diner",
      "poi-rumor",
      "poi-dock",
    ]);
  });

  it("excludes disabled categories", () => {
    const filter = setCategoryEnabled(DEFAULT_POI_FILTER, "landmark", false);
    const visible = filterPois(SAMPLE_POIS, filter);
    expect(visible.map((p) => p.id)).toEqual(["poi-diner", "poi-dock"]);
  });
});

describe("filter helpers", () => {
  it("detects default vs modified filters", () => {
    expect(isDefaultPoiFilter(DEFAULT_POI_FILTER)).toBe(true);
    expect(
      isDefaultPoiFilter({ ...DEFAULT_POI_FILTER, showSpeculative: true }),
    ).toBe(false);
    expect(
      isDefaultPoiFilter(
        setCategoryEnabled(DEFAULT_POI_FILTER, "nature", false),
      ),
    ).toBe(false);
  });

  it("counts active categories", () => {
    expect(countActiveCategories(DEFAULT_POI_FILTER)).toBe(5);
    expect(
      countActiveCategories(
        setCategoryEnabled(DEFAULT_POI_FILTER, "activity", false),
      ),
    ).toBe(4);
  });

  it("counts POIs per category respecting speculative visibility", () => {
    expect(countPoisByCategory(SAMPLE_POIS, false)).toEqual({
      landmark: 1,
      business: 1,
      activity: 0,
      transport: 1,
      nature: 0,
    });
    expect(countPoisByCategory(SAMPLE_POIS, true)).toEqual({
      landmark: 2,
      business: 1,
      activity: 0,
      transport: 1,
      nature: 0,
    });
  });
});
