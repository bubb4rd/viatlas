import { MapController } from "@deck.gl/core";
import { prefersReducedMotion } from "./use-reduced-motion";

type TransitionProps = ReturnType<MapController["_getTransitionProps"]>;

/**
 * MapController whose own keyboard and double-tap zooms jump instead of
 * animating while the OS asks for reduced motion. deck.gl hard-codes their
 * 300 ms transition on the instance, not in props.
 *
 * It checks the setting on each move rather than being swapped in: changing
 * the controller class makes deck.gl rebuild it from a stale camera.
 */
export class MotionAwareMapController extends MapController {
  protected override _getTransitionProps(opts?: unknown): TransitionProps {
    const props = super._getTransitionProps(opts);
    return prefersReducedMotion() ? { ...props, transitionDuration: 0 } : props;
  }
}
