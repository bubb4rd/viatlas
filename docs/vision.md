# Vision

## What we're building

The best way to explore Leonida in a browser. It should be a fast, game-grade map that feels like
it belongs in the game's pause menu, not like a GIS tool.

## Experience pillars

### 1. Diegetic, not dashboard

The map should feel like a piece of in-world technology. The references:

- **The Division / The Division 2.** The holographic tactical map: layered glass panels, monospace
  intel labels, a single hot accent color, scan and reveal animations, and information that
  resolves as you focus on it.
- **Modern Warfare / Warzone / DMZ.** A clean top-down tactical map with a readable grid reference
  system, pings and markers, a strong zoom hierarchy, and nothing on screen that doesn't earn its
  place.

Take their _principles_, not their art: our own palette, iconography, and type (tokens live in
`src/app/globals.css`).

### 2. Earned reveal

Those games never handed you the whole map at once. You uncovered it. We do the same:

- **Progressive disclosure by zoom:** regions, then districts, then streets, then points of
  interest. Never dump every marker on screen at once.
- **Explore mode (opt-in fog of war):** areas reveal as you mark them visited. Progress is stored
  locally.
- **Spoiler controls:** story and mission locations are hidden by default, with an opt-in per
  category.

### 3. Top-down first, 3D when it adds something

2D is the default: north-up, fast, and readable. 3D (pitched camera, terrain, extruded landmarks,
time-of-day lighting) is a mode for orientation and spectacle, not for reading labels.

### 4. 60 fps or it didn't ship

Panning, zooming, and layer toggles feel instant on a mid-range laptop and phone. The budgets are
in [standards.md](standards.md#performance-budgets).

### 5. Every view is a link

The URL captures camera, layers, and selection, so any point of interest can be deep-linked.

## deck.gl references

- **[TripsLayer](https://deck.gl/examples/trips-layer):** animated paths with fading trails. Use it
  for traffic flow, flights, boat routes, mission route playback, and time-of-day activity.
- **[ArcGIS integration](https://deck.gl/examples/arcgis):** the 3D scene look (extruded buildings,
  lighting, tilted camera). We borrow the look, not the dependency: Leonida isn't on Earth, so
  there's no ArcGIS or Mapbox basemap ([ADR-0001](adr/0001-deckgl-without-basemap.md)).
- **Also on the list:** `TileLayer` + `BitmapLayer` for base tiles, `TerrainLayer` for the 3D
  heightmap, `IconLayer`/`TextLayer` with collision filtering for POIs, `HexagonLayer` for density,
  and `LightingEffect` + `SunLight` for time of day.

## Roadmap

| Phase            | Scope                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| 0. Foundation ✅ | Repo, standards, CI, map shell, 2D/3D camera                                                    |
| 1. Usable map    | Base tiles, POI layer with categories and clustering, search, URL-synced camera, touch controls |
| 2. 3D            | Terrain heightmap, extruded landmarks, time-of-day lighting                                     |
| 3. Living world  | TripsLayer traffic and routes, explore mode, waypoints and route planning, local collections    |

## Non-goals for now

Accounts and social features, real-time multiplayer, hosting game files, and native apps.
