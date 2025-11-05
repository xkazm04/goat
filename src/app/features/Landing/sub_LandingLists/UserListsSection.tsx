"use client";

import { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUserLists, useDeleteList } from '@/hooks/use-top-lists';
import { useTempUser } from '@/hooks/use-temp-user';
import { useListStore } from '@/stores/use-list-store';
import { TopList } from '@/types/top-lists';
import { toast } from '@/hooks/use-toast';
import UserListItem from './UserListItem';
import { CompositionModal } from '../CompositionModal';

interface UserListsSectionProps {
  className?: string;
}

export function UserListsSection({ className }: UserListsSectionProps) {
  const router = useRouter();
  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const deleteListMutation = useDeleteList();
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleCreateList = () => {
    setIsModalOpen(true);
  };

  // Don't render if no user ID or no lists
  if (!isLoaded || !tempUserId) {
    return null;
  }

  // Show create button even if no lists exist
  const hasLists = userLists.length > 0;

  return (
    <>
      <section className={`relative py-16 px-6 ${className}`}>
        {/* Background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />

        {/* Fine grid lines */}
        <div
          className="absolute inset-0 -z-10 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        <div className="max-w-6xl mx-auto relative">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
                <User className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">My Rankings</h2>
                <p className="text-xs text-gray-400 mt-0.5">Your personal ranking lists</p>
              </div>
            </div>

            {/* Create New List Button */}
            <motion.button
              onClick={handleCreateList}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New</span>
            </motion.button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-800/40 border border-gray-700/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-gray-800/40 border border-gray-700/50 rounded-lg"
            >
              <p className="text-red-400 mb-4 text-sm">Failed to load your lists</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-xs transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {/* Empty State */}
          {!isLoading && !error && !hasLists && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 bg-gray-800/40 border border-gray-700/50 rounded-lg"
            >
              <User className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No Lists Yet</h3>
              <p className="text-sm text-gray-500 mb-6">Create your first ranking list to get started!</p>
              <motion.button
                onClick={handleCreateList}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 mx-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First List</span>
              </motion.button>
            </motion.div>
          )}

          {/* Lists Grid */}
          {!isLoading && !error && hasLists && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {userLists.map((list, index) => (
                  <motion.div
                    key={list.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      transition: { delay: index * 0.05 }
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
            </motion.div>
          )}
        </div>
      </section>

      {/* Composition Modal */}
      <CompositionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(result) => {
          console.log("List creation result:", result);
          if (result.success) {
            console.log(`Successfully created list: ${result.listId}`);
            // Refetch lists to show the new one
            refetch();
          }
        }}
      />
    </>
  );
}