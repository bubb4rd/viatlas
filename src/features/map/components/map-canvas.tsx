"use client";

import { MapView, type MapViewState } from "@deck.gl/core";
import DeckGL from "@deck.gl/react";
import { useRef, useState } from "react";
import {
  createPoiLayer,
  getPoiTooltip,
} from "@/features/pois/layers/poi-layer";
import {
  INITIAL_VIEW_STATE,
  MODE_POSE,
  MODE_TRANSITION,
  type ViewMode,
} from "../camera";
import { createGridLayer } from "../layers/grid-layer";
import { ViewModeToggle } from "./view-mode-toggle";

const VIEW = new MapView({ repeat: false });

function getCursor({
  isDragging,
  isHovering,
}: {
  isDragging: boolean;
  isHovering: boolean;
}) {
  if (isDragging) return "grabbing";
  return isHovering ? "pointer" : "grab";
}

/**
 * Root map renderer. Client-only: loaded via `next/dynamic` with `ssr: false`.
 *
 * The camera is uncontrolled. Per-frame view state goes into a ref, never React
 * state, so panning never re-renders the tree. Mode changes reseed
 * `initialViewState` from the latest camera with a transition.
 */
export default function MapCanvas() {
  const [mode, setMode] = useState<ViewMode>("2d");
  const [initialViewState, setInitialViewState] =
    useState<MapViewState>(INITIAL_VIEW_STATE);
  const latestViewState = useRef<MapViewState>(INITIAL_VIEW_STATE);

  function changeMode(next: ViewMode) {
    setMode(next);
    setInitialViewState({
      ...latestViewState.current,
      ...MODE_POSE[next],
      ...MODE_TRANSITION,
    });
  }

  const layers = [createGridLayer(), createPoiLayer()];
  const is3d = mode === "3d";

  return (
    <>
      <DeckGL
        views={VIEW}
        initialViewState={initialViewState}
        controller={{ dragRotate: is3d, touchRotate: is3d, keyboard: true }}
        onViewStateChange={({ viewState }) => {
          latestViewState.current = viewState as MapViewState;
        }}
        layers={layers}
        getTooltip={getPoiTooltip}
        getCursor={getCursor}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-4">
        <ViewModeToggle mode={mode} onChange={changeMode} />
      </div>
    </>
  );
}
