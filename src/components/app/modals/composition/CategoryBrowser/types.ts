/**
 * Category Browser Types
 * Types and interfaces for the visual category browser with hierarchical navigation
 */

import { LucideIcon } from "lucide-react";

/**
 * Category node in the hierarchy tree
 */
export interface CategoryNode {
  id: string;
  name: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  image?: string;
  color?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  popularity?: number; // 0-100
  trending?: boolean;
  children: CategoryNode[];
  parent?: CategoryNode;
  level: number;
  path: string[];
}

/**
 * Category tree structure
 */
export interface CategoryTree {
  root: CategoryNode;
  nodes: Map<string, CategoryNode>;
  maxDepth: number;
}

/**
 * Navigation state
 */
export interface NavigationState {
  currentNode: CategoryNode;
  breadcrumbs: CategoryNode[];
  history: CategoryNode[];
  historyIndex: number;
}

/**
 * Search result item
 */
export interface SearchResult {
  node: CategoryNode;
  matchType: 'name' | 'description' | 'path';
  matchScore: number;
  highlights: string[];
}

/**
 * Recently selected category
 */
export interface RecentCategory {
  id: string;
  path: string[];
  timestamp: number;
  count: number;
}

/**
 * Category card display variant
 */
export type CardVariant = 'grid' | 'list' | 'compact';

/**
 * Category browser props
 */
export interface CategoryBrowserProps {
  onSelect: (category: string, subcategory?: string) => void;
  selectedCategory?: string;
  selectedSubcategory?: string;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  showSearch?: boolean;
  showRecents?: boolean;
  showPopularity?: boolean;
  variant?: CardVariant;
  maxRecents?: number;
}

/**
 * Category card props
 */
export interface CategoryCardProps {
  node: CategoryNode;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick: () => void;
  onNavigate?: () => void;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  variant?: CardVariant;
  showPopularity?: boolean;
  animationDelay?: number;
}

/**
 * Breadcrumb navigation props
 */
export interface BreadcrumbNavProps {
  breadcrumbs: CategoryNode[];
  onNavigate: (node: CategoryNode) => void;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

/**
 * Category search props
 */
export interface CategorySearchProps {
  tree: CategoryTree;
  onSelect: (node: CategoryNode) => void;
  color: {
    primary: string;
    secondary: string;
    accent: string;
  };
  placeholder?: string;
}

/**
 * Navigation animator props
 */
export interface NavigationAnimatorProps {
  children: React.ReactNode;
  direction: 'forward' | 'backward' | 'none';
  isAnimating: boolean;
}

/**
 * Category metadata for extended display
 */
export interface CategoryMetadata {
  id: string;
  itemCount?: number;
  lastUpdated?: number;
  featuredItems?: string[];
  tags?: string[];
}

/**
 * Storage keys for persistence
 */
export const STORAGE_KEYS = {
  RECENT_CATEGORIES: 'goat_recent_categories',
  CATEGORY_METADATA: 'goat_category_metadata',
} as const;

/**
 * Default category colors by type
 */
export const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; accent: string }> = {
  Sports: { primary: '#22c55e', secondary: '#16a34a', accent: '#4ade80' },
  Music: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' },
  Games: { primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' },
  Movies: { primary: '#ef4444', secondary: '#dc2626', accent: '#f87171' },
  Stories: { primary: '#06b6d4', secondary: '#0891b2', accent: '#22d3ee' },
  Food: { primary: '#f97316', secondary: '#ea580c', accent: '#fb923c' },
  Art: { primary: '#ec4899', secondary: '#db2777', accent: '#f472b6' },
  Technology: { primary: '#3b82f6', secondary: '#2563eb', accent: '#60a5fa' },
  Fashion: { primary: '#d946ef', secondary: '#c026d3', accent: '#e879f9' },
  Travel: { primary: '#14b8a6', secondary: '#0d9488', accent: '#2dd4bf' },
};

/**
 * Category descriptions for UI
 */
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Sports: 'Athletes, teams, and legendary moments',
  Music: 'Artists, albums, and timeless tracks',
  Games: 'Video games, board games, and classics',
  Movies: 'Films, directors, and cinematic excellence',
  Stories: 'Books, authors, and literary masterpieces',
  Food: 'Dishes, cuisines, and culinary delights',
  Art: 'Artists, movements, and visual beauty',
  Technology: 'Innovations, gadgets, and breakthroughs',
  Fashion: 'Designers, trends, and style icons',
  Travel: 'Destinations, experiences, and adventures',
};

/**
 * Category popularity scores (simulated)
 */
export const CATEGORY_POPULARITY: Record<string, number> = {
  Sports: 95,
  Music: 92,
  Games: 88,
  Movies: 90,
  Stories: 75,
  Food: 70,
  Art: 65,
  Technology: 78,
  Fashion: 60,
  Travel: 72,
};
