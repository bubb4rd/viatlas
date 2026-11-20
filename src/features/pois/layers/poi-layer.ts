import {
  CompositeLayer,
  type PickingInfo,
  type UpdateParameters,
} from "@deck.gl/core";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { worldToLngLat } from "@/features/map/world";
import {
  clusterPois,
  DEFAULT_CLUSTER_RADIUS_PX,
  type PoiCluster,
  type PoiItem,
} from "../cluster";
import { DEFAULT_VISIBLE_POIS } from "../data";
import type { Poi, PoiCategory } from "../poi";

type Rgba = [number, number, number, number];

const CATEGORY_COLOR: Record<PoiCategory, Rgba> = {
  landmark: [255, 95, 143, 255],
  business: [255, 184, 77, 255],
  activity: [167, 139, 250, 255],
  transport: [96, 165, 250, 255],
  nature: [74, 222, 128, 255],
};
const CLUSTER_COLOR: Rgba = [58, 214, 197, 230];
const OUTLINE_COLOR: Rgba = [7, 9, 12, 255];
const SELECTED_OUTLINE_COLOR: Rgba = [231, 238, 243, 255];

const MARKER_RADIUS_PX = 6;
const SELECTED_MARKER_RADIUS_PX = 9;
const MARKER_LINE_WIDTH_PX = 2;
const SELECTED_MARKER_LINE_WIDTH_PX = 3;

/** POIs closer than this on screen merge into a cluster. */
export const CLUSTER_RADIUS_PX = DEFAULT_CLUSTER_RADIUS_PX;

export type PoiSelectionCallbacks = {
  onSelectPoi?: (poi: Poi) => void;
  onSelectCluster?: (cluster: PoiCluster) => void;
};

export type PoiLayerOptions = PoiSelectionCallbacks & {
  pois?: readonly Poi[];
  selectedPoiId?: string | null;
};

type PoiLayerProps = PoiSelectionCallbacks & {
  pois: readonly Poi[];
  selectedPoiId: string | null;
};

export function isSelectedPoiItem(
  item: PoiItem,
  selectedPoiId: string | null | undefined,
): boolean {
  return (
    selectedPoiId != null &&
    item.kind === "poi" &&
    item.poi.id === selectedPoiId
  );
}

export function getPoiMarkerRadius(
  item: PoiItem,
  selectedPoiId: string | null | undefined,
): number {
  if (item.kind === "cluster") return 11 + 3 * Math.log2(item.count);
  return isSelectedPoiItem(item, selectedPoiId)
    ? SELECTED_MARKER_RADIUS_PX
    : MARKER_RADIUS_PX;
}

export function getPoiMarkerLineColor(
  item: PoiItem,
  selectedPoiId: string | null | undefined,
): Rgba {
  return isSelectedPoiItem(item, selectedPoiId)
    ? SELECTED_OUTLINE_COLOR
    : OUTLINE_COLOR;
}

export function getPoiMarkerLineWidth(
  item: PoiItem,
  selectedPoiId: string | null | undefined,
): number {
  return isSelectedPoiItem(item, selectedPoiId)
    ? SELECTED_MARKER_LINE_WIDTH_PX
    : MARKER_LINE_WIDTH_PX;
}

/**
 * Dispatches a picked POI marker or cluster to the matching selection callback.
 * Returns true when a callback handled the click so deck.gl stops bubbling.
 */
export function handlePoiPick(
  item: PoiItem | undefined,
  callbacks: PoiSelectionCallbacks,
): boolean {
  if (!item) return false;
  if (item.kind === "poi") {
    if (!callbacks.onSelectPoi) return false;
    callbacks.onSelectPoi(item.poi);
    return true;
  }
  if (!callbacks.onSelectCluster) return false;
  callbacks.onSelectCluster(item);
  return true;
}

/**
 * POIs as category-colored markers, clustered per integer zoom level.
 * Clustering runs inside deck.gl's layer lifecycle, so zooming never touches
 * React state, and only crossing an integer zoom recomputes it.
 */
class PoiLayer extends CompositeLayer<PoiLayerProps> {
  static override layerName = "PoiLayer";

