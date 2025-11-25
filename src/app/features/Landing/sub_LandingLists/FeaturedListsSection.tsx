"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Clock, Trophy, Medal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTopLists } from "@/hooks/use-top-lists";
import { useListStore } from "@/stores/use-list-store";
import { TopList } from "@/types/top-lists";
import { FeatureListItem } from "./FeatureListItem";
import { listContainerVariants, listItemVariants, fadeInUp } from "../shared/animations";
import { gradients } from "../shared/gradients";

interface FeaturedListsSectionProps {
  className?: string;
}

// Column configuration for cleaner rendering
const COLUMNS = [
  { title: "Most Popular", icon: Trophy, iconColor: "text-amber-400", gradient: "from-amber-500/20 to-orange-500/20" },
  { title: "Trending Now", icon: TrendingUp, iconColor: "text-cyan-400", gradient: "from-cyan-500/20 to-blue-500/20" },
  { title: "Latest Added", icon: Clock, iconColor: "text-violet-400", gradient: "from-violet-500/20 to-purple-500/20" },
  { title: "Latest Awards", icon: Medal, iconColor: "text-rose-400", gradient: "from-rose-500/20 to-pink-500/20" },
] as const;

export function FeaturedListsSection({ className }: FeaturedListsSectionProps) {
  const router = useRouter();
  const { setCurrentList } = useListStore();

  // Fetch lists for each column
  const { data: popularLists = [], isLoading: loadingPopular } = useTopLists({ limit: 10, sort: "popular", type: "top" });
  const { data: trendingLists = [], isLoading: loadingTrending } = useTopLists({ limit: 10, sort: "trending", type: "top" });
  const { data: latestLists = [], isLoading: loadingLatest } = useTopLists({ limit: 10, sort: "latest", type: "top" });
  const { data: rawAwardLists = [], isLoading: loadingAwards } = useTopLists({ limit: 20, type: "award" });

  const awardLists = rawAwardLists.filter((list) => !list.parent_list_id).slice(0, 10);
  const allLists = [popularLists, trendingLists, latestLists, awardLists];
  const loadingStates = [loadingPopular, loadingTrending, loadingLatest, loadingAwards];

  const handlePlayList = (list: TopList) => {
    if (list.type === "award") {
      router.push(`/award?id=${list.id}`);
      return;
    }
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

  return (
    <section className={`relative py-20 px-6 overflow-hidden ${className}`} data-testid="featured-lists-section">
      {/* Premium background - matching MatchGrid */}
      <div className="absolute inset-0 -z-10 bg-[#050505]" />
      
      {/* Center radial glow - cyan */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.1) 0%, transparent 50%)' }}
      />

      {/* Neon grid pattern - matching MatchGrid */}
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

      {/* Floating orbs for ambiance - cyan theme */}
      <motion.div
        className="absolute top-20 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(34, 211, 238, 0.06) 0%, transparent 60%)",
          filter: "blur(50px)",
        }}
        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      <div className="max-w-7xl mx-auto relative">
        {/* Section header */}
        <motion.div
          className="flex items-center gap-4 mb-12"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div
            className="relative p-3 rounded-2xl"
            style={{
              background: `linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(34, 211, 238, 0.1))`,
              boxShadow: `
                0 8px 32px rgba(6, 182, 212, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `,
            }}
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </motion.div>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Featured Rankings
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Discover the most popular lists from our community
            </p>
          </div>
        </motion.div>

        {/* Grid of columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {COLUMNS.map((column, colIndex) => (
            <motion.div
              key={column.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: colIndex * 0.1, duration: 0.5 }}
              className="flex flex-col"
            >
              {/* Column header */}
              <div className="flex items-center gap-2.5 mb-5">
                <motion.div
                  className={`p-2 rounded-xl bg-gradient-to-br ${column.gradient}`}
                  style={{
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                  }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <column.icon className={`w-4 h-4 ${column.iconColor}`} />
                </motion.div>
                <h3 className="text-lg font-semibold text-white">{column.title}</h3>
              </div>

              {/* List items */}
              <motion.div
                className="space-y-3 flex-1"
                variants={listContainerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {loadingStates[colIndex] ? (
                  // Skeleton loading with shimmer
                  Array.from({ length: 3 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="h-20 rounded-xl overflow-hidden relative"
                      style={{
                        background: `linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(51, 65, 85, 0.4))`,
                      }}
                    >
                      <motion.div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)`,
                          backgroundSize: "200% 100%",
                        }}
                        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    </motion.div>
                  ))
                ) : allLists[colIndex].length > 0 ? (
                  allLists[colIndex].map((list) => (
                    <motion.div key={list.id} variants={listItemVariants}>
                      <FeatureListItem list={list} onPlay={handlePlayList} />
                    </motion.div>
                  ))
                ) : (
                  <div
                    className="p-6 text-center rounded-xl"
                    style={{
                      background: `linear-gradient(135deg, rgba(30, 41, 59, 0.4), rgba(51, 65, 85, 0.2))`,
                    }}
                  >
                    <p className="text-slate-500 text-sm">No lists found</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
