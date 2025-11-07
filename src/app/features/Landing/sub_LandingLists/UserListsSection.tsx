"use client";

import { motion } from 'framer-motion';
import { Plus, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUserLists, useDeleteList } from '@/hooks/use-top-lists';
import { useTempUser } from '@/hooks/use-temp-user';
import { useListStore } from '@/stores/use-list-store';
import { TopList } from '@/types/top-lists';
import { toast } from '@/hooks/use-toast';
import UserListItem from './UserListItem';
import { ListGrid, DefaultEmptyState } from '@/components/ui/list-grid';
import { useComposition } from '@/hooks/use-composition';

interface UserListsSectionProps {
  className?: string;
}

export function UserListsSection({ className }: UserListsSectionProps) {
  const router = useRouter();
  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const deleteListMutation = useDeleteList();
  const { openComposition } = useComposition();

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

    // Navigate to match-test page
    router.push(`/match-test?list=${list.id}`);
  };

  const handleCreateList = () => {
    openComposition();
  };

  // Don't render if no user ID or no lists
  if (!isLoaded || !tempUserId) {
    return null;
  }

  // Show create button even if no lists exist
  const hasLists = userLists.length > 0;

  return (
    <section className={`relative py-16 px-6 ${className}`} data-testid="user-lists-section">
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
              data-testid="create-new-list-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New</span>
            </motion.button>
          </div>

          {/* Lists Grid using ListGrid component */}
          <ListGrid
            items={userLists}
            renderItem={(list) => (
              <UserListItem
                list={list}
                onDelete={handleDeleteList}
                onPlay={handlePlayList}
              />
            )}
            isLoading={isLoading}
            error={error ? new Error('Failed to load your lists') : null}
            onRetry={refetch}
            emptyState={
              <DefaultEmptyState
                icon={User}
                title="No Lists Yet"
                description="Create your first ranking list to get started!"
                action={
                  <motion.button
                    onClick={handleCreateList}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 mx-auto"
                    data-testid="create-first-list-btn"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Your First List</span>
                  </motion.button>
                }
              />
            }
            breakpoints={{ sm: 1 }}
            gap={3}
            layout="list"
            skeletonCount={3}
            testId="user-lists-grid"
          />
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