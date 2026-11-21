// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useReducedMotion } from "./use-reduced-motion";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A matchMedia whose answer the test can flip, notifying listeners. */
function stubMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })),
  );
  return {
    listeners,
    set(next: boolean) {
      matches = next;
      for (const fn of listeners) fn();
    },
  };
}

describe("useReducedMotion", () => {
  it("follows the OS setting as it changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it("stops listening on unmount", () => {
    const media = stubMatchMedia(true);
    const { unmount } = renderHook(() => useReducedMotion());
    expect(media.listeners.size).toBe(1);

    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
