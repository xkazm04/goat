"use client";

import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

interface BacklogHeaderSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder?: string;
  isExpanded?: boolean;
  debounceMs?: number;
}

export function BacklogHeaderSearch({
  searchTerm,
  setSearchTerm,
  placeholder = "Search items...",
  isExpanded = false,
  debounceMs = 2000
}: BacklogHeaderSearchProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const debounceRef = useRef<NodeJS.Timeout>(null);

  // Update local term when external term changes (for external resets)
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [localSearchTerm, setSearchTerm, debounceMs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(e.target.value);
  };

  const handleClearSearch = () => {
    setLocalSearchTerm('');
    setSearchTerm(''); 
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className={`w-4 h-4 transition-colors duration-200 ${
          searchFocused ? 'text-blue-400' : 'text-slate-400'
        }`} />
      </div>
      
      <motion.input
        type="text"
        placeholder={placeholder}
        value={localSearchTerm}
        onChange={handleInputChange}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        className={`w-full pl-10 pr-12 py-3 outline-none rounded-xl text-sm transition-all duration-200 ${
          isExpanded ? 'text-base py-4' : ''
        }`}
        style={{
          background: searchFocused 
            ? 'rgba(15, 23, 42, 0.9)' 
            : 'rgba(15, 23, 42, 0.7)',
          border: searchFocused 
            ? '1px solid rgba(59, 130, 246, 0.5)' 
            : '1px solid rgba(71, 85, 105, 0.4)',
          color: 'white',
          boxShadow: searchFocused 
            ? '0 0 0 3px rgba(59, 130, 246, 0.1)' 
            : 'none'
        }}
        animate={{
          scale: searchFocused ? 1.01 : 1
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Clear Search Button */}
      <AnimatePresence>
        {localSearchTerm && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center group"
          >
            <div className="p-1 rounded-full transition-colors group-hover:bg-slate-600/30">
              <X className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}