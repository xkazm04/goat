/**
 * Faceted Navigation Module — re-exports from @/lib/faceted-search
 * @deprecated Import directly from '@/lib/faceted-search' instead.
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
