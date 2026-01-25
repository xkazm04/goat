'use client';

/**
 * FilterBuilder Feature
 * Main feature component for the visual filter builder
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Filter, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { FilterBuilder } from '@/lib/filters/visual';
import { useFilterBuilderStore } from '@/stores/filter-builder-store';
import type { FilterConfig } from '@/lib/filters/types';
import { cn } from '@/lib/utils';

// Sample data for demonstration
const SAMPLE_ITEMS = [
  { id: '1', title: 'The Shawshank Redemption', category: 'Drama', ranking: 5, tags: ['classic', 'prison'], description: 'Two imprisoned men bond over years', used: true },
  { id: '2', title: 'The Godfather', category: 'Crime', ranking: 5, tags: ['mafia', 'classic'], description: 'The aging patriarch of an organized crime dynasty', used: true },
  { id: '3', title: 'The Dark Knight', category: 'Action', ranking: 5, tags: ['superhero', 'batman'], description: 'Batman faces the Joker', used: false },
  { id: '4', title: 'Pulp Fiction', category: 'Crime', ranking: 4, tags: ['tarantino', 'classic'], description: 'Various interrelated stories', used: false },
  { id: '5', title: 'Forrest Gump', category: 'Drama', ranking: 4, tags: ['feel-good', 'history'], description: 'The story of a man with a low IQ', used: true },
  { id: '6', title: 'Inception', category: 'Sci-Fi', ranking: 5, tags: ['dreams', 'nolan'], description: 'A thief who steals secrets through dreams', used: false },
  { id: '7', title: 'The Matrix', category: 'Sci-Fi', ranking: 4, tags: ['simulation', 'action'], description: 'A hacker discovers the truth about reality', used: false },
  { id: '8', title: 'Goodfellas', category: 'Crime', ranking: 4, tags: ['mafia', 'classic'], description: 'The story of Henry Hill', used: false },
  { id: '9', title: 'Fight Club', category: 'Drama', ranking: 4, tags: ['cult', 'twist'], description: 'An insomniac office worker forms a fight club', used: false },
  { id: '10', title: 'Interstellar', category: 'Sci-Fi', ranking: 5, tags: ['space', 'nolan'], description: 'Explorers travel through a wormhole', used: true },
  { id: '11', title: 'The Silence of the Lambs', category: 'Thriller', ranking: 5, tags: ['serial-killer', 'classic'], description: 'FBI trainee seeks help from Hannibal Lecter', used: false },
  { id: '12', title: 'Se7en', category: 'Thriller', ranking: 4, tags: ['serial-killer', 'dark'], description: 'Two detectives hunt a serial killer', used: false },
  { id: '13', title: 'The Lord of the Rings', category: 'Fantasy', ranking: 5, tags: ['epic', 'tolkien'], description: 'A hobbit embarks on an epic quest', used: true },
  { id: '14', title: 'Gladiator', category: 'Action', ranking: 4, tags: ['roman', 'revenge'], description: 'A general becomes a gladiator', used: false },
  { id: '15', title: 'The Departed', category: 'Crime', ranking: 4, tags: ['undercover', 'boston'], description: 'An undercover cop and a mole in the police', used: false },
];

/**
 * Custom item renderer for the preview
 */
function MovieItemRenderer(item: typeof SAMPLE_ITEMS[0], index: number) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-zinc-800/50 p-2">
      <div className="flex h-10 w-10 items-center justify-center rounded bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-lg">
        {item.ranking >= 5 ? '🏆' : item.ranking >= 4 ? '⭐' : '🎬'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-200">{item.title}</p>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{item.category}</span>
          <span>•</span>
          <span>{'⭐'.repeat(item.ranking)}</span>
        </div>
      </div>
      {item.used && (
        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-400">
          In Grid
        </span>
      )}
    </div>
  );
}

/**
 * FilterBuilderPage component
 */
export function FilterBuilderPage() {
  const searchParams = useSearchParams();
  const { loadFromShareCode, toFilterConfig } = useFilterBuilderStore();

  const [appliedConfig, setAppliedConfig] = useState<FilterConfig | null>(null);

  // Load filter from URL if present
  useEffect(() => {
    const filterCode = searchParams.get('filter');
    if (filterCode) {
      loadFromShareCode(filterCode);
    }
  }, [searchParams, loadFromShareCode]);

  // Handle filter changes
  const handleChange = useCallback((config: FilterConfig) => {
    // Could debounce and auto-apply here
  }, []);

  // Handle apply
  const handleApply = useCallback((config: FilterConfig) => {
    setAppliedConfig(config);
    console.log('Applied filter config:', config);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200"
              >
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">Back</span>
              </Link>
              <div className="h-6 w-px bg-zinc-700" />
              <div className="flex items-center gap-2">
                <Filter className="text-cyan-400" size={24} />
                <h1 className="text-xl font-bold">Visual Filter Builder</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Sparkles size={16} className="text-cyan-400" />
              <span className="hidden sm:inline">Drag & Drop Filter Composition</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Introduction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 p-6"
          >
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">
              Build Complex Filters Visually
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Create powerful filter combinations using drag-and-drop. Add conditions,
              group them with AND/OR logic, and see results in real-time.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-400">1</span>
                <span className="text-zinc-300">Add conditions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-400">2</span>
                <span className="text-zinc-300">Organize with groups</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-400">3</span>
                <span className="text-zinc-300">Drag to reorder</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-500/20 px-2 py-1 text-cyan-400">4</span>
                <span className="text-zinc-300">Save & share</span>
              </div>
            </div>
          </motion.div>

          {/* Filter Builder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FilterBuilder
              items={SAMPLE_ITEMS}
              onChange={handleChange}
              onApply={handleApply}
              renderPreviewItem={MovieItemRenderer}
              showPreview
              showSaver
              showToolbar
            />
          </motion.div>

          {/* Applied config display (for demo) */}
          {appliedConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-8 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4"
            >
              <h3 className="text-sm font-medium text-zinc-300 mb-2">
                Applied Configuration (JSON)
              </h3>
              <pre className="text-xs text-zinc-500 overflow-x-auto">
                {JSON.stringify(appliedConfig, null, 2)}
              </pre>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-zinc-500">
          <p>
            Visual Filter Builder - Part of the G.O.A.T. Application
          </p>
        </div>
      </footer>
    </div>
  );
}

export default FilterBuilderPage;
