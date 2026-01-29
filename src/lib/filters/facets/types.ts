/**
 * Faceted Navigation Types
 * Type definitions for facet extraction, aggregation, and UI state
 */

/**
 * A single facet value with its count
 */
export interface FacetValue {
  value: string | number | boolean;
  label: string;
  count: number;
  percentage: number;
  selected: boolean;
}

/**
 * A facet field definition - describes a facetable dimension
 */
export interface FacetDefinition {
  id: string;
  field: string;
  label: string;
  type: 'enum' | 'range' | 'hierarchy' | 'boolean' | 'tags';
  /** For hierarchical facets, path to parent field */
  parentField?: string;
  /** Display order priority (lower = higher priority) */
  priority?: number;
  /** Maximum values to show before "show more" */
  maxVisible?: number;
  /** Whether this facet is collapsible */
  collapsible?: boolean;
  /** Whether facet is expanded by default */
  defaultExpanded?: boolean;
  /** Custom sort order: 'count' | 'alpha' | 'value' */
  sortBy?: 'count' | 'alpha' | 'value';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Aggregated facet with computed values
 */
export interface Facet {
  definition: FacetDefinition;
  values: FacetValue[];
  totalCount: number;
  /** Number of selected values in this facet */
  selectedCount: number;
  /** Whether user has expanded to show all values */
  isExpanded: boolean;
  /** Whether this facet is currently loading */
  isLoading: boolean;
  /** For range facets: min/max bounds */
  range?: { min: number; max: number };
}

/**
 * Hierarchical facet node (for Category > Subcategory drill-down)
 */
export interface HierarchicalFacetNode {
  value: string;
  label: string;
  count: number;
  level: number;
  parentValue?: string;
  children: HierarchicalFacetNode[];
  selected: boolean;
  expanded: boolean;
}

/**
 * Hierarchical facet structure
 */
export interface HierarchicalFacet extends Omit<Facet, 'values'> {
  nodes: HierarchicalFacetNode[];
  /** Currently expanded path (breadcrumb) */
  expandedPath: string[];
}

/**
 * Active facet selection - represents user's current selections
 */
export interface FacetSelection {
  facetId: string;
  field: string;
  values: (string | number | boolean)[];
  /** For range facets */
  range?: { min: number; max: number };
}

/**
 * Complete facet state
 */
export interface FacetState {
  facets: Facet[];
  hierarchicalFacets: HierarchicalFacet[];
  selections: FacetSelection[];
  /** Search term for filtering facet values */
  facetSearchTerms: Record<string, string>;
  /** Loading state */
  isLoading: boolean;
  /** Last computation time in ms */
  lastComputeTime: number;
}

/**
 * Facet breadcrumb item (for active filter trail)
 */
export interface FacetBreadcrumb {
  id: string;
  facetId: string;
  facetLabel: string;
  value: string | number | boolean;
  valueLabel: string;
  /** For hierarchical: full path */
  path?: string[];
}

/**
 * Facet extraction configuration
 */
export interface FacetExtractionConfig {
  /** Fields to extract as facets */
  fields: FacetDefinition[];
  /** Minimum count to include a facet value (filter out rare values) */
  minCount?: number;
  /** Maximum facet values to return per facet */
  maxValues?: number;
  /** Whether to include empty/null values */
  includeEmpty?: boolean;
  /** Custom value formatter */
  formatValue?: (field: string, value: unknown) => string;
}

/**
 * Facet aggregation result
 */
export interface FacetAggregationResult {
  facets: Facet[];
  hierarchicalFacets: HierarchicalFacet[];
  totalItems: number;
  filteredItems: number;
  computeTime: number;
}

/**
 * Facet actions for state management
 */
export interface FacetActions {
  /** Select/deselect a facet value */
  toggleFacetValue: (facetId: string, value: string | number | boolean) => void;
  /** Select multiple values at once */
  setFacetValues: (facetId: string, values: (string | number | boolean)[]) => void;
  /** Clear all selections for a facet */
  clearFacet: (facetId: string) => void;
  /** Clear all facet selections */
  clearAllFacets: () => void;
  /** Expand/collapse a facet panel */
  toggleFacetExpanded: (facetId: string) => void;
  /** Set facet search term */
  setFacetSearchTerm: (facetId: string, term: string) => void;
  /** Navigate to a hierarchical facet path */
  drillDown: (facetId: string, path: string[]) => void;
  /** Go back in hierarchical facet */
  drillUp: (facetId: string) => void;
}

/**
 * Default facet definitions for collection items
 */
export const DEFAULT_FACET_DEFINITIONS: FacetDefinition[] = [
  {
    id: 'category',
    field: 'category',
    label: 'Category',
    type: 'hierarchy',
    priority: 1,
    maxVisible: 10,
    collapsible: true,
    defaultExpanded: true,
    sortBy: 'count',
    sortOrder: 'desc',
  },
  {
    id: 'subcategory',
    field: 'subcategory',
    label: 'Subcategory',
    type: 'enum',
    parentField: 'category',
    priority: 2,
    maxVisible: 10,
    collapsible: true,
    defaultExpanded: true,
    sortBy: 'count',
    sortOrder: 'desc',
  },
  {
    id: 'tags',
    field: 'tags',
    label: 'Tags',
    type: 'tags',
    priority: 3,
    maxVisible: 15,
    collapsible: true,
    defaultExpanded: false,
    sortBy: 'count',
    sortOrder: 'desc',
  },
  {
    id: 'used',
    field: 'used',
    label: 'Status',
    type: 'boolean',
    priority: 4,
    collapsible: true,
    defaultExpanded: true,
  },
  {
    id: 'item_year',
    field: 'item_year',
    label: 'Year',
    type: 'range',
    priority: 5,
    collapsible: true,
    defaultExpanded: false,
    sortBy: 'value',
    sortOrder: 'desc',
  },
];
