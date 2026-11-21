import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True while the OS asks for reduced motion, read at call time. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * True while the OS asks for reduced motion. Re-renders only when that
 * setting changes, never per frame. Client-only, like the map.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion);
}
