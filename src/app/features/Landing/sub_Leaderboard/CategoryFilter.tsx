"use client";

import { motion } from 'framer-motion';
import { Filter, X, Sparkles } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const CATEGORIES = [
  { id: 'movies', label: 'Movies', emoji: '🎬' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'games', label: 'Games', emoji: '🎮' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'books', label: 'Books', emoji: '📚' },
  { id: 'food', label: 'Food', emoji: '🍕' },
  { id: 'travel', label: 'Travel', emoji: '✈️' },
  { id: 'tech', label: 'Technology', emoji: '💻' },
];

const pillStyle = {
  base: {
    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  active: {
    background: "linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(59,130,246,0.15) 100%)",
    border: "1px solid rgba(6,182,212,0.4)",
    boxShadow: "0 0 20px rgba(6,182,212,0.2)",
  },
};

export function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Label */}
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
        }}
      >
        <Filter className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-gray-400">Category</span>
      </div>

      {/* All button */}
      <motion.button
        onClick={() => onSelectCategory(null)}
        className="relative px-4 py-2 text-sm font-medium rounded-xl transition-all overflow-hidden"
        style={selectedCategory === null ? pillStyle.active : pillStyle.base}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        data-testid="category-filter-all"
      >
        <span className={`relative z-10 ${selectedCategory === null ? 'text-cyan-300' : 'text-gray-400'}`}>
          All
        </span>
        {selectedCategory === null && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          />
        )}
      </motion.button>

      {/* Category pills */}
      {CATEGORIES.map((category, index) => (
        <motion.button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className="relative px-4 py-2 text-sm font-medium rounded-xl transition-all overflow-hidden"
          style={selectedCategory === category.id ? pillStyle.active : pillStyle.base}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          data-testid={`category-filter-${category.id}`}
        >
          <span 
            className={`relative z-10 flex items-center gap-1.5 ${
              selectedCategory === category.id ? 'text-cyan-300' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="text-xs">{category.emoji}</span>
            {category.label}
          </span>
          
          {/* Active shimmer */}
          {selectedCategory === category.id && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
          )}
        </motion.button>
      ))}

      {/* Clear button */}
      {selectedCategory && (
        <motion.button
          onClick={() => onSelectCategory(null)}
          className="p-2 rounded-xl text-gray-400 hover:text-red-400 transition-colors"
          style={pillStyle.base}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1, background: "rgba(239,68,68,0.1)" }}
          whileTap={{ scale: 0.9 }}
          title="Clear filter"
          data-testid="category-filter-clear"
        >
          <X className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
