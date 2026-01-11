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
  },
  Music: {
    name: "Music",
    hasSubcategories: false,
    subcategories: [],
    defaultSubcategory: undefined,
  },
  Games: {
    name: "Games",
    hasSubcategories: false,
    subcategories: [],
    defaultSubcategory: undefined,
  },
  Stories: {
    name: "Stories",
    hasSubcategories: false,
    subcategories: [],
    defaultSubcategory: undefined,
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
