/**
 * Category Tree Data Structure
 * Builds and manages the hierarchical category tree
 */

import {
  Music,
  Gamepad2,
  Trophy,
  Film,
  BookOpen,
  Utensils,
  Palette,
  Cpu,
  Shirt,
  Plane,
  Circle,
  Dumbbell,
  Bike,
  Music2,
  Disc3,
  Radio,
  Mic2,
  Headphones,
  Swords,
  Puzzle,
  Dice5,
  Target,
  Clapperboard,
  Tv,
  Video,
  Popcorn,
  LucideIcon,
} from "lucide-react";
import {
  CategoryNode,
  CategoryTree,
  CATEGORY_COLORS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_POPULARITY,
} from "./types";
import { CATEGORY_CONFIG, SPORTS_SUBCATEGORIES } from "@/lib/config/category-config";

/**
 * Icon mapping for categories
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Sports: Trophy,
  Music: Music,
  Games: Gamepad2,
  Movies: Film,
  Stories: BookOpen,
  Food: Utensils,
  Art: Palette,
  Technology: Cpu,
  Fashion: Shirt,
  Travel: Plane,
};

/**
 * Subcategory icons
 */
const SUBCATEGORY_ICONS: Record<string, LucideIcon> = {
  // Sports
  Basketball: Circle,
  "Ice-Hockey": Trophy,
  Soccer: Circle,
  Football: Dumbbell,
  Tennis: Target,
  Golf: Target,
  Baseball: Target,
  Boxing: Dumbbell,
  MMA: Dumbbell,
  Cycling: Bike,
  // Music
  Rock: Music2,
  Pop: Disc3,
  "Hip-Hop": Mic2,
  Electronic: Headphones,
  Classical: Radio,
  Jazz: Mic2,
  // Games
  "Video Games": Gamepad2,
  "Board Games": Dice5,
  "Card Games": Puzzle,
  RPG: Swords,
  Strategy: Target,
  // Movies
  Action: Clapperboard,
  Drama: Film,
  Comedy: Popcorn,
  "Sci-Fi": Video,
  Horror: Film,
  Documentary: Tv,
};

/**
 * Extended subcategory definitions for categories beyond Sports
 */
const EXTENDED_SUBCATEGORIES: Record<string, Array<{ value: string; label: string; description?: string }>> = {
  Music: [
    { value: "Rock", label: "Rock", description: "Classic and modern rock" },
    { value: "Pop", label: "Pop", description: "Popular music hits" },
    { value: "Hip-Hop", label: "Hip-Hop", description: "Rap and hip-hop" },
    { value: "Electronic", label: "Electronic", description: "EDM and electronic" },
    { value: "Classical", label: "Classical", description: "Classical compositions" },
  ],
  Games: [
    { value: "Video Games", label: "Video Games", description: "Console and PC games" },
    { value: "Board Games", label: "Board Games", description: "Tabletop classics" },
    { value: "RPG", label: "RPG", description: "Role-playing games" },
    { value: "Strategy", label: "Strategy", description: "Strategy and tactics" },
  ],
  Movies: [
    { value: "Action", label: "Action", description: "Action and adventure" },
    { value: "Drama", label: "Drama", description: "Dramatic films" },
    { value: "Comedy", label: "Comedy", description: "Comedy films" },
    { value: "Sci-Fi", label: "Sci-Fi", description: "Science fiction" },
    { value: "Documentary", label: "Documentary", description: "Documentary films" },
  ],
  Stories: [
    { value: "Fiction", label: "Fiction", description: "Fictional narratives" },
    { value: "Non-Fiction", label: "Non-Fiction", description: "True stories" },
    { value: "Fantasy", label: "Fantasy", description: "Fantasy worlds" },
    { value: "Mystery", label: "Mystery", description: "Mystery and thriller" },
  ],
};

/**
 * Create a category node
 */
function createNode(
  id: string,
  name: string,
  label: string,
  level: number,
  parentPath: string[] = [],
  options: Partial<CategoryNode> = {}
): CategoryNode {
  return {
    id,
    name,
    label,
    level,
    path: [...parentPath, id],
    children: [],
    description: options.description,
    icon: options.icon,
    color: options.color,
    popularity: options.popularity,
    trending: options.trending,
    image: options.image,
  };
}

/**
 * Build the category tree from configuration
 */
