import { describe, expect, it } from "vitest";
import type { Confidence, Poi, PoiCategory } from "@/features/pois/poi";
import {
  createPoiSearchIndex,
  normalizeSearchText,
  searchPois,
} from "./poi-search";

function makePoi(
  id: string,
  name: string,
  category: PoiCategory,
  confidence: Confidence = "confirmed",
): Poi {
  return {
    id,
    name,
    category,
    position: [0, 0],
    source: { kind: "trailer", ref: "test", addedBy: "tester" },
    confidence,
  };
}

const SAMPLE_POIS: readonly Poi[] = [
  makePoi("poi-vice-pier", "Vice Pier", "landmark", "confirmed"),
  makePoi("poi-vice-beach", "Vice Beach", "nature", "confirmed"),
  makePoi("poi-south-vice-docks", "South Vice Docks", "transport", "confirmed"),
  makePoi("poi-device-repair", "Device Repair Shop", "business", "confirmed"),
  makePoi("poi-cafe-leonida", "Café Leonida", "business", "likely"),
  makePoi("poi-rumor-vault", "Vice Rumor Vault", "landmark", "speculative"),
  makePoi("poi-bay-heliport", "Bay Heliport", "transport", "confirmed"),
];

const INDEX = createPoiSearchIndex(SAMPLE_POIS, {
  aliasesById: {
    "poi-bay-heliport": ["Chopper Pad", "Vice Helipad"],
    "poi-vice-pier": ["Boardwalk"],
  },
});

describe("normalizeSearchText", () => {
  it("strips diacritics, lowercases, and collapses punctuation", () => {
    expect(normalizeSearchText("  Café — Leonida!  ")).toBe("cafe leonida");
    expect(normalizeSearchText("---")).toBe("");
  });
});

describe("searchPois", () => {
  it("returns no results for empty, whitespace, or punctuation-only queries", () => {
    expect(searchPois(INDEX, "")).toEqual([]);
    expect(searchPois(INDEX, "   \t\n  ")).toEqual([]);
    expect(searchPois(INDEX, "!!!")).toEqual([]);
  });

  it("matches case-insensitively and ignores diacritics", () => {
    const results = searchPois(INDEX, "CAFE");
    expect(results.map((r) => r.poi.id)).toEqual(["poi-cafe-leonida"]);
    expect(results[0]?.matchedField).toBe("name");
  });

  it("ranks exact > prefix > word-prefix > alias > substring matches", () => {
    const results = searchPois(INDEX, "vice");
    expect(results.map((r) => r.poi.id)).toEqual([
      "poi-vice-pier", // name prefix (shorter than Vice Beach)
      "poi-vice-beach", // name prefix
      "poi-south-vice-docks", // word prefix in name
      "poi-bay-heliport", // alias prefix ("Vice Helipad")
      "poi-device-repair", // substring ("de[vice]")
    ]);
  });

  it("ranks an exact name match above longer prefix matches", () => {
    const exactIndex = createPoiSearchIndex([
      makePoi("poi-pier-north", "Pier North", "landmark"),
      makePoi("poi-pier", "Pier", "landmark"),
    ]);
    const results = searchPois(exactIndex, "pier");
    expect(results.map((r) => r.poi.id)).toEqual([
      "poi-pier",
      "poi-pier-north",
    ]);
  });

  it("matches categories and multi-token name + category queries", () => {
    const categoryOnly = searchPois(INDEX, "transport");
    expect(categoryOnly.map((r) => r.poi.id)).toEqual([
      "poi-bay-heliport",
      "poi-south-vice-docks",
    ]);
    expect(categoryOnly.every((r) => r.matchedField === "category")).toBe(true);

    const combined = searchPois(INDEX, "vice transport");
    expect(combined.map((r) => r.poi.id)).toEqual([
      "poi-south-vice-docks",
      "poi-bay-heliport",
    ]);
  });

  it("matches aliases and records alias as matchedField", () => {
    const results = searchPois(INDEX, "boardwalk");
    expect(results.map((r) => r.poi.id)).toEqual(["poi-vice-pier"]);
    expect(results[0]?.matchedField).toBe("alias");
  });

  it("hides speculative POIs by default and includes them only when opted in", () => {
    expect(searchPois(INDEX, "rumor")).toEqual([]);
    expect(
      searchPois(INDEX, "vice").some((r) => r.poi.id === "poi-rumor-vault"),
    ).toBe(false);

    const optedIn = searchPois(INDEX, "rumor", { showSpeculative: true });
    expect(optedIn.map((r) => r.poi.id)).toEqual(["poi-rumor-vault"]);
  });

  it("respects category visibility filters so disabled categories are excluded", () => {
    const results = searchPois(INDEX, "vice", {
      categories: { landmark: false, business: false },
    });
    expect(results.map((r) => r.poi.id)).toEqual([
      "poi-vice-beach",
      "poi-south-vice-docks",
      "poi-bay-heliport",
    ]);
  });

  it("breaks score ties by confidence then name length then alphabetically", () => {
    const tieIndex = createPoiSearchIndex([
      makePoi("poi-alpha", "Alpha Hub", "landmark", "confirmed"),
      makePoi("poi-zeta", "Zeta Hub", "landmark", "confirmed"),
      makePoi("poi-beta-likely", "Beta Hub", "landmark", "likely"),
      makePoi("poi-beta", "Beta Hub", "landmark", "confirmed"),
    ]);
    const results = searchPois(tieIndex, "hub");
    expect(results.map((r) => r.poi.id)).toEqual([
      "poi-beta", // confirmed, 8 chars, B before Z
      "poi-zeta", // confirmed, 8 chars
      "poi-alpha", // confirmed, 9 chars
      "poi-beta-likely", // likely
    ]);
  });

  it("enforces result limit including zero and negative edge cases", () => {
    expect(searchPois(INDEX, "vice", { limit: 2 })).toHaveLength(2);
    expect(searchPois(INDEX, "vice", { limit: 0 })).toEqual([]);
    expect(searchPois(INDEX, "vice", { limit: -5 })).toEqual([]);
  });
});
