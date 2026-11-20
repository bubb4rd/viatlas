// Reviewed source data, one file per category (data/README.md). Validated at
// module load and in `pnpm check`, so a bad entry fails the build, not the user.
import activity from "../../../data/pois/activity.json";
import business from "../../../data/pois/business.json";
import landmark from "../../../data/pois/landmark.json";
import nature from "../../../data/pois/nature.json";
import transport from "../../../data/pois/transport.json";
import { isShownByDefault, parsePois } from "./poi";

export const POIS = parsePois({
  landmark,
  business,
  activity,
  transport,
  nature,
});

export const DEFAULT_VISIBLE_POIS = POIS.filter(isShownByDefault);
