'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface UniversalSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
  searchable?: boolean;
  searchPlaceholder?: string;
}

const SIZE_STYLES = {
  sm: {
    trigger: 'px-2.5 py-1.5 text-xs min-h-[32px]',
    option: 'px-2.5 py-1.5 text-xs',
    search: 'px-2.5 py-1.5 text-xs',
    icon: 'w-3.5 h-3.5',
  },
  md: {
    trigger: 'px-3 py-2.5 text-sm min-h-[42px]',
    option: 'px-3 py-2 text-sm',
    search: 'px-3 py-2 text-sm',
    icon: 'w-4 h-4',
  },
};

export function UniversalSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  label,
  disabled = false,
  className = '',
  size = 'md',
  searchable,
  searchPlaceholder = 'Search...',
}: UniversalSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sizeStyles = SIZE_STYLES[size];

  // Auto-enable search for 5+ options
  const showSearch = searchable ?? options.length >= 5;

  // Filter options
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const selectedOption = options.find(opt => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search on open and reset highlight
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      if (showSearch && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, showSearch]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      return;
    }

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const enabledIndices = filteredOptions
      .map((opt, i) => (!opt.disabled ? i : -1))
      .filter(i => i !== -1);

    if (enabledIndices.length === 0) return;

    const scrollToIndex = (index: number) => {
      optionRefs.current[index]?.scrollIntoView({ block: 'nearest' });
    };

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentPos = enabledIndices.indexOf(highlightedIndex);
      const nextIndex = currentPos < enabledIndices.length - 1
        ? enabledIndices[currentPos + 1]
        : enabledIndices[0];
      setHighlightedIndex(nextIndex);
      scrollToIndex(nextIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentPos = enabledIndices.indexOf(highlightedIndex);
      const prevIndex = currentPos > 0
        ? enabledIndices[currentPos - 1]
        : enabledIndices[enabledIndices.length - 1];
      setHighlightedIndex(prevIndex);
      scrollToIndex(prevIndex);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = enabledIndices[0];
      setHighlightedIndex(first);
      scrollToIndex(first);
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = enabledIndices[enabledIndices.length - 1];
      setHighlightedIndex(last);
      scrollToIndex(last);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const option = filteredOptions[highlightedIndex];
        if (!option.disabled) {
          handleSelect(option.value);
        }
      }
    }
  }, [isOpen, filteredOptions, highlightedIndex]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (isOpen) setSearchQuery('');
    }
  };

  return (
    <div className={cn('relative', className)} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label className="block mb-1.5 text-xs font-medium text-gray-400">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between gap-2 rounded-lg border transition-all focus-ring',
          'bg-[var(--surface-deep)]/80 border-[var(--border-card-subtle)] text-gray-200',
          'hover:bg-[var(--surface-card)]/80 hover:border-[var(--border-card-hover)]',
          isOpen && 'border-[var(--border-card-hover)] ring-1 ring-[var(--border-card-hover)]',
          disabled && 'opacity-50 cursor-not-allowed',
          sizeStyles.trigger
        )}
      >
        {selectedOption ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
            <span className="truncate">{selectedOption.label}</span>
          </div>
        ) : (
          <span className="truncate text-gray-500">{placeholder}</span>
        )}

        <ChevronDown
          className={cn(
            sizeStyles.icon,
            'transition-transform text-gray-500',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearchQuery(''); }} />

            <motion.div
              className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-xl overflow-hidden bg-[var(--surface-deep)] border-[var(--border-card-subtle)]"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {showSearch && (
                <div className="p-2 border-b border-[var(--border-card-subtle)]">
                  <div className="relative">
                    <Search className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500', sizeStyles.icon)} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      className={cn(
                        'w-full pl-8 pr-3 rounded-md border transition-all outline-hidden',
                        'bg-[var(--surface-overlay)] border-[var(--border-card-subtle)] text-gray-200 placeholder-gray-500',
                        'focus:border-[var(--border-card-hover)]',
                        sizeStyles.search
                      )}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="max-h-60 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-4 text-center text-gray-500 text-sm">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((option, index) => {
                    const isSelected = option.value === value;
                    const isDisabled = option.disabled;
                    const isHighlighted = index === highlightedIndex;

                    return (
                      <button
                        key={option.value}
                        ref={(el) => { optionRefs.current[index] = el; }}
                        type="button"
                        onClick={() => !isDisabled && handleSelect(option.value)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        disabled={isDisabled}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 transition-colors',
                          'text-gray-200 hover:bg-[var(--surface-overlay)]',
                          isSelected && 'bg-[var(--surface-card)]/30',
                          isHighlighted && 'bg-cyan-500/15 border-l-2 border-cyan-400',
                          !isHighlighted && 'border-l-2 border-transparent',
                          isDisabled && 'opacity-50 cursor-not-allowed',
                          sizeStyles.option
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {option.icon && <span className="shrink-0">{option.icon}</span>}
                          <span className="truncate">{option.label}</span>
                        </div>
                        {isSelected && <Check className={cn(sizeStyles.icon, 'shrink-0 text-brand-hover')} />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UniversalSelect;
