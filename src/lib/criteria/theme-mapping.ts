/**
 * Theme Mapping Utility
 * Maps category/subcategory names to visual theme keys for score displays
 */

export type ThemeKey = "sports" | "movies" | "music" | "games" | "default";

/**
 * Mapping of category variations to theme keys
 * Keys are lowercase for case-insensitive matching
 */
const THEME_MAPPING: Record<string, ThemeKey> = {
  // Sports variations
  sports: "sports",
  basketball: "sports",
  football: "sports",
  soccer: "sports",
  baseball: "sports",
  tennis: "sports",
  golf: "sports",
  mma: "sports",
  boxing: "sports",
  "ice-hockey": "sports",
  hockey: "sports",
  athletics: "sports",
  swimming: "sports",
  cricket: "sports",
  rugby: "sports",

  // Movies/TV variations
  movies: "movies",
  films: "movies",
  cinema: "movies",
  "tv-shows": "movies",
  television: "movies",
  series: "movies",
  stories: "movies",
  anime: "movies",
  documentaries: "movies",

  // Music variations
  music: "music",
  albums: "music",
  artists: "music",
  songs: "music",
  bands: "music",
  musicians: "music",
  concerts: "music",

  // Games variations
  games: "games",
  "video games": "games",
  gaming: "games",
  videogames: "games",
  "video-games": "games",
  esports: "games",
};

/**
 * Maps category/subcategory names to visual theme keys.
 * Normalizes case and handles common variations.
 *
 * @param category - Category name from list or item
 * @returns ThemeKey for styling components
 *
 * @example
 * mapCategoryToTheme("Sports")     // "sports"
 * mapCategoryToTheme("Movies")     // "movies"
 * mapCategoryToTheme("Custom")     // "default"
 * mapCategoryToTheme(undefined)    // "default"
 */
export function mapCategoryToTheme(
  category: string | undefined | null
): ThemeKey {
  if (!category) return "default";
  const normalized = category.toLowerCase().trim();
  return THEME_MAPPING[normalized] ?? "default";
}
