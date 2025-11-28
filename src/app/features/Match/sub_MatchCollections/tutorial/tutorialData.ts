/**
 * Tutorial data for MatchGridTutorial
 * Contains demo items and grid items for the tutorial
 */

import { BacklogItem } from "@/types/backlog-groups";
import { GridItemType } from "@/types/match";

export const DEMO_BACKLOG_ITEMS: BacklogItem[] = [
  {
    id: "demo-1",
    name: "The Shawshank Redemption",
    title: "The Shawshank Redemption",
    description: "Classic prison drama",
    category: "movies",
    item_year: 1994,
    image_url: undefined,
    created_at: new Date().toISOString(),
    tags: ["drama", "classic"],
    used: false
  },
  {
    id: "demo-2",
    name: "The Godfather",
    title: "The Godfather",
    description: "Mafia masterpiece",
    category: "movies",
    item_year: 1972,
    image_url: undefined,
    created_at: new Date().toISOString(),
    tags: ["crime", "classic"],
    used: false
  },
  {
    id: "demo-3",
    name: "Pulp Fiction",
    title: "Pulp Fiction",
    description: "Tarantino's cult classic",
    category: "movies",
    item_year: 1994,
    image_url: undefined,
    created_at: new Date().toISOString(),
    tags: ["crime", "thriller"],
    used: false
  }
];

export function createDemoGridItems(): GridItemType[] {
  return [
    {
      id: "grid-0",
      title: "The Godfather",
      description: "Mafia masterpiece",
      position: 0,
      matched: true,
      backlogItemId: "demo-2",
      tags: ["crime", "classic"],
      isDragPlaceholder: false
    },
    {
      id: "grid-1",
      title: "The Shawshank Redemption",
      description: "Classic prison drama",
      position: 1,
      matched: true,
      backlogItemId: "demo-1",
      tags: ["drama", "classic"],
      isDragPlaceholder: false
    }
  ];
}

// Rank colors for the grid positions
export const RANK_COLORS = {
  GOLD: '#FFD700',
  SILVER: '#C0C0C0',
  BRONZE: '#CD7F32',
} as const;

export function getRankColor(position: number): string {
  if (position === 0) return RANK_COLORS.GOLD;
  if (position === 1) return RANK_COLORS.SILVER;
  return RANK_COLORS.BRONZE;
}
