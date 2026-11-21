// @vitest-environment jsdom
import type { DeckGLRef } from "@deck.gl/react";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePickingWarmUp } from "./use-picking-warm-up";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function setup(isInitialized: boolean) {
  const pickObject = vi.fn();
  const { result } = renderHook(() => usePickingWarmUp());
  result.current.ref.current = {
    deck: { isInitialized, pickObject },
  } as unknown as DeckGLRef;
  return { warmUp: result.current, pickObject };
}

describe("usePickingWarmUp", () => {
  it("picks once, after the first frame's render callback returns", () => {
    const { warmUp, pickObject } = setup(true);

    warmUp.onAfterRender();
    expect(pickObject).not.toHaveBeenCalled();
    vi.runAllTimers();
    warmUp.onAfterRender();
    vi.runAllTimers();

    expect(pickObject).toHaveBeenCalledTimes(1);
  });

  it("skips a deck that was finalized before the pick ran", () => {
    const { warmUp, pickObject } = setup(false);

    warmUp.onAfterRender();
    vi.runAllTimers();

    expect(pickObject).not.toHaveBeenCalled();
  });
});
