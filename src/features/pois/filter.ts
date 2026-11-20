import {
  isShownByDefault,
  POI_CATEGORIES,
  type Poi,
  type PoiCategory,
} from "./poi";

export type PoiFilter = {
  categories: Record<PoiCategory, boolean>;
  showSpeculative: boolean;
};

export const DEFAULT_POI_FILTER: PoiFilter = {
  categories: {
    landmark: true,
    business: true,
    activity: true,
    transport: true,
    nature: true,
  },
  showSpeculative: false,
};

export function isDefaultPoiFilter(filter: PoiFilter): boolean {
  return (
    !filter.showSpeculative &&
    POI_CATEGORIES.every((category) => filter.categories[category])
  );
}

export function filterPois(pois: readonly Poi[], filter: PoiFilter): Poi[] {
  return pois.filter((poi) => {
    if (!filter.categories[poi.category]) return false;
    if (!filter.showSpeculative && !isShownByDefault(poi)) return false;
    return true;
  });
}

export function countActiveCategories(filter: PoiFilter): number {
  let active = 0;
  for (const category of POI_CATEGORIES) {
    if (filter.categories[category]) active += 1;
  }
  return active;
}

export function countPoisByCategory(
  pois: readonly Poi[],
  showSpeculative: boolean,
): Record<PoiCategory, number> {
  const counts: Record<PoiCategory, number> = {
    landmark: 0,
    business: 0,
    activity: 0,
    transport: 0,
    nature: 0,
  };
  for (const poi of pois) {
    if (!showSpeculative && !isShownByDefault(poi)) continue;
    counts[poi.category] += 1;
  }
  return counts;
}

export function setCategoryEnabled(
  filter: PoiFilter,
  category: PoiCategory,
  enabled: boolean,
): PoiFilter {
  return {
    ...filter,
    categories: {
      ...filter.categories,
      [category]: enabled,
    },
  };
}
