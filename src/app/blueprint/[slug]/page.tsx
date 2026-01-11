"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, Sparkles, Users, Clock } from "lucide-react";
import { useBlueprint } from "@/hooks/use-blueprints";
import { useComposition } from "@/hooks/use-composition";
import { getCategoryIcon } from "@/lib/constants/showCaseExamples";

export default function BlueprintPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { openWithBlueprint } = useComposition();

  const { data: blueprint, isLoading, error } = useBlueprint(slug);

  // When blueprint loads, open the composition modal and redirect to home
  useEffect(() => {
    if (blueprint) {
      // Small delay to allow page render before opening modal
      const timer = setTimeout(() => {
        openWithBlueprint(blueprint);
        router.push("/");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [blueprint, openWithBlueprint, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg">Loading blueprint...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !blueprint) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Blueprint Not Found</h1>
          <p className="text-white/60 mb-6">
            This blueprint may have been removed or the link is invalid.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-colors"
            data-testid="blueprint-not-found-home-btn"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    );
  }

  // Show blueprint preview while redirecting
  const CategoryIcon = getCategoryIcon(blueprint.category);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Blueprint Card */}
        <div
          className="relative rounded-3xl overflow-hidden p-6"
          style={{
            background: `
              linear-gradient(135deg,
                rgba(15, 20, 35, 0.95) 0%,
                rgba(20, 28, 48, 0.9) 50%,
                rgba(15, 20, 35, 0.95) 100%
              )
            `,
            boxShadow: `
              0 20px 50px rgba(0, 0, 0, 0.5),
              0 0 80px ${blueprint.color.primary}20,
              inset 0 1px 0 rgba(255, 255, 255, 0.05)
            `,
          }}
          data-testid="blueprint-preview-card"
        >
          {/* Glow effect */}
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-40 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at center, ${blueprint.color.primary}30, transparent 60%)`,
              filter: "blur(30px)",
            }}
          />

          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${blueprint.color.primary}30, ${blueprint.color.secondary}20)`,
                }}
              >
                <CategoryIcon className="w-7 h-7" style={{ color: blueprint.color.primary }} />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{blueprint.title}</h1>
                <p className="text-white/50 text-sm">
                  {blueprint.category}
                  {blueprint.subcategory && ` • ${blueprint.subcategory}`}
                </p>
              </div>
            </div>

            {/* Description */}
            {blueprint.description && (
              <p className="text-white/70 mb-6">{blueprint.description}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2 text-white/50">
                <Sparkles className="w-4 h-4" style={{ color: blueprint.color.primary }} />
                <span>Top {blueprint.size}</span>
              </div>
              {blueprint.usageCount !== undefined && blueprint.usageCount > 0 && (
                <div className="flex items-center gap-2 text-white/50">
                  <Users className="w-4 h-4" />
                  <span>{blueprint.usageCount} views</span>
                </div>
              )}
              {blueprint.cloneCount !== undefined && blueprint.cloneCount > 0 && (
                <div className="flex items-center gap-2 text-white/50">
                  <Clock className="w-4 h-4" />
                  <span>{blueprint.cloneCount} uses</span>
                </div>
              )}
            </div>

            {/* Author */}
            {blueprint.author && (
              <div className="flex items-center gap-2 text-white/40 text-sm mb-6">
                <span>Created by</span>
                <span className="text-white/60 font-medium">{blueprint.author}</span>
              </div>
            )}

            {/* Loading indicator */}
            <div className="flex items-center justify-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: blueprint.color.primary }} />
              <span className="text-white/70">Opening creation modal...</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
