"use client";

import { motion } from "framer-motion";
import { FolderPlus, Folder, FolderOpen, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

import { CollectionCard } from "@/app/features/Collections";
import { ListGrid } from "@/components/ui/list-grid";
import { ELEVATION, INSET, withInset } from "@/components/visual/depth";
import { useUserCollections } from "@/hooks/use-collections";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useCurrentUser } from "@/stores/use-list-store";

import { SectionHeader } from "./SectionHeader";
import { listContainerVariants } from "../shared/animations";
import { NeonArenaTheme } from "../shared/NeonArenaTheme";

import type { ListCollection } from "@/types/collection";


interface CollectionsSectionProps {
  className?: string;
}

export function CollectionsSection({ className }: CollectionsSectionProps) {
  const router = useRouter();
  const user = useCurrentUser();
  const prefersReducedMotion = useReducedMotion();

  const handleManageCollections = useCallback(() => {
    router.push("/my-collections");
  }, [router]);

  const handleViewCollection = useCallback(
    (collection: ListCollection) => {
      if (collection.isPublic && collection.shareSlug) {
        router.push(`/collections/${collection.shareSlug}`);
      } else {
        router.push(`/my-collections?selected=${collection.id}`);
      }
    },
    [router]
  );

  // useUserCollections gets userId internally via useCurrentUser
  const {
    data: collections = [],
    isLoading,
    error,
    refetch,
  } = useUserCollections();

  // Get top 6 collections for display
  const displayCollections = useMemo(() => {
    return collections.slice(0, 6);
  }, [collections]);

  // Don't render if no user
  if (!user?.id) return null;

  return (
    <NeonArenaTheme
      variant="minimal"
      as="section"
      className={`py-20 px-6 ${className}`}
      config={{ showLineAccents: true, glowIntensity: 0.08 }}
      data-testid="collections-section"
    >
      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <SectionHeader
          icon={FolderOpen}
          title="My Collections"
          subtitle="Organize your lists into themed collections"
          gradientColors={{
            start: "rgba(168, 85, 247, 0.15)",
            end: "rgba(139, 92, 246, 0.1)",
          }}
          testIdPrefix="collections"
          rightContent={
            <motion.button
              onClick={handleManageCollections}
              className="relative group px-5 py-2.5 rounded-xl font-medium text-sm text-white overflow-hidden flex items-center gap-2"
              style={{
                background: `linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(139, 92, 246, 0.9))`,
                boxShadow: withInset(ELEVATION.high, INSET.glassHighlightStrong),
              }}
              whileHover={prefersReducedMotion ? {} : { scale: 1.03, y: -2 }}
              whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              data-testid="manage-collections-btn"
            >
              {/* Shimmer effect */}
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
                Manage All
                <ChevronRight className="w-4 h-4" />
              </span>
            </motion.button>
          }
        />

        {/* Collections grid */}
        <motion.div
          variants={listContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <ListGrid
            items={displayCollections}
            renderItem={(collection) => (
              <CollectionCard
                collection={collection}
                variant="default"
                onSelect={handleViewCollection}
              />
            )}
            isLoading={isLoading}
            error={error ? new Error("Failed to load collections") : null}
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
                    background: `linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.1))`,
                    "--card-float-duration": "3s",
                    "--card-float-delay": "0s",
                  } as React.CSSProperties}
                  data-framer-motion-reducible="true"
                >
                  <Folder className="w-10 h-10 text-purple-400/60" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  No Collections Yet
                </h3>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto">
                  Create collections to organize your lists by theme, category,
                  or any way you like!
                </p>
                <motion.button
                  onClick={handleManageCollections}
                  className="px-6 py-3 rounded-xl font-medium text-white"
                  style={{
                    background: `linear-gradient(135deg, rgba(168, 85, 247, 0.9), rgba(139, 92, 246, 0.9))`,
                    boxShadow: ELEVATION.high,
                  }}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                  data-testid="create-first-collection-btn"
                >
                  <span className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4" />
                    Create Your First Collection
                  </span>
                </motion.button>
              </motion.div>
            }
            layout="grid"
            skeletonCount={3}
            testId="collections-grid"
          />
        </motion.div>

        {/* Show "View All" link if there are more collections */}
        {collections.length > 6 && (
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={handleManageCollections}
              className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              data-testid="view-all-collections-btn"
            >
              <span>View all {collections.length} collections</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </NeonArenaTheme>
  );
}
