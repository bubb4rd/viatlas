/**
 * Pure client-side POI search index and matcher with zero runtime dependencies.
 * Indexes POI name, category, and optional aliases, and enforces visibility
 * filters so hidden categories or speculative markers are never leaked.
 */
import {
  type Confidence,
  isShownByDefault,
  type Poi,
  type PoiCategory,
} from "@/features/pois/poi";

export type PoiSearchField = "name" | "alias" | "category";

export type PoiSearchIndexOptions = {
  /** Optional alternate names keyed by `poi.id`. */
  aliasesById?: Readonly<Record<string, readonly string[]>>;
  /** Display label for a category, matched alongside the category id. */
  getCategoryLabel?: (category: PoiCategory) => string;
};

export type PoiSearchOptions = {
  /** Include `confidence: "speculative"` POIs (hidden by default). */
  showSpeculative?: boolean;
  /** Optional category visibility map; categories set to `false` are excluded. */
  categories?: Partial<Readonly<Record<PoiCategory, boolean>>>;
  /** Maximum results to return. Omit for all matches. */
  limit?: number;
};

export type PoiSearchResult = {
  poi: Poi;
  score: number;
  matchedField: PoiSearchField;
};

type IndexedPoi = {
  poi: Poi;
  nameNorm: string;
  nameWords: readonly string[];
  categoryNorms: readonly string[];
  categoryWords: readonly (readonly string[])[];
  aliasesNorm: readonly string[];
  aliasWords: readonly (readonly string[])[];
};

export type PoiSearchIndex = {
  readonly entries: readonly IndexedPoi[];
};

const CONFIDENCE_RANK: Record<Confidence, number> = {
  confirmed: 3,
  likely: 2,
  speculative: 1,
};

/**
 * Normalizes text for accent-, case-, and punctuation-insensitive matching.
 * Collapses non-alphanumeric separators into single spaces.
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function splitWords(normalized: string): string[] {
  return normalized === "" ? [] : normalized.split(" ");
}

/** Precomputes normalized search fields for a list of POIs. */
export function createPoiSearchIndex(
  pois: readonly Poi[],
  options?: PoiSearchIndexOptions,
): PoiSearchIndex {
  const aliasesById = options?.aliasesById;
  const entries: IndexedPoi[] = pois.map((poi) => {
    const nameNorm = normalizeSearchText(poi.name);
    const categoryLabel = options?.getCategoryLabel?.(poi.category) ?? "";
    const categoryNorms = [poi.category, categoryLabel]
      .map(normalizeSearchText)
      .filter((norm, i, all) => norm !== "" && all.indexOf(norm) === i);
    const rawAliases = aliasesById?.[poi.id] ?? [];
    const aliasesNorm: string[] = [];
    const aliasWords: string[][] = [];

    for (const raw of rawAliases) {
      const normalized = normalizeSearchText(raw);
      if (!normalized) continue;
      aliasesNorm.push(normalized);
      aliasWords.push(splitWords(normalized));
    }

    return {
      poi,
      nameNorm,
      nameWords: splitWords(nameNorm),
      categoryNorms,
      categoryWords: categoryNorms.map(splitWords),
      aliasesNorm,
      aliasWords,
    };
  });

  return { entries };
}

type MatchScore = {
  score: number;
  field: PoiSearchField;
};

function scoreStringMatch(
  text: string,
  words: readonly string[],
  term: string,
  weights: {
    exact: number;
    prefix: number;
    wordPrefix: number;
    substring: number;
  },
): number {
  if (text === term) return weights.exact;
  if (text.startsWith(term)) return weights.prefix;
  if (words.some((word) => word.startsWith(term))) return weights.wordPrefix;
  if (text.includes(term)) return weights.substring;
  return 0;
}

const NAME_WEIGHTS = {
  exact: 1000,
  prefix: 800,
  wordPrefix: 650,
  substring: 350,
} as const;

const ALIAS_WEIGHTS = {
  exact: 600,
  prefix: 500,
  wordPrefix: 420,
  substring: 250,
} as const;

