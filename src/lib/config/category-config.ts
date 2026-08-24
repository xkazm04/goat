/**
 * Category Configuration
 *
 * This file defines the explicit category-subcategory relationships for the G.O.A.T. application.
 * It serves as the single source of truth for:
 * - Which categories are available
 * - Which categories support subcategories
 * - What subcategories are valid for each category
 * - Default subcategory values
 *
 * When adding new categories or subcategories, update this configuration file.
 */

import { Volleyball, Trophy, Users, LucideIcon } from "lucide-react";

/**
 * Subcategory definition with display information
 */
export interface SubcategoryDefinition {
  /** The value used in forms and API calls */
  value: string;
  /** Human-readable label for display */
  label: string;
  /** Optional icon component for UI */
  icon?: LucideIcon;
  /** Optional description for extended UI */
  description?: string;
}

/**
 * Category configuration with optional subcategories
 */
export interface CategoryDefinition {
  /** The category name (also used as key) */
  name: string;
  /** Whether this category has subcategories */
  hasSubcategories: boolean;
  /** Available subcategories (empty array if hasSubcategories is false) */
  subcategories: SubcategoryDefinition[];
  /** Default subcategory value (undefined if no subcategories) */
  defaultSubcategory: string | undefined;
  /** Lowercase DB category strings that should resolve to this category */
  dbAliases: string[];
}

/**
 * Complete category configuration mapping
 */
export type CategoryConfigMap = Record<string, CategoryDefinition>;

/**
 * Sports subcategories with icons
 */
export const SPORTS_SUBCATEGORIES: SubcategoryDefinition[] = [
  { value: "Basketball", label: "Basketball", icon: Volleyball, description: "Professional & amateur leagues" },
  { value: "Ice-Hockey", label: "Ice Hockey", icon: Trophy, description: "Professional & amateur leagues" },
  { value: "Soccer", label: "Soccer", icon: Users, description: "Professional & amateur leagues" },
];

/**
 * Main category configuration object
 *
 * This is the single source of truth for all category-subcategory relationships.
 *
 * To add a new category:
 * 1. Add a new key matching the category name
 * 2. Set hasSubcategories to true/false
 * 3. If hasSubcategories is true, define subcategories array and defaultSubcategory
 * 4. If hasSubcategories is false, use empty array and undefined
 */
export const CATEGORY_CONFIG: CategoryConfigMap = {
  Sports: {
    name: "Sports",
    hasSubcategories: true,
    subcategories: SPORTS_SUBCATEGORIES,
    defaultSubcategory: "Basketball",
    dbAliases: ["sports", "sport", "esports", "athletics"],
  },
  Music: {
    name: "Music",
    hasSubcategories: false,
    subcategories: [],
    defaultSubcategory: undefined,
    dbAliases: ["music", "musical"],
  },
  Games: {
    name: "Games",
    hasSubcategories: false,
    subcategories: [],
    defaultSubcategory: undefined,
    dbAliases: ["games", "game", "gaming", "video games"],
  },
  Stories: {
    name: "Stories",
    hasSubcategories: false,
    subcategories: [],
    defaultSubcategory: undefined,
    dbAliases: ["stories", "story", "movies", "movie", "film", "films", "books", "book", "tv", "anime"],
  },
} as const;

/**
 * Array of all available category names
 */
export const CATEGORIES = Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>;

/**
 * Type for valid category names
 */
export type CategoryName = keyof typeof CATEGORY_CONFIG;

/**
 * Get the configuration for a specific category
 * @param category - The category name (case-insensitive)
 * @returns The category configuration or undefined if not found
 */
export function getCategoryConfig(category: string): CategoryDefinition | undefined {
  // Normalize to title case for lookup
  const normalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  return CATEGORY_CONFIG[normalizedCategory];
}

/**
 * Check if a category has subcategories
 * @param category - The category name (case-insensitive)
 * @returns true if the category has subcategories
 */
export function categoryHasSubcategories(category: string): boolean {
  const config = getCategoryConfig(category);
  return config?.hasSubcategories ?? false;
}

/**
 * Get the default subcategory for a category
 * @param category - The category name (case-insensitive)
 * @returns The default subcategory value or undefined
 */
export function getDefaultSubcategory(category: string): string | undefined {
  const config = getCategoryConfig(category);
  return config?.defaultSubcategory;
}

/**
 * Get the subcategories for a category
 * @param category - The category name (case-insensitive)
 * @returns Array of subcategory definitions (empty if none)
 */
export function getSubcategories(category: string): SubcategoryDefinition[] {
  const config = getCategoryConfig(category);
  return config?.subcategories ?? [];
}

