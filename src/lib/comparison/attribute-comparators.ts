import type { BacklogItemType } from "@/types/match";

/**
 * Attribute definition for comparison
 */
export interface AttributeDefinition {
  key: string;
  label: string;
  type: "numeric" | "text" | "date" | "list" | "rating";
  isHigherBetter: boolean;
  format?: (value: unknown) => string;
  getValue: (item: BacklogItemType) => unknown;
}

/**
 * Result of comparing a single attribute across items
 */
export interface AttributeComparisonResult {
  attribute: string;
  label: string;
  values: (string | number | null)[];
  formattedValues: string[];
  winnerId: string | null;
  winnerIndex: number | null;
  isHigherBetter: boolean;
  type: AttributeDefinition["type"];
}

/**
 * Full comparison result for all items
 */
export interface FullComparisonResult {
  items: BacklogItemType[];
  attributes: AttributeComparisonResult[];
  overallWinnerId: string | null;
  totalWins: Record<string, number>;
  winPercentages: Record<string, number>;
}

/**
 * Standard attribute definitions for common item properties
 */
export const STANDARD_ATTRIBUTES: AttributeDefinition[] = [
  {
    key: "item_year",
    label: "Year",
    type: "date",
    isHigherBetter: true, // Newer is often preferred
    getValue: (item) => item.item_year ?? null,
    format: (v) => (v ? String(v) : "N/A"),
  },
  {
    key: "category",
    label: "Category",
    type: "text",
    isHigherBetter: false,
    getValue: (item) => item.category ?? null,
    format: (v) => (v ? String(v) : "N/A"),
  },
  {
    key: "subcategory",
    label: "Subcategory",
    type: "text",
    isHigherBetter: false,
    getValue: (item) => item.subcategory ?? null,
    format: (v) => (v ? String(v) : "N/A"),
  },
  {
    key: "tags",
    label: "Tags",
    type: "list",
    isHigherBetter: true, // More tags = more detail
    getValue: (item) => item.tags ?? [],
    format: (v) => {
      const arr = v as string[] | undefined;
      return arr && arr.length > 0 ? arr.join(", ") : "None";
    },
  },
];

/**
 * Category-specific attribute definitions
 */
export const CATEGORY_ATTRIBUTES: Record<string, AttributeDefinition[]> = {
  movies: [
    {
      key: "rating",
      label: "Rating",
      type: "rating",
      isHigherBetter: true,
      getValue: (item) => (item as any).rating ?? null,
      format: (v) => (v ? `${v}/10` : "N/A"),
    },
    {
      key: "awards",
      label: "Awards",
      type: "numeric",
      isHigherBetter: true,
      getValue: (item) => (item as any).awards ?? null,
      format: (v) => (v ? String(v) : "N/A"),
    },
    {
      key: "runtime",
      label: "Runtime",
      type: "numeric",
      isHigherBetter: false, // Subjective
      getValue: (item) => (item as any).runtime ?? null,
      format: (v) => (v ? `${v} min` : "N/A"),
    },
  ],
  games: [
    {
      key: "rating",
      label: "Metacritic",
      type: "rating",
      isHigherBetter: true,
      getValue: (item) => (item as any).rating ?? null,
      format: (v) => (v ? `${v}/100` : "N/A"),
    },
    {
      key: "platforms",
      label: "Platforms",
      type: "list",
      isHigherBetter: true,
      getValue: (item) => (item as any).platforms ?? [],
      format: (v) => {
        const arr = v as string[] | undefined;
        return arr && arr.length > 0 ? arr.join(", ") : "N/A";
      },
    },
  ],
  music: [
    {
      key: "popularity",
      label: "Popularity",
      type: "numeric",
      isHigherBetter: true,
      getValue: (item) => (item as any).popularity ?? null,
      format: (v) => (v ? `${v}%` : "N/A"),
    },
    {
      key: "duration",
      label: "Duration",
      type: "numeric",
      isHigherBetter: false,
      getValue: (item) => (item as any).duration ?? null,
      format: (v) => {
        if (!v) return "N/A";
        const mins = Math.floor((v as number) / 60000);
        const secs = Math.floor(((v as number) % 60000) / 1000);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      },
    },
  ],
};

/**
 * Get relevant attributes for an item category
 */
export function getAttributesForCategory(category: string): AttributeDefinition[] {
  const categoryAttrs = CATEGORY_ATTRIBUTES[category.toLowerCase()] ?? [];
  return [...STANDARD_ATTRIBUTES, ...categoryAttrs];
}

/**
 * Compare a single numeric attribute across items
 */
