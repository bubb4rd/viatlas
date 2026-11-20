// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ViewModeToggle } from "./view-mode-toggle";

afterEach(cleanup);

describe("ViewModeToggle", () => {
  it("marks the active mode as pressed", () => {
    render(<ViewModeToggle mode="2d" onChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: "2D" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "3D" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("reports the chosen mode", () => {
    const onChange = vi.fn();
    render(<ViewModeToggle mode="2d" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "3D" }));
    expect(onChange).toHaveBeenCalledWith("3d");
  });
});
