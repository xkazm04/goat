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

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  KeyboardEvent,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Filter,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFilterIntegrationOptional,
  type FilterIntegrationContextValue,
} from '../CollectionFilterIntegration';
import { QUERY_TEMPLATES, type QuerySuggestion } from '../SmartQueryParser';

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
  autoFocus?: boolean;
  maxSuggestions?: number;
  debounceMs?: number;
}

/**
 * Type icons
 */
const TYPE_ICONS: Record<AutocompleteSuggestion['type'], React.ReactNode> = {
  history: <Clock size={14} className="text-zinc-500" />,
  suggestion: <Sparkles size={14} className="text-cyan-400" />,
  template: <Filter size={14} className="text-purple-400" />,
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
  autoFocus = false,
  maxSuggestions = 8,
  debounceMs = 150,
}: SearchAutocompleteProps) {
  // Try to get context (optional - works without provider too)
  const context = useFilterIntegrationOptional();

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
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
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
            'w-full rounded-lg border border-zinc-700 bg-zinc-800/50 py-2.5 pl-10 pr-10',
            'text-sm text-zinc-200 placeholder-zinc-500',
            'focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500',
            'transition-all',
            inputClassName
          )}
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute left-0 right-0 top-full z-50 mt-1',
              'rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl'
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
                        ? 'bg-cyan-500/10 text-cyan-300'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    )}
                  >
                    {TYPE_ICONS[suggestion.type]}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{suggestion.text}</p>
                      {suggestion.description && (
                        <p className="truncate text-xs text-zinc-500">
                          {suggestion.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      size={14}
                      className={cn(
                        'flex-shrink-0 transition-opacity',
                        index === selectedIndex ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>

            {/* Keyboard hint */}
            <div className="border-t border-zinc-800 px-3 py-1.5 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded bg-zinc-800 px-1">↑</kbd>
                <kbd className="rounded bg-zinc-800 px-1">↓</kbd>
                navigate
              </span>
              <span className="ml-3 inline-flex items-center gap-1">
                <kbd className="rounded bg-zinc-800 px-1">↵</kbd>
                select
              </span>
              <span className="ml-3 inline-flex items-center gap-1">
                <kbd className="rounded bg-zinc-800 px-1">esc</kbd>
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
      <Search
        size={16}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
      />
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-md border border-zinc-700 bg-zinc-800/50 py-1.5 pl-8 pr-8',
          'text-sm text-zinc-200 placeholder-zinc-500',
          'focus:border-cyan-500 focus:outline-none'
        )}
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
