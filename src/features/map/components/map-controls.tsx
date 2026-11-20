type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
};

/** Zoom and reset buttons: a DOM path for camera moves the canvas only offers to pointers. */
export function MapControls({ onZoomIn, onZoomOut, onResetView }: Props) {
  return (
    <div className="pointer-events-none absolute right-0 bottom-0 p-4">
      <fieldset className="hud-panel pointer-events-auto flex flex-col gap-1 p-1">
        <legend className="sr-only">Map controls</legend>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={onZoomIn}
          className="hud-button text-base"
        >
          <span aria-hidden="true">+</span>
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={onZoomOut}
          className="hud-button text-base"
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          type="button"
          aria-label="Reset view to north"
          onClick={onResetView}
          className="hud-button"
        >
          <span aria-hidden="true">N</span>
        </button>
      </fieldset>
    </div>
  );
}
