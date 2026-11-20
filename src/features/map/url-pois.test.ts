import { describe, expect, it } from "vitest";
import { DEFAULT_POI_FILTER } from "@/features/pois/filter";
import type { Poi } from "@/features/pois/poi";
import { parsePoiHash } from "./url-pois";
import { formatMapHash } from "./url-state";

// Test fixtures only: not real Leonida locations.
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

const POIS: Poi[] = [
  makePoi("poi-fixture-landmark", "landmark"),
  makePoi("poi-fixture-business", "business", "likely"),
  makePoi("poi-fixture-rumor", "nature", "speculative"),
];

describe("parsePoiHash", () => {
  it("selects a visible POI from a deep link with a camera", () => {
    const state = parsePoiHash("#map=12.00/0/0&poi=poi-fixture-landmark", POIS);
    expect(state).toEqual({
      poiFilter: DEFAULT_POI_FILTER,
      selectedPoiId: "poi-fixture-landmark",
    });
  });

  it("reads hidden categories and the speculative toggle", () => {
    const state = parsePoiHash(
      "#hide=business&speculative=1&poi=poi-fixture-rumor",
      POIS,
    );
    expect(state.poiFilter.categories.business).toBe(false);
    expect(state.poiFilter.categories.landmark).toBe(true);
    expect(state.poiFilter.showSpeculative).toBe(true);
    expect(state.selectedPoiId).toBe("poi-fixture-rumor");
  });

  it("drops a selection that is unknown or hidden by the filter", () => {
    expect(parsePoiHash("#poi=poi-missing", POIS).selectedPoiId).toBeNull();
    expect(
      parsePoiHash("#poi=poi-fixture-business&hide=business", POIS)
        .selectedPoiId,
    ).toBeNull();
    expect(
      parsePoiHash("#poi=poi-fixture-rumor", POIS).selectedPoiId,
    ).toBeNull();
    expect(parsePoiHash("#poi=Not%20An%20Id", POIS).selectedPoiId).toBeNull();
  });

  it("round-trips filter and selection written by formatMapHash", () => {
    const written = formatMapHash("#map=12.00/0/0&utm=x", {
      poiFilter: {
        categories: { ...DEFAULT_POI_FILTER.categories, landmark: false },
        showSpeculative: true,
      },
      selectedPoiId: "poi-fixture-rumor",
    });
    expect(written).toBe(
      "#map=12.00/0/0&utm=x&poi=poi-fixture-rumor&hide=landmark&speculative=1",
    );
    const state = parsePoiHash(written, POIS);
    expect(state.poiFilter.categories.landmark).toBe(false);
    expect(state.poiFilter.showSpeculative).toBe(true);
    expect(state.selectedPoiId).toBe("poi-fixture-rumor");
  });

  it("clears filter and selection keys back to defaults", () => {
    expect(
      formatMapHash("#map=12.00/0/0&hide=nature&speculative=1&poi=poi-a", {
        poiFilter: DEFAULT_POI_FILTER,
        selectedPoiId: null,
      }),
    ).toBe("#map=12.00/0/0");
  });
});
