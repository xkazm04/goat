'use client';

/**
 * TemplateGallery
 *
 * A modal gallery of curated list templates. Users pick a template to
 * pre-fill the Studio form with topic, category, criteria, and starter items.
 *
 * Uses the shared GlassModal shell for consistent styling across the app.
 */

import { motion } from 'framer-motion';
import { LayoutTemplate, Search, ChevronRight, Sparkles } from 'lucide-react';
import { useState, useMemo } from 'react';

import {
  GlassModal,
  GlassModalHeader,
  GlassModalBody,
  GlassModalFooter,
  GLASS_INPUT_CLASS,
  GLASS_PILL_ACTIVE,
  GLASS_PILL_INACTIVE,
} from '@/components/ui/glass-modal';
import { SURFACE_ELEVATION } from '@/components/visual/depth/depth-tokens';
import { CATEGORIES } from '@/lib/config/category-config';
import { ALL_LIST_TEMPLATES } from '@/lib/templates/list-templates';
import { cn } from '@/lib/utils';

import type { ListTemplate } from '@/types/studio';

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

const CATEGORY_FILTERS = ['All', ...CATEGORIES] as const;

function TemplateCard({
  template,
  onSelect,
}: {
  template: ListTemplate;
  onSelect: (id: string) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(template.id)}
      className={cn(
        'group relative w-full text-left rounded-lg p-4 border border-gray-700/50',
        'hover:border-amber-500/40 transition-all duration-200',
        'focus:outline-none focus:ring-1 focus:ring-amber-500/50'
      )}
      style={{ backgroundColor: SURFACE_ELEVATION.raised }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{template.icon}</span>
          <h3 className="text-sm font-medium text-white truncate">
            {template.name}
          </h3>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-amber-400 transition-colors shrink-0 mt-0.5" />
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 line-clamp-2 mb-3">
        {template.description}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-gray-700/60 text-gray-300">
          {template.category}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-amber-500/10 text-amber-400">
          Top {template.listSize}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium bg-blue-500/10 text-blue-400">
          {template.starterItems.length} seeds
        </span>
      </div>

      {/* Starter items preview */}
      <div className="mt-3 pt-2 border-t border-gray-700/30">
        <p className="text-2xs text-gray-500 mb-1">Includes:</p>
        <p className="text-xs text-gray-400 line-clamp-1">
          {template.starterItems.map((i) => i.title).join(' · ')}
        </p>
      </div>
    </motion.button>
  );
}

export function TemplateGallery({ open, onClose, onSelect }: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filteredTemplates = useMemo(() => {
    let result = ALL_LIST_TEMPLATES;

    if (activeCategory !== 'All') {
      result = result.filter((t) => t.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q)) ||
          t.starterItems.some((item) => item.title.toLowerCase().includes(q))
      );
    }

    return result;
  }, [activeCategory, search]);

  const handleSelect = (templateId: string) => {
    onSelect(templateId);
    onClose();
  };

  return (
    <GlassModal open={open} onClose={onClose}>
      <div data-testid="template-gallery" />
      <GlassModalHeader
        icon={LayoutTemplate}
        title="Template Gallery"
        subtitle={`${filteredTemplates.length} template${filteredTemplates.length !== 1 ? 's' : ''}`}
        onClose={onClose}
      />

      {/* Search + Category filter */}
      <div className="px-5 py-3 space-y-3 border-b border-gray-700/30">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className={cn(GLASS_INPUT_CLASS, 'pl-8')}
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                activeCategory === cat ? GLASS_PILL_ACTIVE : GLASS_PILL_INACTIVE,
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <GlassModalBody>
        {filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Sparkles className="w-8 h-8 mb-2 text-gray-600" />
            <p className="text-sm">No templates match your search</p>
            <p className="text-xs mt-1">Try a different keyword or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </GlassModalBody>

      <GlassModalFooter hint="Templates pre-fill your form with starter items. You can generate more or edit freely after applying." />
    </GlassModal>
  );
}
