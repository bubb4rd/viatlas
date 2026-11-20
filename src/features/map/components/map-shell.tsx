"use client";

import dynamic from "next/dynamic";

// deck.gl needs WebGL and `window`; keep it out of the server render and the
// initial JS chunk.
const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => <MapLoading />,
});

function MapLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <p className="hud-label motion-safe:animate-pulse">
        Establishing uplink…
      </p>
    </div>
  );
}

export function MapShell() {
  return <MapCanvas />;
}
