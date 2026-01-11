// Template System Types

import { TopList } from './top-lists';

export interface ListTemplate {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  size: number;
  time_period?: string;
  description?: string;
  // Source list for cloning
  sourceListId?: string;
  // Template metadata
  isFeatured?: boolean;
  usageCount?: number;
  // For display purposes
  color?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templates: ListTemplate[];
}

// Predefined template categories (Notion-style)
export const TEMPLATE_CATEGORIES = {
  CLASSICS: 'classics',
  TRENDING: 'trending',
  ALL_TIME: 'all-time',
  SEASONAL: 'seasonal',
} as const;

export type TemplateCategoryType = typeof TEMPLATE_CATEGORIES[keyof typeof TEMPLATE_CATEGORIES];

// Convert a TopList to a ListTemplate
export function topListToTemplate(list: TopList): ListTemplate {
  return {
    id: `template-${list.id}`,
    title: list.title,
    category: list.category,
    subcategory: list.subcategory,
    size: list.size,
    time_period: list.time_period,
    description: list.description,
    sourceListId: list.id,
    isFeatured: true,
    usageCount: 0,
  };
}

// Predefined starter templates
export const STARTER_TEMPLATES: ListTemplate[] = [
  {
    id: 'template-top-10-classics',
    title: 'Top 10 Classics',
    category: 'Movies',
    subcategory: 'All',
    size: 10,
    time_period: 'all-time',
    description: 'Your personal top 10 classic films of all time',
    isFeatured: true,
  },
  {
    id: 'template-best-of-2024',
    title: 'Best of 2024',
    category: 'Music',
    subcategory: 'All',
    size: 25,
    time_period: 'year',
    description: 'The best tracks and albums of 2024',
    isFeatured: true,
  },
  {
    id: 'template-all-time-greatest',
    title: 'All-Time Greatest',
    category: 'Sports',
    subcategory: 'Basketball',
    size: 50,
    time_period: 'all-time',
    description: 'The greatest athletes or teams of all time',
    isFeatured: true,
  },
  {
    id: 'template-gaming-legends',
    title: 'Gaming Legends',
    category: 'Games',
    subcategory: 'All',
    size: 25,
    time_period: 'all-time',
    description: 'The most influential video games ever made',
    isFeatured: true,
  },
];
