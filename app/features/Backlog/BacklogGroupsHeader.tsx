"use client";

import { Search, Maximize2, X } from "lucide-react";
import { motion } from "framer-motion";

interface BacklogGroupsHeaderProps {
  totalItems: number;
  matchedItems: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onClose?: () => void;
}

const BacklogGroupsHeader = ({
  totalItems,
  matchedItems,
  searchTerm,
  setSearchTerm,
  isExpanded = false,
  onToggleExpanded,
  onClose
}: BacklogGroupsHeaderProps) => {
  return (
    <div 
      className="p-6 border-b relative"
      style={{
        borderColor: 'rgba(71, 85, 105, 0.3)',
        background: `
          linear-gradient(135deg, 
            rgba(30, 41, 59, 0.9) 0%,
            rgba(51, 65, 85, 0.95) 100%
          )
        `
      }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 
            className={`font-black tracking-tight text-white ${
              isExpanded ? 'text-2xl' : 'text-xl'
            }`}
          >
            Collection
          </h2>
          <p 
            className="text-xs font-medium text-slate-400 mt-0.5"
          >
            {matchedItems} of {totalItems} used
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Expand Button (only in normal view) */}
          {!isExpanded && onToggleExpanded && (
            <motion.button
              onClick={onToggleExpanded}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl transition-all duration-200 group"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
              title="Expand collection view"
            >
              <Maximize2 className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
            </motion.button>
          )}

          {/* Close Button (only in expanded view) */}
          {isExpanded && onClose && (
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-xl transition-all duration-200 group"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}
              title="Close expanded view"
            >
              <X className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder={`Search item...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full pl-10 pr-4 py-3 outline-none rounded-xl text-sm transition-all duration-200 ${
            isExpanded ? 'text-base py-4' : ''
          }`}
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(71, 85, 105, 0.4)',
            color: 'white'
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="w-4 h-4 text-slate-400 hover:text-slate-300 transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
};

export default BacklogGroupsHeader;