// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_POI_FILTER, setCategoryEnabled } from "../filter";
import type { Poi } from "../poi";
import { PoiFilterPopover } from "./poi-filter-popover";

afterEach(cleanup);

const SAMPLE_POIS: Poi[] = [
  {
    id: "poi-pier",
    name: "Test Pier",
    category: "landmark",
    position: [0, 0],
    source: { kind: "trailer", ref: "test", addedBy: "tester" },
    confidence: "confirmed",
  },
];

describe("PoiFilterPopover", () => {
  it("opens and toggles a category switch", () => {
    const onChange = vi.fn();
    render(
      <PoiFilterPopover
        filter={DEFAULT_POI_FILTER}
        pois={SAMPLE_POIS}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /layers/i }));

    const landmarks = screen.getByRole("switch", { name: /landmarks/i });
    expect(landmarks.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(landmarks);
    expect(onChange).toHaveBeenCalledWith(
      setCategoryEnabled(DEFAULT_POI_FILTER, "landmark", false),
    );
  });

  it("toggles speculative visibility and resets modified filters", () => {
    const onChange = vi.fn();
    const modified = setCategoryEnabled(DEFAULT_POI_FILTER, "nature", false);
    render(
      <PoiFilterPopover
        filter={modified}
        pois={SAMPLE_POIS}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /layers/i }));

    const speculative = screen.getByRole("switch", {
      name: /speculative markers/i,
    });
    expect(speculative.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(speculative);
    expect(onChange).toHaveBeenCalledWith({
      ...modified,
      showSpeculative: true,
    });

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_POI_FILTER);
  });
});
