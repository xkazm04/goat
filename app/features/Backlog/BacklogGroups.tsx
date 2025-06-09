"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { useItemStore } from "@/app/stores/item-store";
import { useBacklogGroups } from "@/app/hooks/use-top-items";
import { useCurrentList } from "@/app/stores/use-list-store";
import React from "react";
import SidebarContent from "./BacklogGroups/SidebarContent";
import { ErrorState, LoadingState } from "./BacklogGroups/BacklogGroupStates";

interface BacklogGroupsProps {
  className?: string;
}

export function BacklogGroups({ className }: BacklogGroupsProps) {
  const { backlogGroups: storeGroups, setBacklogGroups } = useItemStore();
  const currentList = useCurrentList();
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedViewMode, setExpandedViewMode] = useState<'grid' | 'list'>('list');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      {/* Normal Sidebar View */}
      <div className={className}>
        <SidebarContent
          isExpandedView={false}
          filteredGroups={filteredGroups}
          searchTerm={searchTerm}
          isLoading={isLoading}
          backlogGroups={backlogGroups}
          currentList={currentList}
          totalItems={totalItems}
          apiTotalItems={apiTotalItems}
          expandedViewMode={expandedViewMode}
          isMobile={isMobile}
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
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center ${isMobile ? 'p-2' : 'p-6'
              }`}
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
              className={`w-full h-full ${isMobile
                  ? 'max-w-full max-h-full'
                  : 'max-w-7xl max-h-[95vh]'
                } overflow-hidden`}
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarContent
                isExpandedView={true}
                filteredGroups={filteredGroups}
                searchTerm={searchTerm}
                isLoading={isLoading}
                backlogGroups={backlogGroups}
                currentList={currentList}
                totalItems={totalItems}
                apiTotalItems={apiTotalItems}
                expandedViewMode={expandedViewMode}
                isMobile={isMobile}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}