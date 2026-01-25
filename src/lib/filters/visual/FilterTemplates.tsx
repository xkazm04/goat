'use client';

/**
 * FilterTemplates
 * Pre-built filter templates for common patterns
 */

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star, Tag, Grid, Clock, Bookmark, Filter } from 'lucide-react';
import type { FilterConfig } from '@/lib/filters/types';
import { cn } from '@/lib/utils';
import { useFilterBuilderStore } from '@/stores/filter-builder-store';

/**
 * Template definition
 */
interface FilterTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  config: FilterConfig;
}

/**
 * Pre-built filter templates
 */
export const FILTER_TEMPLATES: FilterTemplate[] = [
  {
    id: 'top-rated',
    name: 'Top Rated',
    description: 'Items with rating 4 stars or higher',
    icon: <Star size={18} />,
    color: 'yellow',
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: 'top-rated-1',
          field: 'ranking',
          operator: 'greater_equal',
          value: 4,
          valueType: 'number',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'unplaced',
    name: 'Not in Grid',
    description: 'Items not yet placed in your grid',
    icon: <Grid size={18} />,
    color: 'blue',
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: 'unplaced-1',
          field: 'used',
          operator: 'equals',
          value: false,
          valueType: 'boolean',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'has-tags',
    name: 'Tagged Items',
    description: 'Items that have been tagged',
    icon: <Tag size={18} />,
    color: 'pink',
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: 'has-tags-1',
          field: 'tags',
          operator: 'is_not_empty',
          value: null,
          valueType: 'array',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'favorites-unplaced',
    name: 'Favorites Not Placed',
    description: 'High-rated items not yet in grid',
    icon: <Sparkles size={18} />,
    color: 'purple',
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: 'fav-unplaced-1',
          field: 'ranking',
          operator: 'greater_equal',
          value: 4,
          valueType: 'number',
          enabled: true,
        },
        {
          id: 'fav-unplaced-2',
          field: 'used',
          operator: 'equals',
          value: false,
          valueType: 'boolean',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'needs-review',
    name: 'Needs Review',
    description: 'Items without tags or low rating',
    icon: <Clock size={18} />,
    color: 'orange',
    config: {
      rootCombinator: 'OR',
      conditions: [
        {
          id: 'review-1',
          field: 'tags',
          operator: 'is_empty',
          value: null,
          valueType: 'array',
          enabled: true,
        },
        {
          id: 'review-2',
          field: 'ranking',
          operator: 'less_than',
          value: 3,
          valueType: 'number',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
  {
    id: 'category-filter',
    name: 'By Category',
    description: 'Filter by specific category',
    icon: <Bookmark size={18} />,
    color: 'cyan',
    config: {
      rootCombinator: 'AND',
      conditions: [
        {
          id: 'category-1',
          field: 'category',
          operator: 'equals',
          value: '',
          valueType: 'enum',
          enabled: true,
        },
      ],
      groups: [],
    },
  },
];

/**
 * Color variants for template cards
 */
const COLOR_VARIANTS: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  yellow: {
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/20 hover:border-yellow-500/40',
    text: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
  },
  blue: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20 hover:border-blue-500/40',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
  pink: {
    bg: 'bg-pink-500/5',
    border: 'border-pink-500/20 hover:border-pink-500/40',
    text: 'text-pink-400',
    iconBg: 'bg-pink-500/10',
  },
  purple: {
    bg: 'bg-purple-500/5',
    border: 'border-purple-500/20 hover:border-purple-500/40',
    text: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
  },
  orange: {
    bg: 'bg-orange-500/5',
    border: 'border-orange-500/20 hover:border-orange-500/40',
    text: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
  },
  cyan: {
    bg: 'bg-cyan-500/5',
    border: 'border-cyan-500/20 hover:border-cyan-500/40',
    text: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
  },
};

/**
 * Template card component
 */
function TemplateCard({
  template,
  onSelect,
}: {
  template: FilterTemplate;
  onSelect: (config: FilterConfig) => void;
}) {
  const colors = COLOR_VARIANTS[template.color] || COLOR_VARIANTS.cyan;

  return (
    <button
      onClick={() => onSelect(template.config)}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
        colors.bg,
        colors.border,
        'hover:scale-[1.02]'
      )}
    >
      <div className={cn('rounded-md p-2', colors.iconBg, colors.text)}>
        {template.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={cn('font-medium', colors.text)}>{template.name}</h4>
        <p className="text-xs text-zinc-500 mt-0.5">{template.description}</p>
      </div>
    </button>
  );
}

/**
 * FilterTemplates component
 */
export function FilterTemplates({
  className,
  onSelect,
}: {
  className?: string;
  onSelect?: (config: FilterConfig) => void;
}) {
  const { fromFilterConfig } = useFilterBuilderStore();

  const handleSelect = useCallback(
    (config: FilterConfig) => {
      fromFilterConfig(config);
      onSelect?.(config);
    },
    [fromFilterConfig, onSelect]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Filter size={14} />
        <span>Quick Templates</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {FILTER_TEMPLATES.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: FILTER_TEMPLATES.indexOf(template) * 0.05 }}
          >
            <TemplateCard template={template} onSelect={handleSelect} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact template selector
 */
export function TemplateQuickSelect({
  className,
}: {
  className?: string;
}) {
  const { fromFilterConfig } = useFilterBuilderStore();

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {FILTER_TEMPLATES.slice(0, 4).map((template) => {
        const colors = COLOR_VARIANTS[template.color] || COLOR_VARIANTS.cyan;
        return (
          <button
            key={template.id}
            onClick={() => fromFilterConfig(template.config)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all',
              colors.bg,
              colors.border,
              colors.text,
              'border hover:scale-105'
            )}
            title={template.description}
          >
            {template.icon}
            <span>{template.name}</span>
          </button>
        );
      })}
    </div>
  );
}
