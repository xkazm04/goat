"use client";

import { motion, AnimatePresence } from 'framer-motion';
import {  ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUserLists, useDeleteList } from '@/app/hooks/use-top-lists';
import { useTempUser } from '@/app/hooks/use-temp-user';
import { useListStore } from '@/app/stores/use-list-store';
import { TopList } from '@/app/types/top-lists';
import { toast } from '@/app/hooks/use-toast';
import UserListItem from './UserListItem';

interface UserListsSectionProps {
  className?: string;
}


export function UserListsSection({ className }: UserListsSectionProps) {
  const router = useRouter();
  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const deleteListMutation = useDeleteList();

  // Fetch user lists
  const { 
    data: userLists = [], 
    isLoading, 
    error,
    refetch
  } = useUserLists(
    tempUserId || '', 
    { limit: 10 },
  );

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteListMutation.mutateAsync(listId);
      toast({
        title: "List Deleted",
        description: "Your list has been successfully deleted.",
      });
      // Refetch lists to update UI
      refetch();
    } catch (error) {
      console.error('Failed to delete list:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the list. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to handle in ListItem component
    }
  };

  const handlePlayList = (list: TopList) => {
    // Set current list in store
    setCurrentList({
      id: list.id,
      title: list.title,
      category: list.category,
      subcategory: list.subcategory,
      user_id: list.user_id || '',
      predefined: list.predefined,
      size: list.size,
      time_period: list.time_period,
      created_at: list.created_at
    });

    // Navigate to match page
    router.push(`/match?list=${list.id}`);
  };

  // Don't render if no user ID or no lists
  if (!isLoaded || !tempUserId || (!isLoading && userLists.length === 0)) {
    return null;
  }

  return (
    <section className={`py-16 px-6 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
            <span className="block mt-2 text-primary">
              made by a legend
            </span>
          </h2>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 bg-slate-800/50 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-red-400 mb-4">Failed to load your lists</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary rounded-lg text-white hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Lists Grid */}
        {!isLoading && !error && userLists.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {userLists.map((list, index) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    transition: { delay: index * 0.1 }
                  }}
                  layout
                >
                  <UserListItem
                    list={list}
                    onDelete={handleDeleteList}
                    onPlay={handlePlayList}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* View All Link (if there are more lists) */}
            {userLists.length >= 10 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center pt-6"
              >
                <button className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-semibold">
                  View All Lists
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
}