export function buildCategoryTree(): CategoryTree {
  const nodes = new Map<string, CategoryNode>();

  // Create root node
  const root = createNode("root", "root", "All Categories", 0, [], {
    description: "Browse all categories",
  });
  nodes.set("root", root);

  // Get all categories from config and add extended ones
  const allCategories = [
    ...Object.keys(CATEGORY_CONFIG),
    "Movies",
    "Food",
    "Art",
    "Technology",
    "Fashion",
    "Travel",
  ];

  // Remove duplicates
  const uniqueCategories = Array.from(new Set(allCategories));

  // Create category nodes
  uniqueCategories.forEach((categoryName) => {
    const categoryNode = createNode(
      categoryName.toLowerCase(),
      categoryName,
      categoryName,
      1,
      ["root"],
      {
        description: CATEGORY_DESCRIPTIONS[categoryName] || `Explore ${categoryName}`,
        icon: CATEGORY_ICONS[categoryName],
        color: CATEGORY_COLORS[categoryName],
        popularity: CATEGORY_POPULARITY[categoryName] || 50,
        trending: CATEGORY_POPULARITY[categoryName] > 85,
      }
    );

    // Add subcategories from CATEGORY_CONFIG
    const config = CATEGORY_CONFIG[categoryName];
    if (config && config.hasSubcategories) {
      config.subcategories.forEach((sub) => {
        const subNode = createNode(
          sub.value.toLowerCase().replace(/\s+/g, "-"),
          sub.value,
          sub.label,
          2,
          categoryNode.path,
          {
            description: sub.description,
            icon: SUBCATEGORY_ICONS[sub.value] || sub.icon,
            color: categoryNode.color,
            popularity: Math.floor(Math.random() * 30) + 60,
          }
        );
        subNode.parent = categoryNode;
        categoryNode.children.push(subNode);
        nodes.set(subNode.id, subNode);
      });
    }

    // Add extended subcategories for visual browser
    const extended = EXTENDED_SUBCATEGORIES[categoryName];
    if (extended && categoryNode.children.length === 0) {
      extended.forEach((sub) => {
        const subNode = createNode(
          sub.value.toLowerCase().replace(/\s+/g, "-"),
          sub.value,
          sub.label,
          2,
          categoryNode.path,
          {
            description: sub.description,
            icon: SUBCATEGORY_ICONS[sub.value],
            color: categoryNode.color,
            popularity: Math.floor(Math.random() * 30) + 60,
          }
        );
        subNode.parent = categoryNode;
        categoryNode.children.push(subNode);
        nodes.set(subNode.id, subNode);
      });
    }

    categoryNode.parent = root;
    root.children.push(categoryNode);
    nodes.set(categoryNode.id, categoryNode);
  });

  // Calculate max depth
  let maxDepth = 1;
  nodes.forEach((node) => {
    if (node.level > maxDepth) {
      maxDepth = node.level;
    }
  });

  return { root, nodes, maxDepth };
}

/**
 * Find a node by its ID
 */
export function findNodeById(tree: CategoryTree, id: string): CategoryNode | undefined {
  return tree.nodes.get(id);
}

/**
 * Find a node by category name
 */
export function findNodeByName(tree: CategoryTree, name: string): CategoryNode | undefined {
  return Array.from(tree.nodes.values()).find(
    node => node.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Find a node by path
 */
export function findNodeByPath(tree: CategoryTree, path: string[]): CategoryNode | undefined {
  let current = tree.root;

  for (let i = 1; i < path.length; i++) {
    const segment = path[i];
    const child = current.children.find((c) => c.id === segment);
    if (!child) return undefined;
    current = child;
  }

  return current;
}

/**
 * Get ancestors of a node (for breadcrumbs)
 */
export function getAncestors(node: CategoryNode): CategoryNode[] {
  const ancestors: CategoryNode[] = [];
  let current = node.parent;

  while (current) {
    ancestors.unshift(current);
    current = current.parent;
  }

  return ancestors;
}

/**
 * Search the tree for matching nodes
 */
export function searchTree(
  tree: CategoryTree,
  query: string,
  maxResults: number = 10
): CategoryNode[] {
  if (!query.trim()) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const results: Array<{ node: CategoryNode; score: number }> = [];

  tree.nodes.forEach((node) => {
    if (node.id === "root") return;

    let score = 0;

    // Name match (highest priority)
    if (node.name.toLowerCase().includes(normalizedQuery)) {
      score += node.name.toLowerCase().startsWith(normalizedQuery) ? 100 : 50;
    }

    // Label match
    if (node.label.toLowerCase().includes(normalizedQuery)) {
      score += node.label.toLowerCase().startsWith(normalizedQuery) ? 80 : 40;
    }

    // Description match
    if (node.description?.toLowerCase().includes(normalizedQuery)) {
      score += 30;
    }

    // Path match
    if (node.path.some((p) => p.toLowerCase().includes(normalizedQuery))) {
      score += 20;
    }

    if (score > 0) {
      // Boost popular categories
      score += (node.popularity || 0) / 10;

      // Boost trending
      if (node.trending) score += 15;

      results.push({ node, score });
    }
  });

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, maxResults).map((r) => r.node);
}

/**
 * Get popular categories
 */
export function getPopularCategories(tree: CategoryTree, limit: number = 6): CategoryNode[] {
  const categories: CategoryNode[] = [];

  tree.nodes.forEach((node) => {
    if (node.level === 1) {
      categories.push(node);
    }
  });

  return categories
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, limit);
}

/**
 * Get trending categories
 */
export function getTrendingCategories(tree: CategoryTree): CategoryNode[] {
  const trending: CategoryNode[] = [];

  tree.nodes.forEach((node) => {
    if (node.trending && node.level > 0) {
      trending.push(node);
    }
  });

  return trending.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}

// Create singleton instance
let treeInstance: CategoryTree | null = null;

/**
 * Get the category tree singleton
 */
export function getCategoryTree(): CategoryTree {
  if (!treeInstance) {
    treeInstance = buildCategoryTree();
  }
  return treeInstance;
}
