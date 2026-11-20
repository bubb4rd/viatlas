import { describe, expect, it } from "vitest";
import { WORLD_BOUNDS } from "@/features/map/world";
import { isShownByDefault, type Poi, parsePois, validatePoi } from "./poi";

// Synthetic fixture: not a real place.
const valid: Poi = {
  id: "poi-test-lighthouse",
  name: "Test Lighthouse",
  category: "landmark",
  position: [1250, -3400],
  source: { kind: "trailer", ref: "Trailer 2 @ 01:23", addedBy: "tester" },
  confidence: "confirmed",
};

const emptyFiles = {
  landmark: [],
  business: [],
  activity: [],
  transport: [],
  nature: [],
};

describe("validatePoi", () => {
  it("accepts a complete entry", () => {
    expect(validatePoi(valid)).toEqual([]);
  });

  it.each([
    ["a non-kebab id", { id: "Lighthouse" }, "id"],
    ["an empty name", { name: " " }, "name"],
    ["an unknown category", { category: "secret" }, "category"],
    ["an unknown confidence", { confidence: "rumor" }, "confidence"],
    [
      "a position outside the world",
      { position: [WORLD_BOUNDS.maxX + 1, 0] },
      "position",
    ],
    ["a lng/lat-shaped position", { position: [0.1] }, "position"],
    ["a missing source", { source: undefined }, "source"],
  ])("rejects %s", (_, patch, field) => {
    const errors = validatePoi({ ...valid, ...patch });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(field);
  });

  it("requires a url and license for community sources", () => {
    const community = { kind: "community", ref: "fan map", addedBy: "tester" };
    expect(validatePoi({ ...valid, source: community })).toEqual([
      "community sources need source.url and source.license",
    ]);
    expect(
      validatePoi({
        ...valid,
        source: {
          ...community,
          url: "https://example.com/map",
          license: "CC BY-SA 4.0",
        },
      }),
    ).toEqual([]);
  });

  it("rejects non-objects", () => {
    expect(validatePoi(null)).toEqual(["entry is not an object"]);
  });
});

describe("parsePois", () => {
  it("merges valid category files", () => {
    expect(parsePois({ ...emptyFiles, landmark: [valid] })).toEqual([valid]);
  });

  it("reports every problem with its file and index", () => {
    const parse = () =>
      parsePois({
        ...emptyFiles,
        landmark: [valid, valid],
        business: [{ ...valid, id: "poi-test-other" }, { id: "bad" }],
        nature: {},
      });
    expect(parse).toThrow(/landmark\.json\[1\]: duplicate id/);
    expect(parse).toThrow(/business\.json\[0\]: category "landmark"/);
    expect(parse).toThrow(/business\.json\[1\]: id must/);
    expect(parse).toThrow(/nature\.json: must be a JSON array/);
  });
});

describe("isShownByDefault", () => {
  it("hides speculative entries only", () => {
    expect(isShownByDefault(valid)).toBe(true);
    expect(isShownByDefault({ ...valid, confidence: "likely" })).toBe(true);
    expect(isShownByDefault({ ...valid, confidence: "speculative" })).toBe(
      false,
    );
  });
});
