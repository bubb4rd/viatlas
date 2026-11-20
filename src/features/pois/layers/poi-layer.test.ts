import type { PickingInfo } from "@deck.gl/core";
import { describe, expect, it, vi } from "vitest";
import type { PoiCluster, PoiMarker } from "../cluster";
import type { Poi } from "../poi";
import {
  createPoiLayer,
  getPoiMarkerLineColor,
  getPoiMarkerLineWidth,
  getPoiMarkerRadius,
  handlePoiPick,
  isSelectedPoiItem,
  poiTooltipText,
} from "./poi-layer";

const poi: Poi = {
  id: "poi-test-pier",
  name: "Test Pier",
  category: "landmark",
  position: [0, 0],
  source: { kind: "trailer", ref: "test", addedBy: "tester" },
  confidence: "confirmed",
};

const otherPoi: Poi = {
  id: "poi-test-marina",
  name: "Test Marina",
  category: "transport",
  position: [200, 0],
  source: { kind: "trailer", ref: "test", addedBy: "tester" },
  confidence: "confirmed",
};

const markerItem: PoiMarker = { kind: "poi", position: [0, 0], poi };
const clusterItem: PoiCluster = {
  kind: "cluster",
  position: [100, 0],
  count: 2,
  members: [poi, otherPoi],
};

describe("poiTooltipText", () => {
  it("shows name and category", () => {
    expect(poiTooltipText(markerItem)).toBe("Test Pier\nlandmark");
  });

  it("flags anything less than confirmed", () => {
    const likely = { ...poi, confidence: "likely" as const };
    expect(poiTooltipText({ kind: "poi", position: [0, 0], poi: likely })).toBe(
      "Test Pier\nlandmark · likely",
    );
  });

  it("counts cluster members", () => {
    expect(
      poiTooltipText({
        kind: "cluster",
        position: [0, 0],
        count: 4,
        members: [poi, otherPoi],
      }),
    ).toBe("4 places");
  });

  it("ignores empty picks", () => {
    expect(poiTooltipText(undefined)).toBeNull();
  });
});

describe("handlePoiPick", () => {
  it("emits onSelectPoi for a single POI marker", () => {
    const onSelectPoi = vi.fn();
    const onSelectCluster = vi.fn();

    expect(handlePoiPick(markerItem, { onSelectPoi, onSelectCluster })).toBe(
      true,
    );
    expect(onSelectPoi).toHaveBeenCalledExactlyOnceWith(poi);
    expect(onSelectCluster).not.toHaveBeenCalled();
  });

  it("emits onSelectCluster for a cluster marker", () => {
    const onSelectPoi = vi.fn();
    const onSelectCluster = vi.fn();

    expect(handlePoiPick(clusterItem, { onSelectPoi, onSelectCluster })).toBe(
      true,
    );
    expect(onSelectCluster).toHaveBeenCalledExactlyOnceWith(clusterItem);
    expect(onSelectPoi).not.toHaveBeenCalled();
  });

  it("returns false when no object or no matching callback exists", () => {
    expect(handlePoiPick(undefined, { onSelectPoi: vi.fn() })).toBe(false);
    expect(handlePoiPick(markerItem, {})).toBe(false);
    expect(handlePoiPick(clusterItem, { onSelectPoi: vi.fn() })).toBe(false);
  });
});

describe("POI selection highlight", () => {
  it("enlarges radius and switches outline styling only for the selected POI", () => {
    expect(isSelectedPoiItem(markerItem, poi.id)).toBe(true);
    expect(isSelectedPoiItem(markerItem, otherPoi.id)).toBe(false);
    expect(isSelectedPoiItem(clusterItem, poi.id)).toBe(false);

    expect(getPoiMarkerRadius(markerItem, poi.id)).toBeGreaterThan(
      getPoiMarkerRadius(markerItem, null),
    );
    expect(getPoiMarkerLineWidth(markerItem, poi.id)).toBeGreaterThan(
      getPoiMarkerLineWidth(markerItem, null),
    );
    expect(getPoiMarkerLineColor(markerItem, poi.id)).not.toEqual(
      getPoiMarkerLineColor(markerItem, null),
    );

    // Clusters stay unaffected by a POI selection.
    expect(getPoiMarkerRadius(clusterItem, poi.id)).toBe(
      getPoiMarkerRadius(clusterItem, null),
    );
    expect(getPoiMarkerLineColor(clusterItem, poi.id)).toEqual(
      getPoiMarkerLineColor(clusterItem, null),
    );
  });

  it("wires selection callbacks and updateTriggers through createPoiLayer", () => {
    const onSelectPoi = vi.fn();
    const onSelectCluster = vi.fn();
    const layer = createPoiLayer({
      pois: [poi, otherPoi],
      selectedPoiId: poi.id,
      onSelectPoi,
      onSelectCluster,
    });

    expect(layer.id).toBe("pois");
    expect(layer.props.selectedPoiId).toBe(poi.id);

    const handledPoi = layer.onClick(
      { object: markerItem } as PickingInfo,
      undefined,
    );
    expect(handledPoi).toBe(true);
    expect(onSelectPoi).toHaveBeenCalledExactlyOnceWith(poi);

    const handledCluster = layer.onClick(
      { object: clusterItem } as PickingInfo,
      undefined,
    );
    expect(handledCluster).toBe(true);
    expect(onSelectCluster).toHaveBeenCalledExactlyOnceWith(clusterItem);

    // Populate composite layer state to verify sublayer updateTriggers.
    layer.state = {
      zoom: 16,
      items: [markerItem, clusterItem],
      clusters: [clusterItem],
    };
    const [markersSubLayer] = layer.renderLayers();
    expect(markersSubLayer?.props.updateTriggers).toMatchObject({
      getRadius: poi.id,
      getLineColor: poi.id,
      getLineWidth: poi.id,
    });
  });
});