function compareNumeric(
  values: (number | null)[],
  isHigherBetter: boolean
): { winnerId: string | null; winnerIndex: number | null } {
  const validValues = values.map((v, i) => ({ value: v, index: i })).filter((v) => v.value !== null);

  if (validValues.length === 0) {
    return { winnerId: null, winnerIndex: null };
  }

  // Find the winner
  const winner = validValues.reduce((best, current) => {
    if (best.value === null) return current;
    if (current.value === null) return best;
    if (isHigherBetter) {
      return current.value > best.value ? current : best;
    } else {
      return current.value < best.value ? current : best;
    }
  });

  // Check for ties
  const winnerValue = winner.value;
  const tieCount = validValues.filter((v) => v.value === winnerValue).length;

  if (tieCount > 1) {
    return { winnerId: null, winnerIndex: null }; // Tie
  }

  return { winnerId: null, winnerIndex: winner.index };
}

/**
 * Compare a single list attribute across items (by count)
 */
function compareList(
  values: (string[] | null)[],
  isHigherBetter: boolean
): { winnerId: string | null; winnerIndex: number | null } {
  const counts = values.map((v) => (v ? v.length : 0));
  return compareNumeric(counts, isHigherBetter);
}

/**
 * Compare a single attribute across all items
 */
export function compareAttribute(
  items: BacklogItemType[],
  attribute: AttributeDefinition
): AttributeComparisonResult {
  const values = items.map((item) => attribute.getValue(item));
  const formattedValues = values.map((v) => (attribute.format ? attribute.format(v) : String(v ?? "N/A")));

  let result: { winnerId: string | null; winnerIndex: number | null };

  switch (attribute.type) {
    case "numeric":
    case "rating":
    case "date":
      result = compareNumeric(values as (number | null)[], attribute.isHigherBetter);
      break;
    case "list":
      result = compareList(values as (string[] | null)[], attribute.isHigherBetter);
      break;
    case "text":
    default:
      // Text attributes don't have winners
      result = { winnerId: null, winnerIndex: null };
  }

  return {
    attribute: attribute.key,
    label: attribute.label,
    values: values.map((v) => {
      if (v === null || v === undefined) return null;
      if (Array.isArray(v)) return v.length;
      if (typeof v === "number") return v;
      return String(v);
    }),
    formattedValues,
    winnerId: result.winnerIndex !== null ? items[result.winnerIndex].id : null,
    winnerIndex: result.winnerIndex,
    isHigherBetter: attribute.isHigherBetter,
    type: attribute.type,
  };
}

/**
 * Compare all relevant attributes across items
 */
export function compareItems(items: BacklogItemType[]): FullComparisonResult {
  if (items.length < 2) {
    return {
      items,
      attributes: [],
      overallWinnerId: null,
      totalWins: {},
      winPercentages: {},
    };
  }

  // Get category from first item (assume all same category)
  const category = items[0].category ?? "general";
  const attributes = getAttributesForCategory(category);

  // Compare each attribute
  const attributeResults = attributes.map((attr) => compareAttribute(items, attr));

  // Calculate total wins per item
  const totalWins: Record<string, number> = {};
  items.forEach((item) => {
    totalWins[item.id] = 0;
  });

  attributeResults.forEach((result) => {
    if (result.winnerId) {
      totalWins[result.winnerId] = (totalWins[result.winnerId] || 0) + 1;
    }
  });

  // Find overall winner
  let overallWinnerId: string | null = null;
  let maxWins = 0;
  let winnerCount = 0;

  Object.entries(totalWins).forEach(([id, wins]) => {
    if (wins > maxWins) {
      maxWins = wins;
      overallWinnerId = id;
      winnerCount = 1;
    } else if (wins === maxWins && wins > 0) {
      winnerCount++;
    }
  });

  // If tie, no overall winner
  if (winnerCount > 1) {
    overallWinnerId = null;
  }

  // Calculate win percentages
  const comparableAttributes = attributeResults.filter(
    (r) => r.type !== "text" && r.winnerId !== null
  ).length;
  const winPercentages: Record<string, number> = {};

  items.forEach((item) => {
    winPercentages[item.id] = comparableAttributes > 0
      ? Math.round((totalWins[item.id] / comparableAttributes) * 100)
      : 0;
  });

  return {
    items,
    attributes: attributeResults,
    overallWinnerId,
    totalWins,
    winPercentages,
  };
}

/**
 * Get a quick comparison summary
 */
export function getComparisonSummary(result: FullComparisonResult): string {
  if (!result.overallWinnerId) {
    return "No clear winner - items are closely matched";
  }

  const winner = result.items.find((i) => i.id === result.overallWinnerId);
  if (!winner) return "Unable to determine winner";

  const winCount = result.totalWins[result.overallWinnerId];
  const totalComparable = result.attributes.filter((a) => a.type !== "text").length;

  return `${winner.title} leads with ${winCount}/${totalComparable} attribute wins`;
}
