import { BorderGradient, PatternOverlay } from "@/app/components/decorations/cardDecor";
import { Loader2, Search } from "lucide-react";
import { BacklogGroup } from "../BacklogGroup";
import { motion } from "framer-motion";

type Props = {
    isExpandedView: boolean;
    filteredGroups: any[]; // Replace with actual type
    searchTerm: string;
    isLoading: boolean;
    backlogGroups: any[]; // Replace with actual type
    currentList: { category: string; subcategory?: string } | null;
    totalItems: number;
    apiTotalItems: number;
    expandedViewMode: 'grid' | 'list';
    isMobile: boolean;
}


  const SidebarContent = ({ isExpandedView, filteredGroups, searchTerm, isLoading, backlogGroups, currentList, totalItems, apiTotalItems, expandedViewMode, isMobile }: Props) => {
    return <div 
      className={`relative rounded-3xl overflow-hidden h-fit flex flex-col group ${
        isExpandedView ? 'h-full max-h-screen' : ''
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
      <div className="relative flex-shrink-0">
        TBD header
        
        {/* View Mode Toggle - Only in expanded view */}
        {isExpandedView && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2">
              
              {/* Stats in expanded view */}
              <div className="flex-1" />
              <div className="text-xs text-slate-400">
                {filteredGroups.length} 
              </div>
            </div>
          </div>
        )}
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
          `,
          // Custom scrollbar for webkit browsers
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(71, 85, 105, 0.5) transparent'
        }}
      >
        {/* Loading Indicator for Background Updates */}
        {isLoading && backlogGroups.length > 0 && (
          <div className="absolute top-4 right-4 z-20">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg backdrop-blur-sm">
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

        {/* Groups Grid */}
        <div className={`grid gap-4 ${
          isExpandedView 
            ? expandedViewMode === 'grid'
              ? isMobile 
                ? 'grid-cols-1' 
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
              : 'grid-cols-1'
            : 'grid-cols-1'
        }`}>
          {filteredGroups.map((group, index) => (
            <motion.div 
              key={group.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: index * (isExpandedView ? 0.03 : 0.08),
                type: "spring",
                stiffness: 300,
                damping: 20
              }}
              layout
            >
              <BacklogGroup 
                group={group} 
                isExpandedView={isExpandedView}
              />
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
          <div className="text-center py-4 border-t border-slate-600/30 mt-8">
            <p className="text-xs text-slate-500">
              Showing {currentList.category} {currentList.subcategory && `• ${currentList.subcategory}`}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {totalItems} total items • {apiTotalItems > totalItems ? `${apiTotalItems} in database` : 'All loaded'}
            </p>
          </div>
        )}
      </div>

      {/* Custom CSS for scrollbar */}
      <style jsx>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.5);
          border-radius: 3px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.7);
        }
      `}</style>
    </div>
}
export default SidebarContent;