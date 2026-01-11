"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, User, Sparkles } from "lucide-react";
import { useUserLists, useDeleteList } from "@/hooks/use-top-lists";
import { useTempUser } from "@/hooks/use-temp-user";
import { usePlayList } from "@/hooks/use-play-list";
import { toast } from "@/hooks/use-toast";
import { ListCard } from "./ListCard";
import { ListGrid } from "@/components/ui/list-grid";
import { useComposition } from "@/hooks/use-composition";
import { CompositionModal } from "@/app/features/Landing/sub_CreateList/CompositionModal";
import { listContainerVariants } from "../shared/animations";
import { NeonArenaTheme } from "../shared/NeonArenaTheme";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { SectionHeader } from "./SectionHeader";

interface UserListsSectionProps {
  className?: string;
}

export function UserListsSection({ className }: UserListsSectionProps) {
  const { tempUserId, isLoaded } = useTempUser();
  const { handlePlayList } = usePlayList();
  const deleteListMutation = useDeleteList();
  const { openComposition, isOpen: isModalOpen } = useComposition();
  const prefersReducedMotion = useReducedMotion();

  const {
    data: userLists = [],
    isLoading,
    error,
    refetch,
  } = useUserLists(tempUserId || "", { limit: 10 });

  const handleDeleteList = useCallback(async (listId: string) => {
    try {
      await deleteListMutation.mutateAsync(listId);
      toast({
        title: "List Deleted",
        description: "Your list has been successfully deleted.",
      });
      // Note: refetch() is not needed here because useDeleteList's onSuccess
      // already invalidates queries, which triggers automatic refetch via TanStack Query
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the list. Please try again.",
      });
      throw error;
    }
  }, [deleteListMutation]);

  if (!isLoaded || !tempUserId) return null;

  return (
    <>
      <NeonArenaTheme
        variant="minimal"
        as="section"
        className={`py-20 px-6 ${className}`}
        config={{ showLineAccents: true, glowIntensity: 0.08 }}
        data-testid="user-lists-section"
      >
        <div className="max-w-6xl mx-auto relative">
          {/* Section header */}
          <SectionHeader
            icon={User}
            title="My Rankings"
            subtitle="Your personal collection of ranking lists"
            gradientColors={{
              start: "rgba(6, 182, 212, 0.15)",
              end: "rgba(34, 211, 238, 0.1)",
            }}
            testIdPrefix="user-lists"
            rightContent={
              <motion.button
                onClick={() => openComposition()}
                className="relative group px-5 py-2.5 rounded-xl font-medium text-sm text-white overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, rgba(6, 182, 212, 0.9), rgba(34, 211, 238, 0.9))`,
                  boxShadow: `
                    0 8px 30px rgba(6, 182, 212, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2)
                  `,
                }}
                whileHover={prefersReducedMotion ? {} : { scale: 1.03, y: -2 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                data-testid="create-new-list-btn"
              >
                {/* Shimmer effect - CSS-animated for better performance */}
                {!prefersReducedMotion && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 animate-ambient-shimmer"
                    style={{
                      background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)`,
                      backgroundSize: "200% 100%",
                    }}
                    data-framer-motion-reducible="true"
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create New
                </span>
              </motion.button>
            }
          />

          {/* List grid */}
          <motion.div
            variants={listContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <ListGrid
              items={userLists}
              renderItem={(list) => (
                <ListCard list={list} variant="user" onDelete={handleDeleteList} onPlay={handlePlayList} />
              )}
              isLoading={isLoading}
              error={error ? new Error("Failed to load your lists") : null}
              onRetry={refetch}
              emptyState={
                <motion.div
                  className="py-16 text-center"
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${prefersReducedMotion ? "" : "animate-ambient-card-float"}`}
                    style={{
                      background: `linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(34, 211, 238, 0.1))`,
                      "--card-float-duration": "3s",
                      "--card-float-delay": "0s",
                    } as React.CSSProperties}
                    data-framer-motion-reducible="true"
                  >
                    <Sparkles className="w-10 h-10 text-cyan-400/60" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Lists Yet</h3>
                  <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                    Create your first ranking list and start comparing your favorites!
                  </p>
                  <motion.button
                    onClick={() => openComposition()}
                    className="px-6 py-3 rounded-xl font-medium text-white"
                    style={{
                      background: `linear-gradient(135deg, rgba(6, 182, 212, 0.9), rgba(34, 211, 238, 0.9))`,
                      boxShadow: `0 8px 30px rgba(6, 182, 212, 0.25)`,
                    }}
                    whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                    data-testid="create-first-list-btn"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First List
                    </span>
                  </motion.button>
                </motion.div>
              }
              layout="list"
              skeletonCount={3}
              testId="user-lists-grid"
            />
          </motion.div>
        </div>
      </NeonArenaTheme>

      {/* Note: CompositionModal's onSuccess doesn't need refetch() because
          useCreateListWithUser already invalidates queries in its onSuccess handler */}
      <CompositionModal onSuccess={() => {}} />
    </>
  );
}