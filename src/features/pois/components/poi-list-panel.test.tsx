// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Poi, PoiCategory } from "../poi";
import { PoiListPanel } from "./poi-list-panel";

afterEach(cleanup);

// Fixture names only: no real POIs ship yet (docs/data-and-assets.md).
function fixture(id: string, name: string, category: PoiCategory): Poi {
  return {
    id,
    name,
    category,
    position: [0, 0],
    source: { kind: "trailer", ref: "test", addedBy: "tester" },
    confidence: "confirmed",
  };
}

const POIS = [
  fixture("poi-test-tower", "Test Tower", "landmark"),
  fixture("poi-test-ferry", "Test Ferry", "transport"),
  fixture("poi-test-arch", "Test Arch", "landmark"),
];

function renderPanel(selectedPoiId: string | null = null, pois = POIS) {
  const onSelect = vi.fn();
  render(
    <PoiListPanel
      pois={pois}
      selectedPoiId={selectedPoiId}
      onSelect={onSelect}
    />,
  );
  const toggle = screen.getByRole("button", { name: /poi list/i });
  return { onSelect, toggle };
}

function open(toggle: HTMLElement) {
  fireEvent.click(toggle);
  return screen.getByRole("region", { name: "Points of interest" });
}

describe("PoiListPanel", () => {
  it("starts collapsed and toggles a labelled region", () => {
    const { toggle } = renderPanel();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("3");
    expect(screen.queryByRole("region")).toBeNull();

    const region = open(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe(region.id);

    fireEvent.click(toggle);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("groups POIs by category, sorted by name", () => {
    const { toggle } = renderPanel();
    const region = open(toggle);
    const names = (label: string) =>
      within(within(region).getByRole("list", { name: label }))
        .getAllByRole("button")
        .map((button) => button.textContent);
    expect(names("Landmarks")).toEqual(["Test Arch", "Test Tower"]);
    expect(names("Transport")).toEqual(["Test Ferry"]);
    expect(within(region).queryByRole("list", { name: "Nature" })).toBeNull();
  });

  it("selects a POI and marks the current one", () => {
    const { toggle, onSelect } = renderPanel("poi-test-ferry");
    open(toggle);
    const ferry = screen.getByRole("button", { name: "Test Ferry" });
    expect(ferry.getAttribute("aria-current")).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Test Tower" })
        .hasAttribute("aria-current"),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Test Tower" }));
    expect(onSelect).toHaveBeenCalledWith(POIS[0]);
  });

  it("moves focus with arrows, Home, and End; Escape closes to the toggle", () => {
    const { toggle } = renderPanel();
    const region = open(toggle);
    const [arch, tower, ferry] = within(region).getAllByRole("button");

    fireEvent.keyDown(toggle, { key: "ArrowDown" });
    expect(document.activeElement).toBe(arch);
    fireEvent.keyDown(region, { key: "ArrowDown" });
    expect(document.activeElement).toBe(tower);
    fireEvent.keyDown(region, { key: "End" });
    expect(document.activeElement).toBe(ferry);
    fireEvent.keyDown(region, { key: "ArrowDown" });
    expect(document.activeElement).toBe(ferry);
    fireEvent.keyDown(region, { key: "ArrowUp" });
    expect(document.activeElement).toBe(tower);
    fireEvent.keyDown(region, { key: "Home" });
    expect(document.activeElement).toBe(arch);

    fireEvent.keyDown(region, { key: "Escape" });
    expect(screen.queryByRole("region")).toBeNull();
    expect(document.activeElement).toBe(toggle);

    open(toggle);
    fireEvent.keyDown(toggle, { key: "Escape" });
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("explains an empty list", () => {
    const { toggle } = renderPanel(null, []);
    const region = open(toggle);
    expect(within(region).queryByRole("list")).toBeNull();
    expect(region.textContent).toMatch(/no pois to show/i);
  });

  it("moves focus to a neighbour when a filter removes the focused item", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <PoiListPanel pois={POIS} selectedPoiId={null} onSelect={onSelect} />,
    );
    const region = open(screen.getByRole("button", { name: /poi list/i }));
    within(region).getByRole("button", { name: "Test Tower" }).focus();

    // Hiding landmarks removes the focused Test Tower (and Test Arch).
    rerender(
      <PoiListPanel
        pois={POIS.filter((poi) => poi.category !== "landmark")}
        selectedPoiId={null}
        onSelect={onSelect}
      />,
    );
    expect(document.activeElement).toBe(
      within(region).getByRole("button", { name: "Test Ferry" }),
    );

    rerender(
      <PoiListPanel pois={[]} selectedPoiId={null} onSelect={onSelect} />,
    );
    expect(document.activeElement).toBe(region);
  });
});
