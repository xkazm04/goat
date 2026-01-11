"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Trophy,
  TrendingUp,
  Star,
  Calendar,
  ChevronRight,
  Copy,
  Check
} from "lucide-react";
import { TopList } from "@/types/top-lists";
import { ListTemplate, STARTER_TEMPLATES, topListToTemplate } from "@/types/templates";
import { getCategoryColor } from "@/lib/helpers/getColors";
import { useTopLists } from "@/hooks/use-top-lists";

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

export function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  const [activeTab, setActiveTab] = useState<TabId>('starters');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Fetch popular and trending lists for templates
  const { data: popularLists = [], isLoading: loadingPopular } = useTopLists(
    { limit: 8, sort: 'popular', type: 'top' },
    { enabled: activeTab === 'popular' }
  );
  const { data: trendingLists = [], isLoading: loadingTrending } = useTopLists(
    { limit: 8, sort: 'trending', type: 'top' },
    { enabled: activeTab === 'trending' }
  );
  const { data: classicLists = [], isLoading: loadingClassics } = useTopLists(
    { limit: 8, sort: 'latest', type: 'top' },
    { enabled: activeTab === 'classics' }
  );

  const getTemplatesForTab = (): ListTemplate[] => {
    switch (activeTab) {
      case 'starters':
        return STARTER_TEMPLATES;
      case 'popular':
        return popularLists.map(topListToTemplate);
      case 'trending':
        return trendingLists.map(topListToTemplate);
      case 'classics':
        return classicLists.map(topListToTemplate);
      default:
        return [];
    }
  };

  const isLoading =
    (activeTab === 'popular' && loadingPopular) ||
    (activeTab === 'trending' && loadingTrending) ||
    (activeTab === 'classics' && loadingClassics);

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
          <Copy className="w-5 h-5 text-cyan-400" />
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
                flex items-center gap-2 px-4 py-2.5 rounded-xl
                transition-all duration-200 whitespace-nowrap
                ${isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
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
                  className="h-24 rounded-xl overflow-hidden relative"
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
          ) : templates.length > 0 ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
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
                    className={`
                      relative group rounded-xl overflow-hidden cursor-pointer
                      border transition-all duration-200
                      ${isSelected
                        ? 'border-cyan-400 ring-2 ring-cyan-400/30'
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
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center z-10"
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
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
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
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-500 group-hover:text-cyan-400 transition-colors">
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