const CATEGORY_WEIGHTS = {
  exact: 220,
  prefix: 180,
  wordPrefix: 180,
  substring: 120,
} as const;

function scoreTerm(entry: IndexedPoi, term: string): MatchScore | null {
  let best: MatchScore | null = null;

  const nameScore = scoreStringMatch(
    entry.nameNorm,
    entry.nameWords,
    term,
    NAME_WEIGHTS,
  );
  if (nameScore > 0) {
    best = { score: nameScore, field: "name" };
  }

  for (let i = 0; i < entry.aliasesNorm.length; i += 1) {
    const alias = entry.aliasesNorm[i];
    const words = entry.aliasWords[i];
    if (!alias || !words) continue;
    const aliasScore = scoreStringMatch(alias, words, term, ALIAS_WEIGHTS);
    if (aliasScore > 0 && (!best || aliasScore > best.score)) {
      best = { score: aliasScore, field: "alias" };
    }
  }

  for (let i = 0; i < entry.categoryNorms.length; i += 1) {
    const category = entry.categoryNorms[i];
    const words = entry.categoryWords[i];
    if (!category || !words) continue;
    const categoryScore = scoreStringMatch(
      category,
      words,
      term,
      CATEGORY_WEIGHTS,
    );
    if (categoryScore > 0 && (!best || categoryScore > best.score)) {
      best = { score: categoryScore, field: "category" };
    }
  }

  return best;
}

function isEntryVisible(
  entry: IndexedPoi,
  options?: PoiSearchOptions,
): boolean {
  const { poi } = entry;
  if (!options?.showSpeculative && !isShownByDefault(poi)) return false;
  if (options?.categories && options.categories[poi.category] === false) {
    return false;
  }
  return true;
}

function compareResults(a: PoiSearchResult, b: PoiSearchResult): number {
  if (b.score !== a.score) return b.score - a.score;
  const confidenceDelta =
    CONFIDENCE_RANK[b.poi.confidence] - CONFIDENCE_RANK[a.poi.confidence];
  if (confidenceDelta !== 0) return confidenceDelta;
  const lengthDelta = a.poi.name.length - b.poi.name.length;
  if (lengthDelta !== 0) return lengthDelta;
  const nameDelta = a.poi.name.localeCompare(b.poi.name, "en", {
    sensitivity: "base",
  });
  if (nameDelta !== 0) return nameDelta;
  return a.poi.id.localeCompare(b.poi.id, "en");
}

/**
 * Searches `index` for `query`, returning deterministically ranked matches.
 * Every token in a multi-word query must match at least one indexed field.
 */
export function searchPois(
  index: PoiSearchIndex,
  query: string,
  options?: PoiSearchOptions,
): PoiSearchResult[] {
  const limit = options?.limit;
  if (limit !== undefined && limit <= 0) return [];

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const tokens = splitWords(normalizedQuery);
  const results: PoiSearchResult[] = [];

  for (const entry of index.entries) {
    if (!isEntryVisible(entry, options)) continue;

    let tokenScoreSum = 0;
    let bestField: PoiSearchField = "category";
    let bestTokenScore = 0;
    let allTokensMatched = true;

    for (const token of tokens) {
      const match = scoreTerm(entry, token);
      if (!match) {
        allTokensMatched = false;
        break;
      }
      tokenScoreSum += match.score;
      if (match.score > bestTokenScore) {
        bestTokenScore = match.score;
        bestField = match.field;
      }
    }

    if (!allTokensMatched) continue;

    // Reward full-phrase matches on top of per-token coverage.
    const phraseMatch =
      tokens.length > 1 ? scoreTerm(entry, normalizedQuery) : null;
    const totalScore =
      Math.round(tokenScoreSum / tokens.length) +
      (phraseMatch ? Math.round(phraseMatch.score * 0.5) : 0);
    const matchedField =
      phraseMatch && phraseMatch.score >= bestTokenScore
        ? phraseMatch.field
        : bestField;

    results.push({
      poi: entry.poi,
      score: totalScore,
      matchedField,
    });
  }

  results.sort(compareResults);
  return limit !== undefined ? results.slice(0, limit) : results;
}
