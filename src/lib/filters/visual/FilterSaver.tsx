'use client';

/**
 * FilterSaver
 * Component for saving, loading, and sharing filter configurations
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  FolderOpen,
  Share2,
  Copy,
  Check,
  Trash2,
  Edit2,
  Link,
  Download,
  Upload,
  X,
  Clock,
  Filter,
  Star,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFilterBuilderStore,
  useFilterBuilderSavedFilters,
  useFilterBuilderActiveFilterId,
  type SavedFilter,
} from '@/stores/filter-builder-store';

/**
 * SaveFilterDialog - Modal for saving a new filter
 */
function SaveFilterDialog({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim() || undefined);
    setName('');
    setDescription('');
    onClose();
  }, [name, description, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">Save Filter</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:text-zinc-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Filter Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Filter"
              className={cn(
                'w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm',
                'text-zinc-200 placeholder-zinc-500',
                'focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500'
              )}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this filter does..."
              rows={3}
              className={cn(
                'w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm',
                'text-zinc-200 placeholder-zinc-500 resize-none',
                'focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500'
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium',
              'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
              'bg-cyan-500 text-white hover:bg-cyan-600',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Save size={16} />
            Save Filter
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * ShareDialog - Modal for sharing filter via URL
 */
function ShareDialog({
  isOpen,
  onClose,
  shareCode,
}: {
  isOpen: boolean;
  onClose: () => void;
  shareCode: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('filter', shareCode);
    return url.toString();
  }, [shareCode]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-zinc-100">Share Filter</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:text-zinc-200"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-zinc-400 mb-4">
          Share this URL to let others use your filter configuration
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className={cn(
              'flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm',
              'text-zinc-300 font-mono truncate'
            )}
          />
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium',
              'bg-cyan-500 text-white hover:bg-cyan-600',
              'min-w-[80px] justify-center'
            )}
          >
            {copied ? (
              <>
                <Check size={16} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy
              </>
            )}
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            Note: The filter configuration is encoded in the URL. Anyone with this
            link can apply the same filter to their view.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * SavedFilterCard - Individual saved filter display
 */
function SavedFilterCard({
  filter,
  isActive,
  onLoad,
  onDelete,
  onDuplicate,
}: {
  filter: SavedFilter;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const conditionCount = useMemo(() => {
    let count = filter.config.conditions.length;
    const countInGroups = (groups: typeof filter.config.groups): number => {
      let total = 0;
      for (const g of groups) {
        total += g.conditions.length;
        total += countInGroups(g.groups);
      }
      return total;
    };
    count += countInGroups(filter.config.groups);
    return count;
  }, [filter.config]);

  return (
    <div
      className={cn(
        'relative rounded-lg border p-3 transition-all cursor-pointer',
        isActive
          ? 'border-cyan-500/50 bg-cyan-500/5'
          : 'border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/50'
      )}
      onClick={onLoad}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Filter size={14} className={isActive ? 'text-cyan-400' : 'text-zinc-400'} />
            <span className={cn('font-medium truncate', isActive ? 'text-cyan-300' : 'text-zinc-200')}>
              {filter.name}
            </span>
            {isActive && (
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                Active
              </span>
            )}
          </div>

          {filter.description && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
              {filter.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
            <span>{conditionCount} condition{conditionCount !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {new Date(filter.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="rounded p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50"
          >
            <MoreHorizontal size={16} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-8 z-10 w-36 rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  <Copy size={12} />
                  Duplicate
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-zinc-700"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/**
 * FilterSaver main component
 */
export function FilterSaver({ className }: { className?: string }) {
  const {
    saveFilter,
    loadFilter,
    deleteFilter,
    duplicateFilter,
    generateShareCode,
    loadFromShareCode,
    clearAll,
  } = useFilterBuilderStore();

  const savedFilters = useFilterBuilderSavedFilters();
  const activeFilterId = useFilterBuilderActiveFilterId();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareCode, setShareCode] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleSave = useCallback(
    (name: string, description?: string) => {
      saveFilter(name, description);
    },
    [saveFilter]
  );

  const handleShare = useCallback(() => {
    const code = generateShareCode();
    setShareCode(code);
    setShowShareDialog(true);
  }, [generateShareCode]);

  const handleExport = useCallback(() => {
    const code = generateShareCode();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filter-config.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [generateShareCode]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const success = loadFromShareCode(text.trim());
      if (!success) {
        alert('Invalid filter configuration file');
      }
    };
    input.click();
  }, [loadFromShareCode]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowSaveDialog(true)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
            'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
          )}
        >
          <Save size={14} />
          Save
        </button>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
            'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
            savedFilters.length > 0 && 'relative'
          )}
        >
          <FolderOpen size={14} />
          Load
          {savedFilters.length > 0 && (
            <span className="ml-1 rounded-full bg-zinc-700 px-1.5 text-xs">
              {savedFilters.length}
            </span>
          )}
        </button>

        <button
          onClick={handleShare}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
            'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          )}
        >
          <Share2 size={14} />
          Share
        </button>

        <div className="h-4 w-px bg-zinc-700" />

        <button
          onClick={handleExport}
          className="rounded p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          title="Export filter"
        >
          <Download size={14} />
        </button>

        <button
          onClick={handleImport}
          className="rounded p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          title="Import filter"
        >
          <Upload size={14} />
        </button>

        <button
          onClick={clearAll}
          className="rounded p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
          title="Clear all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Saved filters list */}
      <AnimatePresence>
        {showFilters && savedFilters.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="text-xs text-zinc-500 px-1">Saved Filters</div>
              {savedFilters.map((filter) => (
                <SavedFilterCard
                  key={filter.id}
                  filter={filter}
                  isActive={filter.id === activeFilterId}
                  onLoad={() => loadFilter(filter.id)}
                  onDelete={() => deleteFilter(filter.id)}
                  onDuplicate={() => duplicateFilter(filter.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {showFilters && savedFilters.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-700 p-4 text-center">
          <p className="text-sm text-zinc-500">No saved filters yet</p>
          <p className="text-xs text-zinc-600 mt-1">
            Create conditions and click Save to store them
          </p>
        </div>
      )}

      {/* Dialogs */}
      <AnimatePresence>
        {showSaveDialog && (
          <SaveFilterDialog
            isOpen={showSaveDialog}
            onClose={() => setShowSaveDialog(false)}
            onSave={handleSave}
          />
        )}
        {showShareDialog && (
          <ShareDialog
            isOpen={showShareDialog}
            onClose={() => setShowShareDialog(false)}
            shareCode={shareCode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact filter actions for toolbar
 */
export function FilterActions({ className }: { className?: string }) {
  const { saveFilter, generateShareCode, clearAll } = useFilterBuilderStore();
  const [showSave, setShowSave] = useState(false);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => setShowSave(true)}
        className="rounded p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800"
        title="Save filter"
      >
        <Save size={16} />
      </button>
      <button
        onClick={() => {
          const code = generateShareCode();
          navigator.clipboard.writeText(code);
        }}
        className="rounded p-1.5 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800"
        title="Copy share link"
      >
        <Link size={16} />
      </button>
      <button
        onClick={clearAll}
        className="rounded p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
        title="Clear all"
      >
        <Trash2 size={16} />
      </button>

      <AnimatePresence>
        {showSave && (
          <SaveFilterDialog
            isOpen={showSave}
            onClose={() => setShowSave(false)}
            onSave={(name, desc) => {
              saveFilter(name, desc);
              setShowSave(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
