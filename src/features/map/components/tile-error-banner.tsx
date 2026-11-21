type Props = {
  onRetry: () => void;
  onDismiss: () => void;
};

/** Non-blocking notice that base map tiles failed; the grid and POIs keep working. */
export function TileErrorBanner({ onRetry, onDismiss }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-4">
      <div
        role="alert"
        className="hud-panel pointer-events-auto flex items-center gap-3 py-1 pl-4 pr-1"
      >
        <p className="text-sm">Some base map tiles failed to load.</p>
        <button type="button" onClick={onRetry} className="hud-button">
          Retry
        </button>
        <button
          type="button"
          aria-label="Dismiss tile error"
          onClick={onDismiss}
          className="hud-button text-base"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
