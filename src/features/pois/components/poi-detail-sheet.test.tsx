// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Poi } from "../poi";
import { PoiDetailSheet } from "./poi-detail-sheet";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const FIXTURE_POI: Poi = {
  id: "poi-test-pier",
  name: "Test Pier",
  category: "landmark",
  position: [1250.4, -3400],
  source: { kind: "trailer", ref: "Test ref @ 00:00", addedBy: "tester" },
  confidence: "likely",
};

const COMMUNITY_POI: Poi = {
  ...FIXTURE_POI,
  id: "poi-test-community",
  source: {
    kind: "community",
    ref: "Test community map",
    addedBy: "tester",
    url: "https://example.com/map",
    license: "CC BY 4.0",
  },
  confidence: "speculative",
};

const SHARE_URL =
  "https://viatlas.test/#map=13.00/1250/-3400&poi=poi-test-pier";

function renderSheet(poi: Poi = FIXTURE_POI) {
  const onClose = vi.fn();
  const getShareUrl = vi.fn(() => SHARE_URL);
  render(
    <PoiDetailSheet poi={poi} getShareUrl={getShareUrl} onClose={onClose} />,
  );
  return { onClose, dialog: screen.getByRole("dialog", { name: poi.name }) };
}

describe("PoiDetailSheet", () => {
  it("renders the name, category, confidence, and world position", () => {
    const { dialog } = renderSheet();
    const text = dialog.textContent ?? "";
    expect(text).toContain("landmark");
    expect(text).toContain("likely");
    expect(within(dialog).getByText("X 1,250 m")).toBeDefined();
    expect(within(dialog).getByText("Y -3,400 m")).toBeDefined();
  });

  it("cites the source kind, reference, and contributor", () => {
    renderSheet();
    const source = within(screen.getByRole("region", { name: "Source" }));
    expect(source.getByText("Trailer")).toBeDefined();
    expect(source.getByText("Test ref @ 00:00")).toBeDefined();
    expect(source.getByText("tester")).toBeDefined();
    expect(source.queryByRole("link")).toBeNull();
  });

  it("links community sources with their license", () => {
    renderSheet(COMMUNITY_POI);
    const source = within(screen.getByRole("region", { name: "Source" }));
    expect(source.getByText("Community")).toBeDefined();
    expect(source.getByText("CC BY 4.0")).toBeDefined();
    expect(
      source.getByRole("link", { name: "https://example.com/map" }),
    ).toHaveProperty("href", "https://example.com/map");
  });

  it("closes on Escape", () => {
    const { onClose, dialog } = renderSheet();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes from the close button", () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("copies the deep link and announces it", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(await screen.findByText("Link copied")).toBeDefined();
  });

  it("reports a failed copy", async () => {
    const writeText = vi.fn(() => Promise.reject(new Error("denied")));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByText(/copy failed/i)).toBeDefined();
  });
});
