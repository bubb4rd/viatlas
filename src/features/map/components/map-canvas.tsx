"use client";

import { MapView, type MapViewState } from "@deck.gl/core";
import DeckGL from "@deck.gl/react";
import { useEffect, useRef, useState } from "react";
import {
  computeClusterExpansion,
  type PoiCluster,
} from "@/features/pois/cluster";
import { PoiDetailSheet } from "@/features/pois/components/poi-detail-sheet";
import { PoiFilterPopover } from "@/features/pois/components/poi-filter-popover";
import { PoiListPanel } from "@/features/pois/components/poi-list-panel";
import { DEFAULT_VISIBLE_POIS, POIS } from "@/features/pois/data";
import {
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
import { PoiSearch } from "@/features/search/components/poi-search";
import {
  CAMERA_INERTIA_MS,
  cameraTransition,
  FLY_TO_TRANSITION,
  focusOn,
  INITIAL_VIEW_STATE,
  MODE_POSE,
  MODE_TRANSITION,
  resetView,
  type ViewMode,
  ZOOM_STEP,
  zoomBy,
} from "../camera";
import { createBaseTileLayer } from "../layers/base-tile-layer";
import { createGridLayer } from "../layers/grid-layer";
import { MotionAwareMapController } from "../motion-aware-map-controller";
import { formatCameraHash, parseCameraHash } from "../url-camera";
import { parsePoiHash } from "../url-pois";
import { formatMapHash } from "../url-state";
import { usePickingWarmUp } from "../use-picking-warm-up";
import { useReducedMotion } from "../use-reduced-motion";
import { worldToLngLat } from "../world";
import { MapControls } from "./map-controls";
import { TileErrorBanner } from "./tile-error-banner";
import { ViewModeToggle } from "./view-mode-toggle";

const VIEW = new MapView({ repeat: false });

/** Versioned tile root (ADR-0007). Unset: no base map, grid and POIs only. */
const TILE_BASE_URL = process.env.NEXT_PUBLIC_TILE_BASE_URL;

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
 * The camera, POI filter, and selected POI round-trip through the URL hash:
 * read on load and on `hashchange`, written with `replaceState` once the
 * camera settles or right after a filter or selection change.
 */
export default function MapCanvas() {
  // Client-only component, so `window` exists on first render.
  const [fromUrl] = useState(() => parseCameraHash(window.location.hash));
  const [mode, setMode] = useState<ViewMode>(fromUrl?.mode ?? "2d");
  const [poisFromUrl] = useState(() =>
    parsePoiHash(window.location.hash, POIS),
  );
  const [poiFilter, setPoiFilter] = useState<PoiFilter>(poisFromUrl.poiFilter);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(
    poisFromUrl.selectedPoiId,
  );
  const [initialViewState, setInitialViewState] = useState<MapViewState>(
    fromUrl?.viewState ?? INITIAL_VIEW_STATE,
  );
  const latestViewState = useRef<MapViewState>(initialViewState);
  const modeRef = useRef<ViewMode>(mode);
  const urlWriteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pickingWarmUp = usePickingWarmUp();
  const reduceMotion = useReducedMotion();
  // Changes once per failure burst (React bails out on the same value), not per
  // frame. Dismissed stays dismissed until Retry or a reload.
  const [tileNotice, setTileNotice] = useState<
    "hidden" | "shown" | "dismissed"
  >("hidden");
  const [tileRetryKey, setTileRetryKey] = useState(0);

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
      const pois = parsePoiHash(window.location.hash, POIS);
      setPoiFilter(pois.poiFilter);
      setSelectedPoiId(pois.selectedPoiId);
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

  // Filter and selection change on discrete clicks, so write them right away.
  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const next = formatMapHash(hash, { poiFilter, selectedPoiId });
    // An empty URL would keep the old hash, so drop it via the path instead.
    if (next !== hash) {
      window.history.replaceState(null, "", next || pathname + search);
    }
  }, [poiFilter, selectedPoiId]);

  /** Moves the camera, animated unless the OS asks for reduced motion. */
  function moveCamera(
    next: MapViewState,
    transition: typeof MODE_TRANSITION | typeof FLY_TO_TRANSITION,
  ) {
    const move = cameraTransition(transition, reduceMotion);
    setInitialViewState({ ...next, ...move });
    // deck.gl reports animated moves through onViewStateChange, but not jumps.
    if (move.transitionDuration === 0) {
      latestViewState.current = next;
      scheduleUrlWrite();
    }
  }

  function changeMode(next: ViewMode) {
    modeRef.current = next;
    setMode(next);
    moveCamera(
      { ...latestViewState.current, ...MODE_POSE[next] },
      MODE_TRANSITION,
    );
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
    flyTo({ ...current, longitude, latitude, zoom });
  }

  // Read the live camera, since the hash lags it by URL_WRITE_DELAY_MS.
  function getShareUrl() {
    const { origin, pathname, search, hash } = window.location;
    const camera = {
      viewState: latestViewState.current,
      mode: modeRef.current,
    };
    return `${origin}${pathname}${search}${formatMapHash(hash, { camera, selectedPoiId })}`;
  }

  function flyTo(next: MapViewState) {
    moveCamera(next, FLY_TO_TRANSITION);
  }

  function handleListSelect(poi: Poi) {
    setSelectedPoiId(poi.id);
    flyTo(focusOn(latestViewState.current, poi.position));
  }

  const visiblePois = isDefaultPoiFilter(poiFilter)
    ? DEFAULT_VISIBLE_POIS
    : filterPois(POIS, poiFilter);
  const layers = [
    TILE_BASE_URL
      ? createBaseTileLayer({
          baseUrl: TILE_BASE_URL,
          retryKey: tileRetryKey,
          onTileError: (error) => {
            console.error("Base map tile failed to load", error);
            setTileNotice((notice) =>
              notice === "dismissed" ? notice : "shown",
            );
          },
        })
      : null,
    createGridLayer(),
    createPoiLayer({
      pois: visiblePois,
      selectedPoiId,
      onSelectPoi: handleSelectPoi,
      onSelectCluster: handleSelectCluster,
    }),
  ];
  const is3d = mode === "3d";
  const selectedPoi = POIS.find((poi) => poi.id === selectedPoiId);

  return (
    <>
      <DeckGL
        {...pickingWarmUp}
        views={VIEW}
        initialViewState={initialViewState}
        controller={{
          type: MotionAwareMapController,
          dragRotate: is3d,
          touchRotate: is3d,
          keyboard: true,
          // A fling keeps the camera moving after the finger lifts.
          inertia: reduceMotion ? false : CAMERA_INERTIA_MS,
        }}
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
        <PoiSearch pois={POIS} filter={poiFilter} onSelect={handleListSelect} />
        <ViewModeToggle mode={mode} onChange={changeMode} />
      </div>
      <PoiListPanel
        pois={visiblePois}
        selectedPoiId={selectedPoiId}
        onSelect={handleListSelect}
      />
      {tileNotice === "shown" && (
        <TileErrorBanner
          onRetry={() => {
            setTileNotice("hidden");
            setTileRetryKey((key) => key + 1);
          }}
          onDismiss={() => setTileNotice("dismissed")}
        />
      )}
      <MapControls
        onZoomIn={() => flyTo(zoomBy(latestViewState.current, ZOOM_STEP))}
        onZoomOut={() => flyTo(zoomBy(latestViewState.current, -ZOOM_STEP))}
        onResetView={() =>
          flyTo(resetView(latestViewState.current, modeRef.current))
        }
      />
      {selectedPoi && (
        <PoiDetailSheet
          key={selectedPoi.id}
          poi={selectedPoi}
          getShareUrl={getShareUrl}
          onClose={() => setSelectedPoiId(null)}
        />
      )}
    </>
  );
}
