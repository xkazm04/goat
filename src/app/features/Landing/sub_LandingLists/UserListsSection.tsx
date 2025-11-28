"use client";

import { motion } from "framer-motion";
import { Plus, User, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUserLists, useDeleteList } from "@/hooks/use-top-lists";
import { useTempUser } from "@/hooks/use-temp-user";
import { useListStore } from "@/stores/use-list-store";
import { TopList } from "@/types/top-lists";
import { toast } from "@/hooks/use-toast";
import UserListItem from "./UserListItem";
import { ListGrid, DefaultEmptyState } from "@/components/ui/list-grid";
import { useComposition } from "@/hooks/use-composition";
import { CompositionModal } from "@/app/features/Landing/sub_CreateList/CompositionModal";
import { fadeInUp, listContainerVariants } from "../shared/animations";
import { gradients } from "../shared/gradients";

interface UserListsSectionProps {
  className?: string;
}

export function UserListsSection({ className }: UserListsSectionProps) {
  const router = useRouter();
  const { tempUserId, isLoaded } = useTempUser();
  const { setCurrentList } = useListStore();
  const deleteListMutation = useDeleteList();
  const { openComposition, isOpen: isModalOpen } = useComposition();

  const {
    data: userLists = [],
    isLoading,
    error,
    refetch,
  } = useUserLists(tempUserId || "", { limit: 10 });

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteListMutation.mutateAsync(listId);
      toast({
        title: "List Deleted",
        description: "Your list has been successfully deleted.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the list. Please try again.",
      });
      throw error;
    }
  };

  const handlePlayList = (list: TopList) => {
    setCurrentList({
      id: list.id,
      title: list.title,
      category: list.category,
      subcategory: list.subcategory,
      user_id: list.user_id || "",
      predefined: list.predefined,
      size: list.size,
      time_period: list.time_period,
      created_at: list.created_at,
    });
    router.push(`/match-test?list=${list.id}`);
  };

  if (!isLoaded || !tempUserId) return null;

  return (
    <>
      <section className={`relative py-20 px-6 overflow-hidden ${className}`} data-testid="user-lists-section">
        {/* Background - matching MatchGrid */}
        <div className="absolute inset-0 -z-10 bg-[#050505]" />
        
        {/* Center radial glow */}
        <div
          className="absolute inset-0 -z-10"
          style={{ background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.08) 0%, transparent 50%)' }}
        />

        {/* Neon grid pattern */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Decorative gradient line at top - cyan */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), rgba(34, 211, 238, 0.2), transparent)",
          }}
        />

        {/* Floating orb - cyan */}
        <motion.div
          className="absolute top-1/3 right-1/5 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 60%)",
            filter: "blur(50px)",
          }}
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="max-w-6xl mx-auto relative">
          {/* Section header */}
          <motion.div
            className="flex items-center justify-between mb-10"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-4">
              <motion.div
                className="relative p-3 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(34, 211, 238, 0.1))`,
                  boxShadow: `
                    0 8px 32px rgba(6, 182, 212, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1)
                  `,
                }}
                whileHover={{ scale: 1.05, rotate: 5 }}
              >
                <User className="w-6 h-6 text-cyan-400" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">My Rankings</h2>
                <p className="text-sm text-slate-400 mt-1">Your personal collection of ranking lists</p>
              </div>
            </div>

            {/* Create button */}
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
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              data-testid="create-new-list-btn"
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100"
                style={{
                  background: `linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)`,
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="relative flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New
              </span>
            </motion.button>
          </motion.div>

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
                <UserListItem list={list} onDelete={handleDeleteList} onPlay={handlePlayList} />
              )}
              isLoading={isLoading}
              error={error ? new Error("Failed to load your lists") : null}
              onRetry={refetch}
              emptyState={
                <motion.div
                  className="py-16 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <motion.div
                    className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                    style={{
                      background: `linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(34, 211, 238, 0.1))`,
                    }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkles className="w-10 h-10 text-cyan-400/60" />
                  </motion.div>
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
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="create-first-list-btn"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First List
                    </span>
                  </motion.button>
                </motion.div>
              }
              breakpoints={{ sm: 1 }}
              gap={3}
              layout="list"
              skeletonCount={3}
              testId="user-lists-grid"
            />
          </motion.div>
        </div>
      </section>

      <CompositionModal
        onSuccess={(result) => {
          if (result.success) refetch();
        }}
      />
    </>
  );
}