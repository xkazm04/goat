"use client";

import { BacklogGroup } from "./BacklogGroup";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Maximize2, Minimize2, X, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import BacklogGroupsHeader from "../Backlog/BacklogGroupsHeader";
import { BorderGradient, PatternOverlay } from "@/app/components/decorations/cardDecor";
import { useItemStore } from "@/app/stores/item-store";
import { useBacklogGroups } from "@/app/hooks/use-top-items";
import { useCurrentList } from "@/app/stores/use-list-store";
import React from "react";

interface BacklogGroupsProps {
  className?: string;
}

export function BacklogGroups({ className }: BacklogGroupsProps) {
  const { backlogGroups: storeGroups, setBacklogGroups } = useItemStore();
  const currentList = useCurrentList();
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Fetch dynamic groups from API
  const {
    backlogGroups: apiGroups,
    isLoading,
    error,
    totalItems: apiTotalItems,
  } = useBacklogGroups(
    currentList?.category || 'sports',
    currentList?.subcategory,
    searchTerm
  );

  // Use API groups if available, fallback to store groups
  const backlogGroups = apiGroups.length > 0 ? apiGroups : storeGroups;
  
  // Update store when API groups change
  React.useEffect(() => {
    if (apiGroups.length > 0 && JSON.stringify(apiGroups) !== JSON.stringify(storeGroups)) {
      setBacklogGroups(apiGroups);
    }
  }, [apiGroups, storeGroups, setBacklogGroups]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return backlogGroups;
    
    return backlogGroups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.items.length > 0);
  }, [backlogGroups, searchTerm]);

  const totalItems = backlogGroups.reduce((acc, group) => acc + group.items.length, 0);
  const matchedItems = backlogGroups.reduce((acc, group) => 
    acc + group.items.filter(item => item.matched).length, 0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleExpandedBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  };

  // Loading state
  if (isLoading && backlogGroups.length === 0) {
    return (
      <div className={className}>
        <div 
          className="relative rounded-3xl overflow-hidden h-fit flex flex-col items-center justify-center p-12"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(15, 23, 42, 0.95) 0%,
                rgba(30, 41, 59, 0.98) 50%,
                rgba(51, 65, 85, 0.95) 100%
              )
            `,
            border: '2px solid rgba(71, 85, 105, 0.3)',
            boxShadow: `
              0 4px 6px -1px rgba(0, 0, 0, 0.3),
              0 20px 25px -5px rgba(0, 0, 0, 0.4)
            `
          }}
        >
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Loading Collection</h3>
          <p className="text-sm text-slate-400 text-center">
            Fetching {currentList?.category} items from the database...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && backlogGroups.length === 0) {
    return (
      <div className={className}>
        <div 
          className="relative rounded-3xl overflow-hidden h-fit flex flex-col items-center justify-center p-12"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(15, 23, 42, 0.95) 0%,
                rgba(30, 41, 59, 0.98) 50%,
                rgba(51, 65, 85, 0.95) 100%
              )
            `,
            border: '2px solid rgba(239, 68, 68, 0.3)',
            boxShadow: `
              0 4px 6px -1px rgba(0, 0, 0, 0.3),
              0 20px 25px -5px rgba(0, 0, 0, 0.4)
            `
          }}
        >
          <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load</h3>
          <p className="text-sm text-slate-400 text-center mb-4">
            {error.message || 'Could not fetch items from the database'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg border border-red-500/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Normal sidebar component
  const SidebarContent = ({ isExpandedView = false }: { isExpandedView?: boolean }) => (
    <div 
      className={`relative rounded-3xl overflow-hidden h-fit flex flex-col group ${
        isExpandedView ? 'h-full' : ''
      }`}
      style={{
        background: `
          linear-gradient(135deg, 
            rgba(15, 23, 42, 0.95) 0%,
            rgba(30, 41, 59, 0.98) 25%,
            rgba(51, 65, 85, 0.95) 50%,
            rgba(30, 41, 59, 0.98) 75%,
            rgba(15, 23, 42, 0.95) 100%
          )
        `,
        border: '2px solid transparent',
        backgroundClip: 'padding-box',
        boxShadow: isExpandedView
          ? `
            0 0 0 1px rgba(71, 85, 105, 0.4),
            0 10px 25px -5px rgba(0, 0, 0, 0.5),
            0 25px 50px -12px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(148, 163, 184, 0.1)
          `
          : `
            0 0 0 1px rgba(71, 85, 105, 0.3),
            0 4px 6px -1px rgba(0, 0, 0, 0.3),
            0 20px 25px -5px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(148, 163, 184, 0.1)
          `
      }}
    >
      <BorderGradient />
      <PatternOverlay />

      {/* Header */}
      <div className="relative">
        <BacklogGroupsHeader
          totalItems={totalItems}
          matchedItems={matchedItems}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isExpanded={isExpandedView}
          onToggleExpanded={isExpandedView ? undefined : toggleExpanded}
          onClose={isExpandedView ? () => setIsExpanded(false) : undefined}
        />
      </div>
      
      {/* Groups */}
      <div 
        className={`flex-1 overflow-y-auto p-6 space-y-4 relative ${
          isExpandedView ? 'max-h-full' : ''
        }`}
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(15, 23, 42, 0.7) 0%,
              rgba(30, 41, 59, 0.8) 100%
            )
          `
        }}
      >
        {/* Loading Indicator for Background Updates */}
        {isLoading && backlogGroups.length > 0 && (
          <div className="absolute top-4 right-4 z-20">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400">Updating...</span>
            </div>
          </div>
        )}

        {/* Scroll Fade Effects */}
        <div 
          className="absolute top-0 left-0 right-0 h-6 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(180deg, 
                rgba(30, 41, 59, 0.8) 0%,
                transparent 100%
              )
            `
          }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none z-10"
          style={{
            background: `
              linear-gradient(0deg, 
                rgba(30, 41, 59, 0.8) 0%,
                transparent 100%
              )
            `
          }}
        />

        <div className={`grid gap-4 ${
          isExpandedView 
            ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {filteredGroups.map((group, index) => (
            <motion.div 
              key={group.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: index * (isExpandedView ? 0.05 : 0.08),
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              layout
            >
              <BacklogGroup group={group} />
            </motion.div>
          ))}
        </div>
        
        {/* Empty State */}
        {filteredGroups.length === 0 && searchTerm && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center py-12 relative col-span-full"
          >
            <div 
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center relative"
              style={{
                background: `
                  linear-gradient(135deg, 
                    rgba(71, 85, 105, 0.2) 0%,
                    rgba(100, 116, 139, 0.2) 100%
                  )
                `,
                border: '2px dashed rgba(71, 85, 105, 0.5)'
              }}
            >
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">
              No items found for "{searchTerm}"
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search term
            </p>
          </motion.div>
        )}

        {/* Category Info */}
        {currentList && (
          <div className="text-center py-4 border-t border-slate-600/30">
            <p className="text-xs text-slate-500">
              Showing {currentList.category} {currentList.subcategory && `• ${currentList.subcategory}`}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {totalItems} total items • {apiTotalItems > totalItems ? `${apiTotalItems} in database` : 'All loaded'}
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );

  return (
    <>
      {/* Normal Sidebar View */}
      <div className={className}>
        <SidebarContent />
      </div>

      {/* Expanded Modal View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={handleExpandedBackdropClick}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              className="w-full max-w-7xl h-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent isExpandedView={true} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}