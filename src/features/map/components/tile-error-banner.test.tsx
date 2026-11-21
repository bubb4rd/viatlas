// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TileErrorBanner } from "./tile-error-banner";

afterEach(cleanup);

describe("TileErrorBanner", () => {
  it("announces the failure", () => {
    render(<TileErrorBanner onRetry={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain(
      "Some base map tiles failed to load.",
    );
  });

  it("calls onRetry and onDismiss from their buttons", () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();
    render(<TileErrorBanner onRetry={onRetry} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss tile error" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
