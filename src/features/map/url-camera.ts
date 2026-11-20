/**
 * Camera pose in the URL hash, so a view can be shared or reloaded:
 * `#map=zoom/x/y` in 2D, `#map=zoom/x/y/pitch/bearing` in 3D, with x/y in
 * world meters. Backed by the shared hash utilities in `url-state.ts`.
 */
export {
  formatCameraHash,
  parseCameraHash,
  type UrlCamera,
} from "./url-state";
