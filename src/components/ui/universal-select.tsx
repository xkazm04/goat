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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  // Focus search on open
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, showSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  }, [isOpen]);

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
          'w-full flex items-center justify-between gap-2 rounded-lg border transition-all',
          'bg-gray-900/80 border-gray-700/50 text-gray-200',
          'hover:bg-gray-800/80 hover:border-gray-600/50',
          isOpen && 'border-gray-500/50 ring-1 ring-gray-500/20',
          disabled && 'opacity-50 cursor-not-allowed',
          sizeStyles.trigger
        )}
      >
        {selectedOption ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedOption.icon && <span className="flex-shrink-0">{selectedOption.icon}</span>}
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
              className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-xl overflow-hidden bg-gray-900 border-gray-700/50"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {showSearch && (
                <div className="p-2 border-b border-gray-800/50">
                  <div className="relative">
                    <Search className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500', sizeStyles.icon)} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={searchPlaceholder}
                      className={cn(
                        'w-full pl-8 pr-3 rounded-md border transition-all outline-none',
                        'bg-gray-800/50 border-gray-700/50 text-gray-200 placeholder-gray-500',
                        'focus:border-gray-600/50',
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
                  filteredOptions.map((option) => {
                    const isSelected = option.value === value;
                    const isDisabled = option.disabled;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => !isDisabled && handleSelect(option.value)}
                        disabled={isDisabled}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 transition-colors',
                          'text-gray-200 hover:bg-gray-800/50',
                          isSelected && 'bg-gray-800/30',
                          isDisabled && 'opacity-50 cursor-not-allowed',
                          sizeStyles.option
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                          <span className="truncate">{option.label}</span>
                        </div>
                        {isSelected && <Check className={cn(sizeStyles.icon, 'flex-shrink-0 text-cyan-400')} />}
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
