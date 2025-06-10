"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { useItemStore } from "@/app/stores/item-store";
import { useBacklogGroups } from "@/app/hooks/use-top-items";
import { useCurrentList } from "@/app/stores/use-list-store";
import React from "react";
import SidebarContent from "./BacklogGroups/SidebarContent";
import { ErrorState, LoadingState } from "./BacklogGroups/BacklogGroupStates";
import { BookOpenIcon } from "lucide-react";

interface BacklogGroupsProps {
  className?: string;
}

export function BacklogGroups({ className }: BacklogGroupsProps) {
  const { backlogGroups: storeGroups, setBacklogGroups } = useItemStore();
  const currentList = useCurrentList();
  
  // Separate immediate and debounced search terms
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedViewMode, setExpandedViewMode] = useState<'grid' | 'list'>('list');
  const [isMobile, setIsMobile] = useState(false);

  // Multi-level debouncing for optimal performance
  
  // 1. Client-side search debounce (fast, for immediate UI feedback)
  useEffect(() => {
    const timer = setTimeout(() => {
      setClientSearchTerm(searchTerm);
    }, 150); // Fast client-side filtering

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. API search debounce (slower, for server requests)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // Slower API calls

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch dynamic groups from API with debounced search
  const {
    backlogGroups: apiGroups,
    isLoading,
    error,
    totalItems: apiTotalItems,
  } = useBacklogGroups(
    currentList?.category || 'sports',
    currentList?.subcategory,
    debouncedSearchTerm // Use longer debounce for API
  );

  // Use API groups if available, fallback to store groups
  const backlogGroups = apiGroups.length > 0 ? apiGroups : storeGroups;

  // Update store when API groups change
  React.useEffect(() => {
    if (apiGroups.length > 0 && JSON.stringify(apiGroups) !== JSON.stringify(storeGroups)) {
      setBacklogGroups(apiGroups);
    }
  }, [apiGroups, storeGroups, setBacklogGroups]);

  // Client-side filtering with immediate search term for responsive UI
  const filteredGroups = useMemo(() => {
    if (!clientSearchTerm) return backlogGroups;

    return backlogGroups.map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.title.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
        item.tags?.some(tag => tag.toLowerCase().includes(clientSearchTerm.toLowerCase()))
      )
    })).filter(group => group.items.length > 0);
  }, [backlogGroups, clientSearchTerm]);

  const totalItems = backlogGroups.reduce((acc, group) => acc + group.items.length, 0);

  const handleExpandedBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsExpanded(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isExpanded]);

  // Loading state
  if (isLoading && backlogGroups.length === 0) {
    return (
      <LoadingState 
        currentList={currentList}
        className={className}
      />
    );
  }

  // Error state
  if (error && backlogGroups.length === 0) {
    return (
      <ErrorState className={className} />
    );
  }

  return (
    <>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-2 rounded-xl transition-all duration-200 hover:bg-slate-700/50"
        title="Open backlog collection"
      >
        <BookOpenIcon className="w-5 h-5 text-slate-400 hover:text-slate-300" />
      </button>
      
      {/* Normal Sidebar View */}
      <div className={className}>
        <SidebarContent
          isExpandedView={false}
          filteredGroups={filteredGroups}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isLoading={isLoading}
          backlogGroups={backlogGroups}
          currentList={currentList}
          totalItems={totalItems}
          apiTotalItems={apiTotalItems}
          expandedViewMode={expandedViewMode}
          isMobile={isMobile}
          setIsExpanded={setIsExpanded}
        />
      </div>

      {/* Expanded Modal View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center ${isMobile ? 'p-2' : 'p-6'}`}
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
              className={`w-full h-full ${isMobile ? 'max-w-full max-h-full' : 'max-w-7xl max-h-[95vh]'} overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                isExpandedView={true}
                filteredGroups={filteredGroups}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                isLoading={isLoading}
                backlogGroups={backlogGroups}
                currentList={currentList}
                totalItems={totalItems}
                apiTotalItems={apiTotalItems}
                expandedViewMode={expandedViewMode}
                isMobile={isMobile}
                setIsExpanded={setIsExpanded}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}