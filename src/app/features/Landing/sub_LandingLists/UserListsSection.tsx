"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { ListGrid } from "@/components/ui/list-grid";
import { GoatCrown, GoatSparkles } from "@/components/visual/GoatIcons";
import { usePlayList } from "@/hooks/use-play-list";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useTempUser } from "@/hooks/use-temp-user";
import { toast } from "@/hooks/use-toast";
import { useUserLists, useDeleteList } from "@/hooks/use-top-lists";

import { SectionHeader } from "./SectionHeader";
import { UserListCard } from "./UserListCard";
import { listContainerVariants } from "../shared/animations";
import { gradients } from "../shared/gradients";
import { NeonArenaTheme } from "../shared/NeonArenaTheme";


interface UserListsSectionProps {
  className?: string;
}

export function UserListsSection({ className }: UserListsSectionProps) {
  const router = useRouter();
  const { tempUserId, isLoaded } = useTempUser();
  const { handlePlayList } = usePlayList();
  const deleteListMutation = useDeleteList();
  const prefersReducedMotion = useReducedMotion();

  const handleCreateNew = useCallback(() => {
    router.push("/studio");
  }, [router]);

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
            icon={GoatCrown}
            title="My Rankings"
            subtitle="Your personal collection of ranking lists"
            testIdPrefix="user-lists"
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
                <UserListCard list={list} onDelete={handleDeleteList} onPlay={handlePlayList} />
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
                    className={`mx-auto w-20 h-20 rounded-container flex items-center justify-center mb-6 ${prefersReducedMotion ? "" : "animate-ambient-card-float"}`}
                    style={{
                      background: `linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))`,
                      "--card-float-duration": "3s",
                      "--card-float-delay": "0s",
                    } as React.CSSProperties}
                    data-framer-motion-reducible="true"
                  >
                    <GoatSparkles className="w-10 h-10 text-amber-400/60" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Lists Yet</h3>
                  <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                    Create your first ranking list and start comparing your favorites!
                  </p>
                  <motion.button
                    onClick={handleCreateNew}
                    className="group relative px-8 py-3.5 rounded-card font-semibold text-sm tracking-wide cursor-pointer overflow-hidden"
                    style={{
                      background: gradients.amberButton,
                      border: "1px solid rgba(251, 191, 36, 0.3)",
                      color: "#fbbf24",
                      boxShadow: "0 4px 20px rgba(251, 191, 36, 0.15)",
                    }}
                    whileHover={prefersReducedMotion ? {} : {
                      scale: 1.03,
                      boxShadow: "0 8px 30px rgba(251, 191, 36, 0.25)",
                    }}
                    whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                    data-testid="create-first-list-btn"
                  >
                    {/* Shimmer sweep overlay */}
                    {!prefersReducedMotion && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: gradients.shimmer,
                          backgroundSize: "200% 100%",
                        }}
                        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    <span className="relative flex items-center gap-2">
                      Create Your First Ranking
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
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
    </>
  );
}