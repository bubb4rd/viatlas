// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_POI_FILTER, setCategoryEnabled } from "@/features/pois/filter";
import type { Confidence, Poi, PoiCategory } from "@/features/pois/poi";
import { PoiSearch } from "./poi-search";

afterEach(cleanup);

// Fixture names only: no real POIs ship yet (docs/data-and-assets.md).
function fixture(
  id: string,
  name: string,
  category: PoiCategory,
  confidence: Confidence = "confirmed",
): Poi {
  return {
    id,
    name,
    category,
    position: [100, -200],
    source: { kind: "trailer", ref: "test", addedBy: "tester" },
    confidence,
  };
}

const POIS = [
  fixture("poi-test-tower", "Test Tower", "landmark"),
  fixture("poi-test-ferry", "Test Ferry", "transport"),
  fixture("poi-test-rumor", "Test Rumor", "landmark", "speculative"),
];

function renderSearch(filter = DEFAULT_POI_FILTER) {
  const onSelect = vi.fn();
  render(<PoiSearch pois={POIS} filter={filter} onSelect={onSelect} />);
  const input = screen.getByRole("combobox", { name: "Search POIs" });
  return { input, onSelect };
}

function type(input: HTMLElement, value: string) {
  input.focus();
  // Base UI opens only on typed input; a bare change looks like autofill.
  fireEvent.input(input, { target: { value }, inputType: "insertText" });
  return screen.queryByRole("listbox");
}

function optionNames(listbox: HTMLElement | null) {
  if (!listbox) return [];
  return within(listbox)
    .queryAllByRole("option")
    .map((option) => option.textContent);
}

describe("PoiSearch", () => {
  it("lists matches but never POIs hidden by the filter", () => {
    const { input } = renderSearch();
    expect(optionNames(type(input, "test"))).toEqual([
      "Test FerryTransport",
      "Test TowerLandmarks",
    ]);

    cleanup();
    const hidden = renderSearch(
      setCategoryEnabled(DEFAULT_POI_FILTER, "transport", false),
    );
    expect(optionNames(type(hidden.input, "test"))).toEqual([
      "Test TowerLandmarks",
    ]);
  });

  it("includes speculative POIs only when the filter shows them", () => {
    const { input } = renderSearch({
      ...DEFAULT_POI_FILTER,
      showSpeculative: true,
    });
    expect(optionNames(type(input, "rumor"))).toEqual(["Test RumorLandmarks"]);
  });

  it("selects a result by click or by Enter", () => {
    const { input, onSelect } = renderSearch();
    const listbox = type(input, "ferry");
    if (!listbox) throw new Error("expected results");
    fireEvent.click(within(listbox).getByRole("option"));
    expect(onSelect).toHaveBeenCalledWith(POIS[1]);

    onSelect.mockClear();
    type(input, "tower");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(POIS[0]);
  });

  it("says so when nothing matches", () => {
    const { input } = renderSearch();
    expect(optionNames(type(input, "zzz"))).toEqual([]);
    expect(screen.getByRole("status").textContent).toMatch(/^No matches/);
  });

  it("focuses on / unless another field has focus", () => {
    const { input } = renderSearch();
    const other = document.createElement("input");
    document.body.append(other);

    fireEvent.keyDown(document.body, { key: "/", ctrlKey: true });
    expect(document.activeElement).not.toBe(input);
    fireEvent.keyDown(document.body, { key: "/" });
    expect(document.activeElement).toBe(input);

    other.focus();
    fireEvent.keyDown(other, { key: "/" });
    expect(document.activeElement).toBe(other);
    other.remove();
  });
});
