import type { ViewMode } from "../camera";

const MODES: { value: ViewMode; label: string }[] = [
  { value: "2d", label: "2D" },
  { value: "3d", label: "3D" },
];

type Props = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
};

export function ViewModeToggle({ mode, onChange }: Props) {
  return (
    <fieldset className="hud-panel pointer-events-auto flex gap-1 p-1">
      <legend className="sr-only">Camera mode</legend>
      {MODES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={mode === value}
          onClick={() => onChange(value)}
          className="hud-button"
        >
          {label}
        </button>
      ))}
    </fieldset>
  );
}
