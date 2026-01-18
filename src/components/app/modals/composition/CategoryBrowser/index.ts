/**
 * Category Browser Module
 * Visual category browser with hierarchical navigation and preview cards
 */

export { CategoryBrowser } from "./CategoryBrowser";
export { CategoryCard } from "./CategoryCard";
export { BreadcrumbNav, CompactBreadcrumb, CollapsibleBreadcrumb } from "./BreadcrumbNav";
export { CategorySearch } from "./CategorySearch";
export {
  NavigationAnimator,
  SlideNavigator,
  FadeNavigator,
  StaggerContainer,
  StaggerItem,
  useNavigationDirection,
} from "./NavigationAnimator";
export {
  buildCategoryTree,
  getCategoryTree,
  findNodeById,
  findNodeByName,
  findNodeByPath,
  getAncestors,
  searchTree,
  getPopularCategories,
  getTrendingCategories,
} from "./categoryTree";
export type {
  CategoryNode,
  CategoryTree,
  NavigationState,
  SearchResult,
  RecentCategory,
  CardVariant,
  CategoryBrowserProps,
  CategoryCardProps,
  BreadcrumbNavProps,
  CategorySearchProps,
  NavigationAnimatorProps,
  CategoryMetadata,
} from "./types";
export {
  STORAGE_KEYS,
  CATEGORY_COLORS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_POPULARITY,
} from "./types";
