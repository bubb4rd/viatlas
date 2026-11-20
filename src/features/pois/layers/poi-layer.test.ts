import { describe, expect, it } from "vitest";
import type { Poi } from "../poi";
import { poiTooltipText } from "./poi-layer";

const poi: Poi = {
  id: "poi-test-pier",
  name: "Test Pier",
  category: "landmark",
  position: [0, 0],
  source: { kind: "trailer", ref: "test", addedBy: "tester" },
  confidence: "confirmed",
};

describe("poiTooltipText", () => {
  it("shows name and category", () => {
    expect(poiTooltipText({ kind: "poi", position: [0, 0], poi })).toBe(
      "Test Pier\nlandmark",
    );
  });

  it("flags anything less than confirmed", () => {
    const likely = { ...poi, confidence: "likely" as const };
    expect(poiTooltipText({ kind: "poi", position: [0, 0], poi: likely })).toBe(
      "Test Pier\nlandmark · likely",
    );
  });

  it("counts cluster members", () => {
    expect(
      poiTooltipText({ kind: "cluster", position: [0, 0], count: 4 }),
    ).toBe("4 places");
  });

  it("ignores empty picks", () => {
    expect(poiTooltipText(undefined)).toBeNull();
  });
});
