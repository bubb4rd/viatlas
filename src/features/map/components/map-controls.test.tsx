// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapControls } from "./map-controls";

afterEach(cleanup);

function renderControls() {
  const handlers = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onResetView: vi.fn(),
  };
  render(<MapControls {...handlers} />);
  return handlers;
}

describe("MapControls", () => {
  it("groups labelled buttons", () => {
    renderControls();
    const group = screen.getByRole("group", { name: "Map controls" });
    const names = within(group)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));
    expect(names).toEqual(["Zoom in", "Zoom out", "Reset view to north"]);
  });

  it.each([
    ["Zoom in", "onZoomIn"],
    ["Zoom out", "onZoomOut"],
    ["Reset view to north", "onResetView"],
  ] as const)("%s calls %s", (name, handler) => {
    const handlers = renderControls();
    fireEvent.click(screen.getByRole("button", { name }));
    expect(handlers[handler]).toHaveBeenCalledOnce();
    for (const other of Object.values(handlers)) {
      if (other !== handlers[handler]) expect(other).not.toHaveBeenCalled();
    }
  });
});
