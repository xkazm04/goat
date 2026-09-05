"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Sparkles,
  Trophy,
  TrendingUp,
  Star,
  Calendar,
  ChevronRight,
  Copy,
  Check,
  RefreshCw
} from "lucide-react";
import { useState } from "react";

import { useTopLists } from "@/hooks/use-top-lists";
import { DURATION } from '@/lib/animations/motion-presets';
import { getCategoryColor } from "@/lib/helpers/getColors";
import { ListTemplate, STARTER_TEMPLATES, topListToTemplate } from "@/types/templates";

interface TemplateGalleryProps {
  onSelectTemplate: (template: ListTemplate) => void;
  onClose?: () => void;
}

// Template category tabs
const TEMPLATE_TABS = [
  { id: 'starters', label: 'Starters', icon: Sparkles, description: 'Quick-start templates' },
  { id: 'popular', label: 'Most Popular', icon: Trophy, description: 'Community favorites' },
  { id: 'trending', label: 'Trending', icon: TrendingUp, description: 'Hot this week' },
  { id: 'classics', label: 'Classics', icon: Star, description: 'Timeless rankings' },
] as const;

type TabId = typeof TEMPLATE_TABS[number]['id'];

export function TemplateGallery({ onSelectTemplate, onClose: _onClose }: TemplateGalleryProps) {
  const [activeTab, setActiveTab] = useState<TabId>('starters');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Fetch popular and trending lists for templates.
  //
  // The whole query result is kept rather than destructured into
  // `data = []`: that default made a FAILED request indistinguishable from an
  // empty catalogue, and the gallery then rendered "No templates available /
  // Check back soon!" over a network error. Render order below is
  // load -> FAILED -> data -> empty, the same precedence `list-grid.tsx` and
  // `SavedListsSection` already enforce in this repo.
  const popularQuery = useTopLists(
    { limit: 8, sort: 'popular', type: 'top' },
    { enabled: activeTab === 'popular' }
  );
  const trendingQuery = useTopLists(
    { limit: 8, sort: 'trending', type: 'top' },
    { enabled: activeTab === 'trending' }
  );
  const classicsQuery = useTopLists(
    { limit: 8, sort: 'latest', type: 'top' },
    { enabled: activeTab === 'classics' }
  );

  // 'starters' is served from a constant and asks nothing, so it has no query
  // and can neither load nor fail.
  const activeQuery =
    activeTab === 'popular'
      ? popularQuery
      : activeTab === 'trending'
        ? trendingQuery
        : activeTab === 'classics'
          ? classicsQuery
          : null;

  const getTemplatesForTab = (): ListTemplate[] => {
    if (activeTab === 'starters') return STARTER_TEMPLATES;
    return (activeQuery?.data ?? []).map(topListToTemplate);
  };

  const isLoading = activeQuery?.isLoading ?? false;
  const loadFailed = !isLoading && !!activeQuery?.error;

  const templates = getTemplatesForTab();

  const handleTemplateClick = (template: ListTemplate) => {
    setSelectedTemplateId(template.id);
    // Small delay for visual feedback before selecting
    setTimeout(() => {
      onSelectTemplate(template);
    }, 150);
  };

  return (
    <div className="w-full" data-testid="template-gallery">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Copy className="w-5 h-5 text-brand-hover" />
          Start from Template
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          Clone a popular list or start with a preset configuration
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" data-testid="template-tabs">
        {TEMPLATE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-card
                transition-all duration-200 whitespace-nowrap
                ${isActive
                  ? 'bg-brand/20 text-brand-hover border border-brand/40'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid={`template-tab-${tab.id}`}
            >
              <TabIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="relative min-h-[200px]">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-card overflow-hidden relative"
                  style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.4))',
                  }}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
                      backgroundSize: '200% 100%',
                    }}
                    animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
              ))}
            </motion.div>
          ) : loadFailed ? (
            /* FAILED, and strictly before the empty arm. The claim is about the
               request ("we could not look"), never about the catalogue ("there
               are none"), and the remedy offered is the one that can actually
               help. */
            <motion.div
              key="failed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
              data-testid="template-gallery-error"
              role="alert"
              aria-live="assertive"
            >
              <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
              <p className="text-sm text-slate-300 mb-1">Couldn&apos;t load templates</p>
              <p className="text-xs text-slate-500 mb-4">
                The catalogue is still there — we just couldn&apos;t reach it right now.
              </p>
              <button
                type="button"
                onClick={() => activeQuery?.refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600
                  rounded-card text-white text-xs transition-colors focus-ring"
                data-testid="template-gallery-retry-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </button>
            </motion.div>
          ) : templates.length > 0 ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: DURATION.fast }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              data-testid="template-grid"
            >
              {templates.map((template, index) => {
                const colors = getCategoryColor(template.category);
                const isSelected = selectedTemplateId === template.id;

                return (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleTemplateClick(template)}
                    /* Adopting a template is the gallery's only action, so the
                       card is a control. framer-motion's whileTap already put
                       it in the tab order, which made it worse than a plain
                       div: focusable, unnamed, and inert on Enter. Same shape
                       as MosaicCard in FeaturedListsSection and CollectionCard. */
                    role="button"
                    tabIndex={0}
                    aria-label={`Use template ${template.title}`}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTemplateClick(template);
                      }
                    }}
                    className={`
                      relative group rounded-card overflow-hidden cursor-pointer
                      border transition-all duration-200
                      ${isSelected
                        ? 'border-brand-hover ring-2 ring-brand-hover/30'
                        : 'border-slate-700/50 hover:border-slate-600'
                      }
                    `}
                    style={{
                      background: `
                        linear-gradient(135deg,
                          rgba(20, 28, 48, 0.8) 0%,
                          rgba(30, 40, 60, 0.6) 100%
                        )
                      `,
                    }}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    data-testid={`template-item-${template.id}`}
                  >
                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 opacity-60 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})`,
                        boxShadow: `0 0 15px ${colors.primary}40`,
                      }}
                    />

                    {/* Selection indicator */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand flex items-center justify-center z-10"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="p-4 pl-5">
                      {/* Title */}
                      <h4 className="text-sm font-semibold text-white truncate mb-1.5">
                        {template.title}
                      </h4>

                      {/* Metadata row */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-badge font-medium"
                          style={{
                            background: `${colors.primary}20`,
                            color: colors.accent,
                          }}
                        >
                          Top {template.size}
                        </span>
                        <span className="text-xs text-slate-500">
                          {template.category}
                        </span>
                      </div>

                      {/* Description */}
                      {template.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {template.description}
                        </p>
                      )}

                      {/* Use Template hint */}
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 group-hover:text-brand-hover transition-colors">
                        <span>Use template</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Shimmer effect on hover */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
                      style={{
                        background: `
                          linear-gradient(
                            105deg,
                            transparent 40%,
                            rgba(255, 255, 255, 0.03) 50%,
                            transparent 60%
                          )
                        `,
                        backgroundSize: '200% 100%',
                      }}
                      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Calendar className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No templates available</p>
              <p className="text-slate-500 text-xs mt-1">Check back soon!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
