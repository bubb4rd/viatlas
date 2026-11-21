import type { DeckGLRef } from "@deck.gl/react";
import { useRef } from "react";

/**
 * Runs one throwaway pick after the first frame, so the user's first click or
 * tap isn't the one that pays for it. Spread the result onto `<DeckGL>`.
 *
 * deck.gl picks synchronously on `pointerdown`, and the first pick after load
 * stalls on its first picking-buffer readback (~0.5 s in Chromium). mjolnir.js
 * times taps with `Date.now()`, so the stall stretches the press past the
 * 250 ms tap limit and that first click never fires (#42). A hover pick hides
 * this with a mouse; touch has no hover.
 */
export function usePickingWarmUp() {
  const ref = useRef<DeckGLRef>(null);
  const done = useRef(false);

  function onAfterRender() {
    if (done.current) return;
    done.current = true;
    // Picking inside the render callback would nest a pass inside the frame.
    setTimeout(() => {
      const deck = ref.current?.deck;
      if (deck?.isInitialized) deck.pickObject({ x: 0, y: 0 });
    });
  }

  return { ref, onAfterRender };
}
