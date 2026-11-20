import { describe, expect, it } from "vitest";
import { INITIAL_VIEW_STATE } from "./camera";
import {
  formatMapHash,
  formatPoiFilterHash,
  formatSelectedPoiHash,
  getHashParam,
  parseCameraHash,
  parseMapHash,
  parsePoiFilterHash,
  parseSelectedPoiHash,
  setHashParam,
  type UrlPoiFilter,
  updateHashParams,
} from "./url-state";

const ALL_ENABLED: UrlPoiFilter = {
  categories: {
    landmark: true,
    business: true,
    activity: true,
    transport: true,
    nature: true,
  },
  showSpeculative: false,
};

describe("generic hash param helpers", () => {
  it("reads, sets, and deletes params while preserving unknown keys", () => {
    const start = "#utm=abc&foo=bar";
    expect(getHashParam(start, "utm")).toBe("abc");
    expect(getHashParam(start, "missing")).toBeNull();

    const withPoi = setHashParam(start, "poi", "poi-vice-pier");
    expect(withPoi).toBe("#utm=abc&foo=bar&poi=poi-vice-pier");

    const cleared = setHashParam(withPoi, "poi", null);
    expect(cleared).toBe("#utm=abc&foo=bar");
  });

  it("returns an empty string when the last param is removed", () => {
    expect(setHashParam("#poi=poi-vice-pier", "poi", null)).toBe("");
    expect(updateHashParams("#", { poi: null })).toBe("");
  });

  it("updates multiple keys atomically and ignores undefined fields", () => {
    const next = updateHashParams("#keep=yes&old=1", {
      old: null,
      added: "a,b/c",
      untouched: undefined,
    });
    expect(next).toBe("#keep=yes&added=a,b/c");
  });
});

describe("selected POI hash state", () => {
  it("round-trips a valid POI id and preserves other params", () => {
    const hash = formatSelectedPoiHash(
      "#map=12.00/0/0&ref=share",
      "poi-vice-pier",
    );
    expect(hash).toBe("#map=12.00/0/0&ref=share&poi=poi-vice-pier");
    expect(parseSelectedPoiHash(hash)).toBe("poi-vice-pier");
  });

  it("removes poi param when cleared or given an invalid id", () => {
    expect(formatSelectedPoiHash("#poi=poi-vice-pier&utm=1", null)).toBe(
      "#utm=1",
    );
    expect(formatSelectedPoiHash("#poi=poi-vice-pier", "not-a-poi")).toBe("");
  });

  it.each([
    ["empty hash", ""],
    ["bare hash", "#"],
    ["missing poi", "#map=12/0/0"],
    ["missing poi- prefix", "#poi=vice-pier"],
    ["uppercase letters", "#poi=poi-Vice-Pier"],
    ["illegal characters", "#poi=poi-vice_pier!"],
    ["empty value", "#poi="],
  ])("ignores malformed selection (%s)", (_, hash) => {
    expect(parseSelectedPoiHash(hash)).toBeNull();
  });
});

describe("POI filter hash state", () => {
  it("defaults to all categories enabled and speculative hidden", () => {
    expect(parsePoiFilterHash("")).toEqual(ALL_ENABLED);
    expect(parsePoiFilterHash("#map=12/0/0")).toEqual(ALL_ENABLED);
  });

  it("round-trips hidden categories and speculative flag without clobbering other keys", () => {
    const filter: UrlPoiFilter = {
      categories: {
        ...ALL_ENABLED.categories,
        business: false,
        nature: false,
      },
      showSpeculative: true,
    };

    const hash = formatPoiFilterHash("#map=12.00/0/0&custom=1", filter);
    expect(hash).toBe(
      "#map=12.00/0/0&custom=1&hide=business,nature&speculative=1",
    );
    expect(parsePoiFilterHash(hash)).toEqual(filter);
  });

  it("omits filter keys when back to defaults", () => {
    const hash = formatPoiFilterHash(
      "#map=12.00/0/0&hide=business&speculative=1&custom=1",
      ALL_ENABLED,
    );
    expect(hash).toBe("#map=12.00/0/0&custom=1");
  });

  it("ignores unknown categories, empty tokens, and invalid speculative flags", () => {
    expect(
      parsePoiFilterHash(
        "#hide=unknown,,NATURE,landmark,bogus&speculative=maybe",
      ),
    ).toEqual({
      categories: {
        landmark: false,
        business: true,
        activity: true,
        transport: true,
        nature: false,
      },
      showSpeculative: false,
    });
    expect(parsePoiFilterHash("#speculative=true").showSpeculative).toBe(true);
    expect(parsePoiFilterHash("#speculative=0").showSpeculative).toBe(false);
  });
});

describe("multi-param map hash round-tripping", () => {
  it("reads and writes camera, selected POI, filters, and unknown keys together", () => {
    const camera = parseCameraHash("#map=14.50/1200/-3400/45/-20");
    if (!camera) throw new Error("expected camera");
    const poiFilter: UrlPoiFilter = {
      categories: {
        ...ALL_ENABLED.categories,
        activity: false,
      },
      showSpeculative: true,
    };

    const combined = formatMapHash("#utm=launch", {
      camera,
      selectedPoiId: "poi-ocean-beach",
      poiFilter,
    });
    expect(combined).toBe(
      "#utm=launch&map=14.50/1200/-3400/45/-20&poi=poi-ocean-beach&hide=activity&speculative=1",
    );

    const parsed = parseMapHash(combined);
    expect(parsed.camera).toEqual(camera);
    expect(parsed.selectedPoiId).toBe("poi-ocean-beach");
    expect(parsed.poiFilter).toEqual(poiFilter);

    // Updating one concern leaves all other concerns and unknown keys intact.
    const deselected = formatMapHash(combined, { selectedPoiId: null });
    expect(deselected).toBe(
      "#utm=launch&map=14.50/1200/-3400/45/-20&hide=activity&speculative=1",
    );
  });

  it("clears camera when patched with null while preserving other params", () => {
    const start = formatMapHash("", {
      camera: { viewState: INITIAL_VIEW_STATE, mode: "2d" },
      selectedPoiId: "poi-vice-pier",
    });
    expect(formatMapHash(start, { camera: null })).toBe("#poi=poi-vice-pier");
  });

  it("handles malformed multi-param hashes safely without throwing", () => {
    const parsed = parseMapHash(
      "#map=bad/value&poi=INVALID&hide=nope&speculative=wat",
    );
    expect(parsed).toEqual({
      camera: null,
      selectedPoiId: null,
      poiFilter: ALL_ENABLED,
    });
  });
});
