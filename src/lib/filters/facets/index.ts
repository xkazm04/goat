/**
 * Faceted Navigation Module
 * Exports for facet extraction, aggregation, and UI components
 */

// Types
export type {
  FacetValue,
  FacetDefinition,
  Facet,
  HierarchicalFacetNode,
  HierarchicalFacet,
  FacetSelection,
  FacetState,
  FacetBreadcrumb,
  FacetExtractionConfig,
  FacetAggregationResult,
  FacetActions,
} from './types';

export { DEFAULT_FACET_DEFINITIONS } from './types';

// Facet Extractor
export {
  FacetExtractor,
  createCollectionFacetExtractor,
  defaultFacetExtractor,
} from './FacetExtractor';

// Facet Aggregator
export {
  FacetAggregator,
  createFacetAggregator,
  defaultFacetAggregator,
} from './FacetAggregator';

export type { FacetAggregationOptions } from './FacetAggregator';

// Components
export {
  FacetPanel,
  FacetBreadcrumbs,
  GroupedFacetBreadcrumbs,
  MobileFacetDrawer,
  MobileFilterButton,
  useMobileFacetDrawer,
} from './components';

// React Hook
export { useFacets, default as useFacetsDefault } from './useFacets';

// React Context
export {
  FacetProvider,
  useFacetContext,
  useFacetContextOptional,
  default as FacetContextDefault,
} from './FacetContext';

export type {
  FacetContextState,
  FacetContextValue,
  FacetProviderProps,
} from './FacetContext';
