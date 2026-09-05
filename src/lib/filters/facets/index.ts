/**
 * Faceted Navigation Module — re-exports from @/lib/faceted-search
 * @deprecated Import directly from '@/lib/faceted-search' instead.
 *
 * This directory once held a full second copy of the module (9 files, 3,486
 * lines) that this shim never imported; the copies had already diverged
 * (one got the hierarchical path-key fix, the other the design tokens). The
 * copy was deleted 2026-09-05. Only this shim remains.
 */
export {
  // Types
  type FacetValue,
  type FacetDefinition,
  type Facet,
  type HierarchicalFacetNode,
  type HierarchicalFacet,
  type FacetSelection,
  type FacetState,
  type FacetBreadcrumb,
  type FacetExtractionConfig,
  type FacetAggregationResult,
  type FacetActions,
  type FacetAggregationOptions,
  type FacetCacheStats,
  type FacetContextState,
  type FacetContextValue,
  type FacetProviderProps,
  // Constants
  DEFAULT_FACET_DEFINITIONS,
  // Classes
  FacetExtractor,
  createCollectionFacetExtractor,
  FacetAggregator,
  createFacetAggregator,
  // Components
  FacetPanel,
  FacetBreadcrumbs,
  GroupedFacetBreadcrumbs,
  MobileFacetDrawer,
  MobileFilterButton,
  useMobileFacetDrawer,
  // Hook
  useFacets,
  // Context
  FacetProvider,
  useFacetContext,
  useFacetContextOptional,
} from '@/lib/faceted-search';
