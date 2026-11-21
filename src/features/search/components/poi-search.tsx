"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { useEffect, useRef, useState } from "react";
import { CATEGORY_META } from "@/features/pois/components/poi-filter-popover";
import type { PoiFilter } from "@/features/pois/filter";
import type { Poi } from "@/features/pois/poi";
import { createPoiSearchIndex, searchPois } from "../poi-search";

type Props = {
  /** Every POI. The search index applies `filter` itself. */
  pois: readonly Poi[];
  filter: PoiFilter;
  onSelect: (poi: Poi) => void;
};

const RESULT_LIMIT = 8;

/** True when a keystroke there is typing, so `/` must not steal focus. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [contenteditable]") !== null
  );
}

/**
 * POI search combobox. Matches name, alias, and category through the shared
 * search index, so POIs hidden by the active filter never appear. `/` focuses
 * the input from anywhere except another text field.
 */
export function PoiSearch({ pois, filter, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const index = createPoiSearchIndex(pois);
  const results = searchPois(index, query, {
    categories: filter.categories,
    showSpeculative: filter.showSpeculative,
    limit: RESULT_LIMIT,
  }).map((result) => result.poi);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.defaultPrevented) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditable(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Autocomplete.Root
      items={results}
      filter={null}
      value={query}
      onValueChange={setQuery}
      itemToStringValue={(poi: Poi) => poi.name}
      autoHighlight
    >
      <div className="hud-panel group pointer-events-auto relative flex min-w-0 flex-1 p-1 sm:max-w-xs">
        <Autocomplete.Input
          ref={inputRef}
          aria-label="Search POIs"
          aria-keyshortcuts="/"
          placeholder="Search POIs"
          className="min-h-11 w-full min-w-0 bg-transparent pr-8 pl-3 text-sm text-text placeholder:text-text-dim focus-visible:outline-2 focus-visible:outline-accent-2 any-pointer-coarse:text-base"
        />
        {query === "" && (
          <span
            aria-hidden="true"
            className="hud-label pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 group-focus-within:hidden any-pointer-coarse:hidden"
          >
            /
          </span>
        )}
      </div>
      <Autocomplete.Portal hidden={query.trim() === ""}>
        <Autocomplete.Positioner
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-20"
        >
          <Autocomplete.Popup className="hud-popover w-[max(var(--anchor-width),18rem)] max-w-(--available-width) text-text shadow-2xl">
            <Autocomplete.Empty>
              <p className="px-3 py-4 text-sm text-text-dim">No matches</p>
            </Autocomplete.Empty>
            <Autocomplete.List className="max-h-[min(22rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 data-empty:p-0">
              {(poi: Poi) => (
                <Autocomplete.Item
                  key={poi.id}
                  value={poi}
                  onClick={() => onSelect(poi)}
                  className="flex min-h-11 cursor-default items-center gap-3 px-2 text-sm select-none data-highlighted:bg-accent data-highlighted:text-bg"
                >
                  <span className="min-w-0 flex-1 truncate">{poi.name}</span>
                  <span className="shrink-0 text-xs opacity-80">
                    {CATEGORY_META[poi.category].label}
                  </span>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
