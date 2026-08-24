'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  TrendingUp,
  Trophy,
  Clock,
  Star,
  ArrowLeft,
  Crown,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';

import { CommunityTemplateCard } from '@/app/features/Templates/CommunityTemplateCard';
import { useCommunityTemplates } from '@/hooks/use-blueprints';
import { useComposition } from '@/hooks/use-composition';
import { DURATION } from '@/lib/animations/motion-presets';
import { Blueprint, SearchBlueprintsParams } from '@/types/blueprint';

const SORT_OPTIONS = [
  { id: 'popular', label: 'Most Popular', icon: Trophy },
  { id: 'top-rated', label: 'Top Rated', icon: Star },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'recent', label: 'Newest', icon: Clock },
] as const;

type SortOption = typeof SORT_OPTIONS[number]['id'];

const CATEGORIES = [
  'All',
  'Sports',
  'Music',
  'Games',
  'Movies',
  'Stories',
  'Food',
  'Travel',
  'Other',
] as const;

export default function TemplatesPage() {
  const searchParams = useSearchParams();
  const { openWithBlueprint } = useComposition();

  const [sort, setSort] = useState<SortOption>('popular');
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const queryParams = useMemo<Omit<SearchBlueprintsParams, 'isCommunity'>>(() => {
    const params: Omit<SearchBlueprintsParams, 'isCommunity'> = {
      sort,
      limit: 50,
    };
    if (category !== 'All') params.category = category;
    if (search.trim()) params.search = search.trim();
    return params;
  }, [sort, category, search]);

  const { data: templates = [], isLoading } = useCommunityTemplates(queryParams);

  // Check if a specific template should be highlighted from URL
  const highlightSlug = searchParams.get('view');

  const handleUseTemplate = (template: Blueprint) => {
    openWithBlueprint(template);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="relative border-b border-gray-800/60 backdrop-blur-2xl sticky top-0 z-40 bg-black/70">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 5%, rgba(251,191,36,0.4) 30%, rgba(245,158,11,0.6) 50%, rgba(6,182,212,0.3) 70%, transparent 95%)',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="group flex items-center justify-center w-10 h-10 rounded-xl
                bg-white/[0.03] border border-white/[0.06]
                hover:bg-white/[0.06] hover:border-white/[0.1]
                text-gray-400 hover:text-gray-300
                transition-all duration-300"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </Link>

            <div className="flex-1 flex items-center gap-3">
              <Crown className="w-5 h-5 text-amber-500/80" />
              <div className="flex items-baseline gap-2">
                <span
                  className="text-lg font-black tracking-tight"
                  style={{
                    background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 50%, #d97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  G.O.A.T.
                </span>
                <span className="text-white/20">|</span>
                <h1 className="text-lg font-semibold text-white/80 tracking-tight">
                  Community Templates
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Hero section */}
        <div className="text-center space-y-2 pb-4">
          <h2 className="text-2xl font-bold text-white">
            Discover Community Templates
          </h2>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            Browse templates published by the community. Find your next ranking list or publish your own for others to use.
          </p>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]
              text-sm text-white placeholder:text-gray-500
              focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/20
              transition-colors"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                category === cat
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:bg-white/[0.04] hover:border-white/[0.1]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sort tabs */}
        <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06] max-w-fit mx-auto">
          {SORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = sort === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setSort(option.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-3 h-3" />
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Templates grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-amber-500/60" />
          </div>
        ) : templates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 space-y-3"
          >
            <Trophy className="w-10 h-10 text-gray-700 mx-auto" />
            <p className="text-gray-500 text-sm">
              {search || category !== 'All'
                ? 'No templates match your filters. Try broadening your search.'
                : 'No community templates yet. Be the first to publish one!'}
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${sort}-${category}-${search}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {templates.map((template) => (
                <CommunityTemplateCard
                  key={template.id}
                  template={template}
                  onUseTemplate={handleUseTemplate}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Highlighted template overlay */}
        {highlightSlug && (
          <HighlightedTemplateView
            slug={highlightSlug}
            templates={templates}
            onUseTemplate={handleUseTemplate}
          />
        )}
      </main>
    </div>
  );
}

function HighlightedTemplateView({
  slug,
  templates,
  onUseTemplate,
}: {
  slug: string;
  templates: Blueprint[];
  onUseTemplate: (t: Blueprint) => void;
}) {
  const template = templates.find((t) => t.slug === slug || t.id === slug);
  if (!template) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => {
        // Remove the view param
        const url = new URL(window.location.href);
        url.searchParams.delete('view');
        window.history.replaceState({}, '', url.toString());
      }}
    >
      <div
        className="max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <CommunityTemplateCard template={template} onUseTemplate={onUseTemplate} />
      </div>
    </motion.div>
  );
}
