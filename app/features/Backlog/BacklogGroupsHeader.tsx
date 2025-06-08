"use client";

import { Search, Maximize2, X, Database, Wifi, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import { useCurrentList } from "@/app/stores/use-list-store";

interface BacklogGroupsHeaderProps {
  totalItems: number;
  matchedItems: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  onClose?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  isConnected?: boolean;
}

const BacklogGroupsHeader = ({
  totalItems,
  matchedItems,
  searchTerm,
  setSearchTerm,
  isExpanded = false,
  onToggleExpanded,
  onClose,
  isLoading = false,
  error = null,
  isConnected = true
}: BacklogGroupsHeaderProps) => {
  const currentList = useCurrentList();

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
          <div className="flex items-center gap-3 mb-1">
            <h2 
              className={`font-black tracking-tight text-white ${
                isExpanded ? 'text-2xl' : 'text-xl'
              }`}
            >
              Collection
            </h2>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                  <Database className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                  <WifiOff className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">Offline</span>
                </div>
              )}
              
              {isLoading && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                  <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-blue-400 font-medium">Syncing</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
            <span>{matchedItems} of {totalItems} used</span>
            {currentList && (
              <>
                <span>•</span>
                <span className="capitalize">{currentList.category}</span>
                {currentList.subcategory && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{currentList.subcategory}</span>
                  </>
                )}
              </>
            )}
            {error && (
              <>
                <span>•</span>
                <span className="text-red-400">Connection error</span>
              </>
            )}
          </div>
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
          placeholder={`Search ${currentList?.category || 'items'}...`}
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

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">
            {error.message || 'Failed to load items from database'}
          </p>
        </div>
      )}
    </div>
  );
};

export default BacklogGroupsHeader;