'use client';

/**
 * SearchAutocomplete
 *
 * Smart search input with autocomplete suggestions from:
 * - Search history
 * - Item titles from the search index
 * - Query templates
 * - Smart query suggestions
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  ChevronRight,
  Tag,
  Loader2,
  Hash,
} from 'lucide-react';
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  KeyboardEvent,
} from 'react';

import { GoatSearch, GoatSparkles, GoatFilter } from '@/components/visual/GoatIcons';
import { cn } from '@/lib/utils';

import {
  useFilterIntegrationOptional,
  type FilterableItem,
} from '../CollectionFilterIntegration';
import { FILTER_TIMING } from '../constants';
import { useLiveSearchCounts } from '../hooks/useLiveSearchCounts';
import { QUERY_TEMPLATES } from '../SmartQueryParser';

/**
 * Suggestion item with type indicator
 */
interface AutocompleteSuggestion {
  id: string;
  text: string;
  description?: string;
  type: 'history' | 'suggestion' | 'template' | 'item';
  icon?: React.ReactNode;
}

/**
 * Props for SearchAutocomplete
 */
interface SearchAutocompleteProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showHistory?: boolean;
  showTemplates?: boolean;
  showSuggestions?: boolean;
  showLiveCounts?: boolean;
  autoFocus?: boolean;
  maxSuggestions?: number;
  debounceMs?: number;
  items?: FilterableItem[];
}

/**
 * Type icons
 */
const TYPE_ICONS: Record<AutocompleteSuggestion['type'], React.ReactNode> = {
  history: <Clock size={14} className="text-muted-foreground" />,
  suggestion: <GoatSparkles size={14} className="text-primary" />,
  template: <GoatFilter size={14} className="text-purple-400" />,
  item: <Tag size={14} className="text-emerald-400" />,
};

/**
 * SearchAutocomplete component
 */
