"use client";

import { MapView, type MapViewState } from "@deck.gl/core";
import DeckGL from "@deck.gl/react";
import { useEffect, useRef, useState } from "react";
import {
  computeClusterExpansion,
  type PoiCluster,
} from "@/features/pois/cluster";
import { PoiFilterPopover } from "@/features/pois/components/poi-filter-popover";
import { DEFAULT_VISIBLE_POIS, POIS } from "@/features/pois/data";
import {
  DEFAULT_POI_FILTER,
  filterPois,
  isDefaultPoiFilter,
  type PoiFilter,
} from "@/features/pois/filter";
import {
  CLUSTER_RADIUS_PX,
  createPoiLayer,
  getPoiTooltip,
} from "@/features/pois/layers/poi-layer";
import type { Poi } from "@/features/pois/poi";
import {
  FLY_TO_TRANSITION,
  INITIAL_VIEW_STATE,
  MODE_POSE,
  MODE_TRANSITION,
  resetView,
  type ViewMode,
  ZOOM_STEP,
  zoomBy,
} from "../camera";
import { createGridLayer } from "../layers/grid-layer";
import { formatCameraHash, parseCameraHash } from "../url-camera";
import { worldToLngLat } from "../world";
import { MapControls } from "./map-controls";
import { ViewModeToggle } from "./view-mode-toggle";

const VIEW = new MapView({ repeat: false });

/** Quiet time after the last camera frame before the URL is rewritten. */
const URL_WRITE_DELAY_MS = 250;

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
 *
 * The camera round-trips through the URL hash: read on load and on
 * `hashchange`, written with `replaceState` once the camera settles.
 */
export default function MapCanvas() {
  // Client-only component, so `window` exists on first render.
  const [fromUrl] = useState(() => parseCameraHash(window.location.hash));
  const [mode, setMode] = useState<ViewMode>(fromUrl?.mode ?? "2d");
  const [poiFilter, setPoiFilter] = useState<PoiFilter>(DEFAULT_POI_FILTER);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [initialViewState, setInitialViewState] = useState<MapViewState>(
    fromUrl?.viewState ?? INITIAL_VIEW_STATE,
  );
  const latestViewState = useRef<MapViewState>(initialViewState);
  const modeRef = useRef<ViewMode>(mode);
  const urlWriteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function scheduleUrlWrite() {
    clearTimeout(urlWriteTimer.current);
    urlWriteTimer.current = setTimeout(() => {
      const { hash } = window.location;
      const next = formatCameraHash(
        hash,
        latestViewState.current,
        modeRef.current,
      );
      if (next !== hash) window.history.replaceState(null, "", next);
    }, URL_WRITE_DELAY_MS);
  }

  useEffect(() => {
    function onHashChange() {
      const next = parseCameraHash(window.location.hash);
      if (!next) return;
      modeRef.current = next.mode;
      setMode(next.mode);
      setInitialViewState(next.viewState);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      clearTimeout(urlWriteTimer.current);
    };
  }, []);

  function changeMode(next: ViewMode) {
    modeRef.current = next;
    setMode(next);
    setInitialViewState({
      ...latestViewState.current,
      ...MODE_POSE[next],
      ...MODE_TRANSITION,
    });
  }

  function changePoiFilter(next: PoiFilter) {
    setPoiFilter(next);
    if (selectedPoiId !== null) {
      const nextVisible = isDefaultPoiFilter(next)
        ? DEFAULT_VISIBLE_POIS
        : filterPois(POIS, next);
      if (!nextVisible.some((poi) => poi.id === selectedPoiId)) {
        setSelectedPoiId(null);
      }
    }
  }

  function handleSelectPoi(poi: Poi) {
    setSelectedPoiId(poi.id);
  }

  function handleSelectCluster(cluster: PoiCluster) {
    const current = latestViewState.current;
    const { center, zoom } = computeClusterExpansion(cluster, current.zoom, {
      radiusPx: CLUSTER_RADIUS_PX,
      minZoom: INITIAL_VIEW_STATE.minZoom,
      maxZoom: INITIAL_VIEW_STATE.maxZoom,
    });
    const [longitude, latitude] = worldToLngLat(center);
    setInitialViewState({
      ...current,
      longitude,
      latitude,
      zoom,
      ...FLY_TO_TRANSITION,
    });
  }

  function flyTo(next: MapViewState) {
    setInitialViewState({ ...next, ...FLY_TO_TRANSITION });
  }

  const visiblePois = isDefaultPoiFilter(poiFilter)
    ? DEFAULT_VISIBLE_POIS
    : filterPois(POIS, poiFilter);
  const layers = [
    createGridLayer(),
    createPoiLayer({
      pois: visiblePois,
      selectedPoiId,
      onSelectPoi: handleSelectPoi,
      onSelectCluster: handleSelectCluster,
    }),
  ];
  const is3d = mode === "3d";

  return (
    <>
      <DeckGL
        views={VIEW}
        initialViewState={initialViewState}
        controller={{ dragRotate: is3d, touchRotate: is3d, keyboard: true }}
        onViewStateChange={({ viewState }) => {
          latestViewState.current = viewState as MapViewState;
          scheduleUrlWrite();
        }}
        onClick={({ object }) => {
          if (!object) setSelectedPoiId(null);
        }}
        layers={layers}
        getTooltip={getPoiTooltip}
        getCursor={getCursor}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
        <PoiFilterPopover
          filter={poiFilter}
          pois={POIS}
          onChange={changePoiFilter}
        />
        <ViewModeToggle mode={mode} onChange={changeMode} />
      </div>
      <MapControls
        onZoomIn={() => flyTo(zoomBy(latestViewState.current, ZOOM_STEP))}
        onZoomOut={() => flyTo(zoomBy(latestViewState.current, -ZOOM_STEP))}
        onResetView={() =>
          flyTo(resetView(latestViewState.current, modeRef.current))
        }
      />
    </>
  );
}