/**
 * Determine the initial subcategory for a category
 * If a subcategory is provided, it's returned if the category supports subcategories.
 * Otherwise, the default subcategory for the category is returned.
 *
 * @param category - The category name
 * @param providedSubcategory - Optional provided subcategory value
 * @returns The appropriate subcategory value or undefined
 */
export function getInitialSubcategory(category: string, providedSubcategory?: string): string | undefined {
  const config = getCategoryConfig(category);

  if (!config || !config.hasSubcategories) {
    return undefined;
  }

  // If a subcategory is provided and valid, use it
  if (providedSubcategory) {
    const isValid = config.subcategories.some(sub =>
      sub.value.toLowerCase() === providedSubcategory.toLowerCase()
    );
    if (isValid) {
      // Return the properly cased version
      const match = config.subcategories.find(sub =>
        sub.value.toLowerCase() === providedSubcategory.toLowerCase()
      );
      return match?.value ?? config.defaultSubcategory;
    }
  }

  return config.defaultSubcategory;
}

/**
 * Validate if a subcategory is valid for a given category
 * @param category - The category name
 * @param subcategory - The subcategory to validate
 * @returns true if the subcategory is valid for the category
 */
export function isValidSubcategory(category: string, subcategory: string): boolean {
  const config = getCategoryConfig(category);

  if (!config || !config.hasSubcategories) {
    return false;
  }

  return config.subcategories.some(sub =>
    sub.value.toLowerCase() === subcategory.toLowerCase()
  );
}

/**
 * Check if a category name is valid
 * @param category - The category name to check
 * @returns true if the category exists in the configuration
 */
export function isValidCategory(category: string): boolean {
  return getCategoryConfig(category) !== undefined;
}

/**
 * Convert UI category name to database enum value (lowercase)
 * The database uses lowercase enum values like 'games', 'sports', 'music', 'stories'
 * @param category - The category name from UI (e.g., 'Games')
 * @returns Lowercase version for database (e.g., 'games')
 */
export function categoryToDbValue(category: string): string {
  return category.toLowerCase();
}

/**
 * Convert database category enum value to UI display name (title case)
 * @param dbCategory - The category from database (e.g., 'games')
 * @returns Title case version for UI (e.g., 'Games')
 */
export function dbCategoryToDisplay(dbCategory: string): string {
  return dbCategory.charAt(0).toUpperCase() + dbCategory.slice(1).toLowerCase();
}

/**
 * API category resolution map.
 *
 * Some category strings used internally (e.g. "general") don't exist as real
 * database categories.  This map defines the canonical API category to use
 * when querying the backend.  Both the backlog store and the enrichment
 * pipeline should use {@link resolveApiCategory} so they agree on what data
 * to fetch for a given logical category.
 *
 * If a category is NOT in this map it is passed through unchanged.
 */
const API_CATEGORY_ALIASES: Record<string, string> = {
  general: 'sports',
};

/**
 * Resolve a logical category to the category string used by the API / database.
 *
 * Use this everywhere you need to convert a user-facing or fallback category
 * into the value sent to the backend.  This avoids hidden, one-off mappings
 * scattered across the codebase.
 *
 * @param category - The logical category (e.g. "general", "sports", "music")
 * @returns The category string the API / database expects
 */
export function resolveApiCategory(category: string): string {
  const lower = category.toLowerCase().trim();
  return API_CATEGORY_ALIASES[lower] ?? lower;
}

/**
 * Precomputed reverse lookup: lowercase alias → canonical CategoryName.
 * Built once from CATEGORY_CONFIG.dbAliases so every call to
 * resolveDisplayCategory is O(1).
 */
const ALIAS_LOOKUP: Record<string, CategoryName> = (() => {
  const map: Record<string, CategoryName> = {};
  for (const [key, def] of Object.entries(CATEGORY_CONFIG)) {
    for (const alias of def.dbAliases) {
      map[alias] = key as CategoryName;
    }
  }
  return map;
})();

/**
 * Resolve a DB category string to its canonical CategoryName.
 *
 * Lookup order:
 *  1. Exact match against dbAliases (case-insensitive)
 *  2. Direct match against config key (case-insensitive title-case)
 *
 * @param dbCategory - The raw category string from the database
 * @returns The canonical CategoryName, or null if unrecognised
 */
export function resolveDisplayCategory(dbCategory: string): CategoryName | null {
  const lower = dbCategory.toLowerCase().trim();

  // Fast path: alias table
  if (lower in ALIAS_LOOKUP) return ALIAS_LOOKUP[lower];

  // Fallback: title-case match against config keys
  const titleCase = lower.charAt(0).toUpperCase() + lower.slice(1);
  if (titleCase in CATEGORY_CONFIG) return titleCase as CategoryName;

  return null;
}
