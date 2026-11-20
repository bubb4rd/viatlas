import {
  CompositeLayer,
  type PickingInfo,
  type UpdateParameters,
} from "@deck.gl/core";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { worldToLngLat } from "@/features/map/world";
import { clusterPois, type PoiItem } from "../cluster";
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

/** POIs closer than this on screen merge into a cluster. */
const CLUSTER_RADIUS_PX = 48;

type PoiLayerProps = { pois: readonly Poi[] };

/**
 * POIs as category-colored markers, clustered per integer zoom level.
 * Clustering runs inside deck.gl's layer lifecycle, so zooming never touches
 * React state, and only crossing an integer zoom recomputes it.
 */
class PoiLayer extends CompositeLayer<PoiLayerProps> {
  static override layerName = "PoiLayer";

  declare state: { zoom: number; items: PoiItem[] };

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
      this.setState({
        zoom,
        items: clusterPois(props.pois, zoom, CLUSTER_RADIUS_PX),
      });
    }
  }

  renderLayers() {
    const { items } = this.state;
    return [
      new ScatterplotLayer<PoiItem>(
        this.getSubLayerProps({
          id: "markers",
          data: items,
          getPosition: (d: PoiItem) => worldToLngLat(d.position),
          getRadius: (d: PoiItem) =>
            d.kind === "poi" ? 6 : 11 + 3 * Math.log2(d.count),
          getFillColor: (d: PoiItem) =>
            d.kind === "poi" ? CATEGORY_COLOR[d.poi.category] : CLUSTER_COLOR,
          getLineColor: OUTLINE_COLOR,
          radiusUnits: "pixels",
          lineWidthUnits: "pixels",
          getLineWidth: 2,
          stroked: true,
          billboard: true,
          pickable: true,
        }),
      ),
      new TextLayer<PoiItem>(
        this.getSubLayerProps({
          id: "cluster-counts",
          data: items.filter((d) => d.kind === "cluster"),
          getPosition: (d: PoiItem) => worldToLngLat(d.position),
          getText: (d: PoiItem) => (d.kind === "cluster" ? `${d.count}` : ""),
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

export function createPoiLayer() {
  return new PoiLayer({ id: "pois", pois: DEFAULT_VISIBLE_POIS });
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