export function SearchAutocomplete({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'Search or filter (e.g., "rating > 4", "action movies")...',
  className,
  inputClassName,
  showHistory = true,
  showTemplates = true,
  showSuggestions = true,
  showLiveCounts = true,
  autoFocus = false,
  maxSuggestions = 8,
  debounceMs = 150,
  items: propItems,
}: SearchAutocompleteProps) {
  // Try to get context (optional - works without provider too)
  const context = useFilterIntegrationOptional();

  // Items for live count - from prop or context
  const liveCountItems = propItems || (context?.filteredItems as FilterableItem[]) || [];

  // Local state for uncontrolled mode
  const [localValue, setLocalValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Determine value (controlled vs uncontrolled)
  const isControlled = controlledValue !== undefined;
  const inputValue = isControlled ? controlledValue : localValue;

  // Live search counts
  const liveCounts = useLiveSearchCounts(inputValue, {
    items: liveCountItems,
    debounceMs: Math.max(50, debounceMs - 50), // Slightly faster than suggestion updates
    facetFields: ['category', 'subcategory'],
    maxFacetValues: 3,
  });

  // Update suggestions based on input
  const updateSuggestions = useCallback(
    (query: string) => {
      const newSuggestions: AutocompleteSuggestion[] = [];

      if (!query.trim()) {
        // Show history and templates when empty
        if (showHistory && context) {
          const historySuggestions = context
            .getHistorySuggestions('')
            .slice(0, 3)
            .map((text, i) => ({
              id: `history-${i}`,
              text,
              type: 'history' as const,
              description: 'Recent search',
            }));
          newSuggestions.push(...historySuggestions);
        }

        if (showTemplates) {
          const templateSuggestions = QUERY_TEMPLATES.slice(0, 3).map((t, i) => ({
            id: `template-${i}`,
            text: t.text,
            description: t.description,
            type: 'template' as const,
          }));
          newSuggestions.push(...templateSuggestions);
        }
      } else {
        // Show matching history
        if (showHistory && context) {
          const historySuggestions = context
            .getHistorySuggestions(query)
            .slice(0, 2)
            .map((text, i) => ({
              id: `history-${i}`,
              text,
              type: 'history' as const,
              description: 'Recent search',
            }));
          newSuggestions.push(...historySuggestions);
        }

        // Show smart query suggestions
        if (showSuggestions && context) {
          const smartSuggestions = context.getSuggestions(query).map((s, i) => ({
            id: `smart-${i}`,
            text: s.text,
            description: s.description,
            type: (s.type === 'template' ? 'template' : 'suggestion') as AutocompleteSuggestion['type'],
          }));
          newSuggestions.push(...smartSuggestions);
        }

        // Show matching item titles
        if (context) {
          const itemSuggestions = context
            .getSearchSuggestions(query)
            .slice(0, 3)
            .map((text, i) => ({
              id: `item-${i}`,
              text,
              type: 'item' as const,
              description: 'Item title',
            }));
          newSuggestions.push(...itemSuggestions);
        }

        // Show matching templates
        if (showTemplates) {
          const matchingTemplates = QUERY_TEMPLATES.filter(
            (t) =>
              t.text.toLowerCase().includes(query.toLowerCase()) ||
              t.description.toLowerCase().includes(query.toLowerCase())
          )
            .slice(0, 2)
            .map((t, i) => ({
              id: `template-match-${i}`,
              text: t.text,
              description: t.description,
              type: 'template' as const,
            }));
          newSuggestions.push(...matchingTemplates);
        }
      }

      // Deduplicate by text
      const seen = new Set<string>();
      const deduped = newSuggestions.filter((s) => {
        const key = s.text.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setSuggestions(deduped.slice(0, maxSuggestions));
      setSelectedIndex(-1);
    },
    [context, showHistory, showTemplates, showSuggestions, maxSuggestions]
  );

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (!isControlled) {
        setLocalValue(newValue);
      }
      onChange?.(newValue);

      // Debounce suggestion updates
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        updateSuggestions(newValue);
      }, debounceMs);

      setIsOpen(true);
    },
    [isControlled, onChange, updateSuggestions, debounceMs]
  );

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      const newValue = suggestion.text;

      if (!isControlled) {
        setLocalValue(newValue);
      }
      onChange?.(newValue);
      onSearch?.(newValue);

      // Add to history if we have context
      if (context) {
        context.addToHistory(newValue, context.filteredItems.length);
      }

      setIsOpen(false);
      inputRef.current?.focus();
    },
    [isControlled, onChange, onSearch, context]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;

        case 'Enter':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            handleSelectSuggestion(suggestions[selectedIndex]);
          } else if (inputValue.trim()) {
            onSearch?.(inputValue);
            if (context) {
              context.addToHistory(inputValue, context.filteredItems.length);
            }
            setIsOpen(false);
          }
          break;

        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          break;

        case 'Tab':
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            handleSelectSuggestion(suggestions[selectedIndex]);
          }
          break;
      }
    },
    [suggestions, selectedIndex, inputValue, onSearch, context, handleSelectSuggestion]
  );

  // Handle clear
  const handleClear = useCallback(() => {
    if (!isControlled) {
      setLocalValue('');
    }
    onChange?.('');
    if (context) {
      context.clearSearch();
    }
    setSuggestions([]);
    inputRef.current?.focus();
  }, [isControlled, onChange, context]);

  // Handle focus
  const handleFocus = useCallback(() => {
    updateSuggestions(inputValue);
    setIsOpen(true);
  }, [inputValue, updateSuggestions]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div className="relative">
        <GoatSearch
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-control border border-border bg-muted/50 py-2.5 pl-10 pr-10',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary',
            'transition-all',
            inputClassName
          )}
        />
        {/* Live count badge */}
        {showLiveCounts && inputValue.trim() && (
          <AnimatePresence mode="wait">
            <motion.span
              key={liveCounts.isCalculating ? 'calc' : liveCounts.totalMatches}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.1 }}
              className={cn(
                'absolute right-10 top-1/2 -translate-y-1/2',
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                liveCounts.isCalculating
                  ? 'text-muted-foreground'
                  : liveCounts.totalMatches === 0
                  ? 'text-red-400 bg-red-500/10'
                  : 'text-primary bg-primary/10'
              )}
            >
              {liveCounts.isCalculating ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <>
                  <span>{liveCounts.totalMatches}</span>
                  <span className="text-muted-foreground">/ {liveCounts.totalItems}</span>
                </>
              )}
            </motion.span>
          </AnimatePresence>
        )}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Live facet counts below search */}
      {showLiveCounts && inputValue.trim() && !liveCounts.isCalculating && (
        <LiveFacetCounts counts={liveCounts} />
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: FILTER_TIMING.fast }}
            className={cn(
              'absolute left-0 right-0 top-full z-dropdown mt-1',
              'rounded-card border border-border bg-background shadow-xl'
            )}
          >
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.id}>
                  <button
                    onClick={() => handleSelectSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left',
                      'transition-colors',
                      index === selectedIndex
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground filter-hover'
                    )}
                  >
                    {TYPE_ICONS[suggestion.type]}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{suggestion.text}</p>
                      {suggestion.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {suggestion.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      size={14}
                      className={cn(
                        'shrink-0 transition-opacity',
                        index === selectedIndex ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>

            {/* Keyboard hint */}
            <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded bg-muted px-1">↑</kbd>
                <kbd className="rounded bg-muted px-1">↓</kbd>
                navigate
              </span>
              <span className="ml-3 inline-flex items-center gap-1">
                <kbd className="rounded bg-muted px-1">↵</kbd>
                select
              </span>
              <span className="ml-3 inline-flex items-center gap-1">
                <kbd className="rounded bg-muted px-1">esc</kbd>
                close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact search input without autocomplete
 */
export function CompactSearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Search...',
  className,
}: {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [localValue, setLocalValue] = useState('');
  const inputValue = value !== undefined ? value : localValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (value === undefined) {
      setLocalValue(newValue);
    }
    onChange?.(newValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onSearch?.(inputValue);
    }
  };

  const handleClear = () => {
    if (value === undefined) {
      setLocalValue('');
    }
    onChange?.('');
  };

  return (
    <div className={cn('relative', className)}>
      <GoatSearch
        size={16}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-control border border-border bg-muted/50 py-1.5 pl-8 pr-8',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:border-primary focus:outline-hidden'
        )}
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * LiveFacetCounts - shows per-category counts below search
 */
function LiveFacetCounts({
  counts,
}: {
  counts: ReturnType<typeof useLiveSearchCounts>;
}) {
  const hasFacets = Object.values(counts.facetCounts).some((f) => f.length > 0);
  if (!hasFacets) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: FILTER_TIMING.fast }}
      className="flex flex-wrap items-center gap-1.5 px-1 pt-1"
    >
      {Object.entries(counts.facetCounts).map(([field, facets]) =>
        facets.map((facet) => (
          <span
            key={`${field}-${facet.value}`}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs bg-muted/50 text-muted-foreground"
          >
            <Hash size={8} className="text-muted-foreground" />
            <span className="text-muted-foreground">{facet.value}</span>
            <span className="text-primary/70">{facet.count}</span>
          </span>
        ))
      )}
    </motion.div>
  );
}
