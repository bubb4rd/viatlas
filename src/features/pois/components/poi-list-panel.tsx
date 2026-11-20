"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { POI_CATEGORIES, type Poi } from "../poi";
import { CATEGORY_META } from "./poi-filter-popover";

type Props = {
  /** Exactly the POIs the map draws under the active filter. */
  pois: readonly Poi[];
  selectedPoiId: string | null;
  onSelect: (poi: Poi) => void;
};

const ITEM_SELECTOR = "[data-poi-item]";

function getItems(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR));
}

/** Where an arrow, Home, or End key moves focus in a list of `count` items. */
function nextIndex(key: string, current: number, count: number) {
  if (count === 0) return null;
  switch (key) {
    case "ArrowDown":
      return Math.min(current + 1, count - 1);
    case "ArrowUp":
      return Math.max(current - 1, 0);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/**
 * Toggleable DOM list of the filtered POIs: the keyboard and screen-reader
 * path to every marker the canvas draws. Arrow keys, Home, and End move
 * between items; Escape closes the panel and returns focus to the toggle.
 * If a filter change removes the focused item, focus moves to its neighbour,
 * or to the panel when none are left.
 */
export function PoiListPanel({ pois, selectedPoiId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const idPrefix = useId();
  const panelId = `${idPrefix}-panel`;
  const headingId = `${idPrefix}-heading`;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  // The item that last had focus, so a filter change that removes it can hand
  // focus to a neighbour instead of dropping it on <body>.
  const lastFocused = useRef<{ item: HTMLElement; index: number } | null>(null);

  useEffect(() => {
    const last = lastFocused.current;
    if (!last || last.item.isConnected) return;
    lastFocused.current = null;
    const panel = panelRef.current;
    if (!panel || document.activeElement !== document.body) return;
    const items = getItems(panel);
    (items[Math.min(last.index, items.length - 1)] ?? panel).focus();
  });

  function handleFocus(event: FocusEvent<HTMLElement>) {
    const items = getItems(event.currentTarget);
    const index = items.indexOf(event.target as HTMLButtonElement);
    const item = items[index];
    lastFocused.current = item ? { item, index } : null;
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget;
    if (next && !event.currentTarget.contains(next)) lastFocused.current = null;
  }

  const groups = POI_CATEGORIES.map((category) => ({
    category,
    items: pois
      .filter((poi) => poi.category === category)
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length > 0);

  // Shared by the toggle and the panel, so Escape and ArrowDown work from both.
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      toggleRef.current?.focus();
      return;
    }
    const items = panelRef.current ? getItems(panelRef.current) : [];
    const current = items.findIndex((item) => item === document.activeElement);
    const target = nextIndex(event.key, current, items.length);
    if (target === null) return;
    event.preventDefault();
    items[target]?.focus();
  }

  return (
    <div className="pointer-events-none absolute top-20 bottom-0 left-0 flex flex-col-reverse items-start gap-2 p-4">
      <div className="hud-panel pointer-events-auto flex p-1">
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((was) => !was)}
          onKeyDown={handleKeyDown}
          className="hud-button flex items-center gap-2 uppercase aria-expanded:bg-accent aria-expanded:text-bg"
        >
          <span>POI list</span>
          <span className="opacity-80">{pois.length}</span>
        </button>
      </div>
      {open && (
        <section
          ref={panelRef}
          id={panelId}
          aria-labelledby={headingId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="hud-popover pointer-events-auto flex max-h-[32rem] min-h-0 w-64 flex-col text-text shadow-2xl focus-visible:outline-2 focus-visible:outline-accent-2"
        >
          <h2
            id={headingId}
            className="hud-label border-b border-line px-3 py-2"
          >
            Points of interest
          </h2>
          {groups.length === 0 ? (
            <p className="px-3 py-4 text-sm text-text-dim">
              No POIs to show with the current Intel Layers.
            </p>
          ) : (
            <div className="min-h-0 overflow-y-auto p-1">
              {groups.map(({ category, items }) => {
                const { label, dotClass } = CATEGORY_META[category];
                const groupId = `${idPrefix}-${category}`;
                return (
                  <div key={category}>
                    <h3
                      id={groupId}
                      className="hud-label flex items-center gap-2 px-2 pt-2 pb-1"
                    >
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${dotClass}`}
                      />
                      {label}
                    </h3>
                    <ul aria-labelledby={groupId}>
                      {items.map((poi) => (
                        <li key={poi.id}>
                          <button
                            type="button"
                            data-poi-item
                            aria-current={
                              poi.id === selectedPoiId ? "true" : undefined
                            }
                            onClick={() => onSelect(poi)}
                            className="flex min-h-11 w-full items-center px-2 text-left text-sm transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent-2 focus-visible:-outline-offset-2 aria-[current=true]:bg-accent aria-[current=true]:text-bg"
                          >
                            {poi.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