  static override defaultProps = {
    selectedPoiId: null,
    onSelectPoi: { type: "function" as const, value: null, optional: true },
    onSelectCluster: { type: "function" as const, value: null, optional: true },
  };

  declare state: { zoom: number; items: PoiItem[]; clusters: PoiCluster[] };

  override shouldUpdateState({
    changeFlags,
    context,
  }: UpdateParameters<this>): boolean {
    return (
      changeFlags.propsOrDataChanged ||
      (changeFlags.viewportChanged &&
        Math.floor(context.viewport.zoom) !== this.state.zoom)
    );
  }

  override updateState({ props, oldProps }: UpdateParameters<this>): void {
    const zoom = Math.floor(this.context.viewport.zoom);
    if (props.pois !== oldProps.pois || zoom !== this.state.zoom) {
      const items = clusterPois(props.pois, zoom, CLUSTER_RADIUS_PX);
      const clusters = items.filter(
        (item): item is PoiCluster => item.kind === "cluster",
      );
      this.setState({ zoom, items, clusters });
    }
  }

  override onClick(info: PickingInfo, pickingEvent: unknown): boolean {
    if (handlePoiPick(info.object as PoiItem | undefined, this.props)) {
      return true;
    }
    return super.onClick(info, pickingEvent);
  }

  renderLayers() {
    const { items, clusters } = this.state;
    const { selectedPoiId } = this.props;
    return [
      new ScatterplotLayer<PoiItem>(
        this.getSubLayerProps({
          id: "markers",
          data: items,
          getPosition: (d: PoiItem) => worldToLngLat(d.position),
          getRadius: (d: PoiItem) => getPoiMarkerRadius(d, selectedPoiId),
          getFillColor: (d: PoiItem) =>
            d.kind === "poi" ? CATEGORY_COLOR[d.poi.category] : CLUSTER_COLOR,
          getLineColor: (d: PoiItem) => getPoiMarkerLineColor(d, selectedPoiId),
          getLineWidth: (d: PoiItem) => getPoiMarkerLineWidth(d, selectedPoiId),
          radiusUnits: "pixels",
          lineWidthUnits: "pixels",
          stroked: true,
          billboard: true,
          pickable: true,
          updateTriggers: {
            getRadius: selectedPoiId,
            getLineColor: selectedPoiId,
            getLineWidth: selectedPoiId,
          },
        }),
      ),
      new TextLayer<PoiCluster>(
        this.getSubLayerProps({
          id: "cluster-counts",
          data: clusters,
          getPosition: (d: PoiCluster) => worldToLngLat(d.position),
          getText: (d: PoiCluster) => `${d.count}`,
          getSize: 12,
          getColor: OUTLINE_COLOR,
          fontFamily: "ui-monospace, monospace",
          fontWeight: 700,
          characterSet: "0123456789",
          pickable: false,
        }),
      ),
    ];
  }
}

export function createPoiLayer({
  pois = DEFAULT_VISIBLE_POIS,
  selectedPoiId = null,
  onSelectPoi,
  onSelectCluster,
}: PoiLayerOptions = {}) {
  return new PoiLayer({
    id: "pois",
    pois,
    selectedPoiId,
    onSelectPoi,
    onSelectCluster,
  });
}

/** Hover text for `DeckGL.getTooltip`; null for anything that isn't a POI item. */
export function poiTooltipText(object: PoiItem | undefined): string | null {
  if (!object) return null;
  if (object.kind === "cluster") return `${object.count} places`;
  const { name, category, confidence } = object.poi;
  return confidence === "confirmed"
    ? `${name}\n${category}`
    : `${name}\n${category} · ${confidence}`;
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface-strong)",
  border: "1px solid var(--line)",
  color: "var(--text)",
  fontFamily: "var(--font-mono), ui-monospace, monospace",
  fontSize: "12px",
  padding: "6px 8px",
  whiteSpace: "pre",
};

export function getPoiTooltip({ layer, object }: PickingInfo) {
  if (!layer?.id.startsWith("pois")) return null;
  const text = poiTooltipText(object as PoiItem | undefined);
  return text ? { text, style: TOOLTIP_STYLE } : null;
}
