import { afterEach, describe, expect, it, vi } from "vitest";
import { MotionAwareMapController } from "./motion-aware-map-controller";

afterEach(() => {
  vi.unstubAllGlobals();
});

// Enough of deck.gl's controller wiring to construct one outside a Deck.
function createController() {
  const controller = new MotionAwareMapController({
    timeline: {} as never,
    eventManager: { on: vi.fn(), off: vi.fn() } as never,
    makeViewport: vi.fn() as never,
    onViewStateChange: vi.fn(),
    onStateChange: vi.fn(),
  });
  // The hook deck.gl uses for keyboard and double-tap zoom transitions.
  return controller as unknown as {
    _getTransitionProps: () => { transitionDuration: number };
  };
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal("window", { matchMedia: () => ({ matches }) });
}

describe("MotionAwareMapController", () => {
  it("keeps deck.gl's zoom transition when motion is allowed", () => {
    stubReducedMotion(false);
    expect(
      createController()._getTransitionProps().transitionDuration,
    ).toBeGreaterThan(0);
  });

  it("jumps while the OS asks for reduced motion, checked on each move", () => {
    const controller = createController();
    stubReducedMotion(true);
    expect(controller._getTransitionProps().transitionDuration).toBe(0);

    stubReducedMotion(false);
    expect(controller._getTransitionProps().transitionDuration).toBeGreaterThan(
      0,
    );
  });
});
