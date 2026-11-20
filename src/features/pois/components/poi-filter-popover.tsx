"use client";

import { Popover } from "@base-ui/react/popover";
import { Switch } from "@base-ui/react/switch";
import { useId } from "react";
import {
  countActiveCategories,
  countPoisByCategory,
  DEFAULT_POI_FILTER,
  isDefaultPoiFilter,
  type PoiFilter,
  setCategoryEnabled,
} from "../filter";
import { POI_CATEGORIES, type Poi, type PoiCategory } from "../poi";

const CATEGORY_META: Record<PoiCategory, { label: string; dotClass: string }> =
  {
    landmark: { label: "Landmarks", dotClass: "bg-poi-landmark" },
    business: { label: "Businesses", dotClass: "bg-poi-business" },
    activity: { label: "Activities", dotClass: "bg-poi-activity" },
    transport: { label: "Transport", dotClass: "bg-poi-transport" },
    nature: { label: "Nature", dotClass: "bg-poi-nature" },
  };

type Props = {
  filter: PoiFilter;
  pois: readonly Poi[];
  onChange: (next: PoiFilter) => void;
};

export function PoiFilterPopover({ filter, pois, onChange }: Props) {
  const idPrefix = useId();
  const activeCount = countActiveCategories(filter);
  const counts = countPoisByCategory(pois, filter.showSpeculative);
  const isModified = !isDefaultPoiFilter(filter);
  const speculativeId = `${idPrefix}-speculative`;

  return (
    <Popover.Root>
      <div className="hud-panel pointer-events-auto flex p-1">
        <Popover.Trigger className="hud-button flex items-center gap-2 uppercase">
          <span>Layers</span>
          <span className="opacity-80">
            {activeCount}/{POI_CATEGORIES.length}
          </span>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          className="z-20"
        >
          <Popover.Popup className="hud-popover w-72 p-3 text-text shadow-2xl motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:data-[ending-style]:-translate-y-1 motion-safe:data-[ending-style]:opacity-0 motion-safe:data-[starting-style]:-translate-y-1 motion-safe:data-[starting-style]:opacity-0">
            <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
              <Popover.Title className="hud-label">Intel Layers</Popover.Title>
              {isModified && (
                <button
                  type="button"
                  onClick={() => onChange(DEFAULT_POI_FILTER)}
                  className="hud-button min-h-11 min-w-11 px-2 text-accent uppercase hover:text-text"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-col">
              {POI_CATEGORIES.map((category) => {
                const { label, dotClass } = CATEGORY_META[category];
                const checked = filter.categories[category];
                const switchId = `${idPrefix}-${category}`;
                return (
                  <label
                    key={category}
                    htmlFor={switchId}
                    className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-1 transition-colors hover:bg-surface"
                  >
                    <span className="flex items-center gap-2.5 text-sm">
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${dotClass}`}
                      />
                      <span>{label}</span>
                      <span className="font-mono text-xs text-text-dim">
                        {counts[category]}
                      </span>
                    </span>
                    <Switch.Root
                      id={switchId}
                      checked={checked}
                      onCheckedChange={(next) =>
                        onChange(setCategoryEnabled(filter, category, next))
                      }
                      className="hud-switch shrink-0"
                    >
                      <Switch.Thumb className="hud-switch-thumb" />
                    </Switch.Root>
                  </label>
                );
              })}
            </div>

            <div className="mt-2 border-t border-line pt-2">
              <p className="hud-label mb-1 px-1">Confidence</p>
              <label
                htmlFor={speculativeId}
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-1 transition-colors hover:bg-surface"
              >
                <span className="text-sm">Speculative markers</span>
                <Switch.Root
                  id={speculativeId}
                  checked={filter.showSpeculative}
                  onCheckedChange={(showSpeculative) =>
                    onChange({ ...filter, showSpeculative })
                  }
                  className="hud-switch shrink-0"
                >
                  <Switch.Thumb className="hud-switch-thumb" />
                </Switch.Root>
              </label>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
