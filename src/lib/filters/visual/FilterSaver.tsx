'use client';

/**
 * FilterSaver
 * Component for saving, loading, and sharing filter configurations
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Share2,
  Copy,
  Check,
  Trash2,
  Download,
  Upload,
  X,
  Clock,
  MoreHorizontal,
  Link,
} from 'lucide-react';
import { GoatSave, GoatFilter } from '@/components/visual/GoatIcons';
import { cn } from '@/lib/utils';
import {
  useFilterBuilderStore,
  useFilterBuilderSavedFilters,
  useFilterBuilderActiveFilterId,
  type SavedFilter,
} from '@/stores/filter-builder-store';
import { GoatBookmark } from '@/components/illustrations/EmptyStateIllustrations';
import { FILTER_TIMING } from '../constants';

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
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md rounded-card border border-border bg-background p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground font-grotesk">Save Filter</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Filter Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Filter"
              className={cn(
                'w-full rounded-control border border-border bg-muted px-3 py-2 text-sm',
                'text-foreground placeholder:text-muted-foreground',
                'focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary'
              )}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this filter does..."
              rows={3}
              className={cn(
                'w-full rounded-control border border-border bg-muted px-3 py-2 text-sm',
                'text-foreground placeholder:text-muted-foreground resize-none',
                'focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary'
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className={cn(
              'rounded-control px-4 py-2 text-sm font-medium',
              'text-muted-foreground hover:text-foreground'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className={cn(
              'flex items-center gap-2 rounded-control px-4 py-2 text-sm font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/80',
              'disabled:filter-disabled'
            )}
          >
            <GoatSave size={16} />
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
    <div className="fixed inset-0 z-modal flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md rounded-card border border-border bg-background p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground font-grotesk">Share Filter</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Share this URL to let others use your filter configuration
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className={cn(
              'flex-1 rounded-control border border-border bg-muted px-3 py-2 text-sm',
              'text-foreground font-mono truncate'
            )}
          />
          <button
            onClick={handleCopy}
            className={cn(
              'flex items-center gap-2 rounded-control px-4 py-2 text-sm font-medium',
              'bg-primary text-primary-foreground hover:bg-primary/80',
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

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
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
        'relative rounded-card border p-3 transition-all cursor-pointer',
        isActive
          ? 'border-primary/50 bg-primary/5'
          : 'border-border/50 bg-muted/30 hover:bg-muted/50'
      )}
      onClick={onLoad}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <GoatFilter size={14} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
            <span className={cn('font-medium truncate', isActive ? 'text-primary' : 'text-foreground')}>
              {filter.name}
            </span>
            {isActive && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                Active
              </span>
            )}
          </div>

          {filter.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {filter.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
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
            className="rounded p-1 text-muted-foreground hover:text-foreground filter-hover"
          >
            <MoreHorizontal size={16} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-8 z-10 w-36 rounded-card border border-border bg-muted py-1 shadow-lg"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground filter-hover"
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
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 filter-hover"
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
            'flex items-center gap-2 rounded-control px-3 py-1.5 text-sm',
            'bg-primary/10 text-primary hover:bg-primary/20'
          )}
        >
          <GoatSave size={14} />
          Save
        </button>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 rounded-control px-3 py-1.5 text-sm',
            'bg-muted text-foreground filter-hover',
            savedFilters.length > 0 && 'relative'
          )}
        >
          <FolderOpen size={14} />
          Load
          {savedFilters.length > 0 && (
            <span className="ml-1 rounded-badge bg-muted px-1.5 text-xs">
              {savedFilters.length}
            </span>
          )}
        </button>

        <button
          onClick={handleShare}
          className={cn(
            'flex items-center gap-2 rounded-control px-3 py-1.5 text-sm',
            'bg-muted text-foreground filter-hover'
          )}
        >
          <Share2 size={14} />
          Share
        </button>

        <div className="h-4 w-px bg-border" />

        <button
          onClick={handleExport}
          className="rounded p-1.5 text-muted-foreground hover:text-foreground filter-hover"
          title="Export filter"
        >
          <Download size={14} />
        </button>

        <button
          onClick={handleImport}
          className="rounded p-1.5 text-muted-foreground hover:text-foreground filter-hover"
          title="Import filter"
        >
          <Upload size={14} />
        </button>

        <button
          onClick={clearAll}
          className="rounded p-1.5 text-muted-foreground hover:text-red-400 filter-hover"
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
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground px-1 font-grotesk">Saved Filters</div>
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
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-gradient-to-br from-primary/[0.04] to-purple-500/[0.04] p-6">
          <GoatBookmark width={100} height={80} />
          <p className="text-sm text-muted-foreground mt-2">No saved filters yet</p>
          <p className="text-xs text-muted-foreground mt-1">
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
        className="rounded p-1.5 text-muted-foreground hover:text-primary filter-hover"
        title="Save filter"
      >
        <GoatSave size={16} />
      </button>
      <button
        onClick={() => {
          const code = generateShareCode();
          navigator.clipboard.writeText(code);
        }}
        className="rounded p-1.5 text-muted-foreground hover:text-primary filter-hover"
        title="Copy share link"
      >
        <Link size={16} />
      </button>
      <button
        onClick={clearAll}
        className="rounded p-1.5 text-muted-foreground hover:text-red-400 filter-hover"
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
