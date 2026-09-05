"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";

import { GoatTrophy, GoatMusic, GoatGamepad } from "@/components/visual/GoatIcons";
import { DURATION } from "@/lib/animations/motion-presets";
import { getCategoryColor } from "@/lib/helpers/getColors";

import { gradients } from "./shared/gradients";

/**
 * Sample data for each category preview card.
 * Shows what a ranked list looks like to help first-time users understand the concept.
 */
const CATEGORY_PREVIEWS = [
  {
    category: "Sports",
    icon: GoatTrophy,
    sampleItems: ["Michael Jordan", "LeBron James", "Kobe Bryant"],
  },
  {
    category: "Music",
    icon: GoatMusic,
    sampleItems: ["Bohemian Rhapsody", "Stairway to Heaven", "Hotel California"],
  },
  {
    category: "Games",
    icon: GoatGamepad,
    sampleItems: ["The Witcher 3", "Red Dead Redemption 2", "Zelda: BotW"],
  },
] as const;

const RANK_BADGES = [
  { label: "1", bg: "rgba(251, 191, 36, 0.25)", border: "rgba(251, 191, 36, 0.5)", text: "#fbbf24" },
  { label: "2", bg: "rgba(203, 213, 225, 0.15)", border: "rgba(203, 213, 225, 0.3)", text: "#cbd5e1" },
  { label: "3", bg: "rgba(180, 83, 9, 0.2)", border: "rgba(180, 83, 9, 0.4)", text: "#d97706" },
];

interface PreviewCardProps {
  category: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  sampleItems: readonly string[];
  index: number;
}

const PreviewCard = memo(function PreviewCard({
  category,
  icon: Icon,
  sampleItems,
  index,
}: PreviewCardProps) {
  const colors = getCategoryColor(category.toLowerCase());

  return (
    <motion.div
      className="flex-1 min-w-0 rounded-xl overflow-hidden backdrop-blur-md"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 1.8 + index * 0.15,
        duration: DURATION.emphasis,
        type: "spring",
        stiffness: 100,
        damping: 15,
      }}
      style={{
        background: gradients.cardSurface,
        border: `1px solid ${colors.primary}25`,
      }}
    >
      {/* Category header with gradient */}
      <div
        className="px-4 py-3 flex items-center gap-2.5"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}18 0%, transparent 100%)`,
          borderBottom: `1px solid ${colors.primary}20`,
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: `${colors.primary}20`,
            border: `1px solid ${colors.primary}30`,
          }}
        >
          <Icon
            className="w-4 h-4"
            style={{ color: colors.primary }}
          />
        </div>
        <span
          className="text-xs font-bold uppercase tracking-widest font-heading"
          style={{ color: colors.primary }}
        >
          {category}
        </span>
      </div>

      {/* Sample ranked items */}
      <div className="px-3 py-2">
        {sampleItems.map((item, i) => (
          <motion.div
            key={item}
            className="flex items-center gap-2.5 py-1.5"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 2.2 + index * 0.15 + i * 0.1, duration: DURATION.normal }}
          >
            {/* Rank badge */}
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-2xs font-bold"
              style={{
                background: RANK_BADGES[i].bg,
                border: `1px solid ${RANK_BADGES[i].border}`,
                color: RANK_BADGES[i].text,
              }}
            >
              {RANK_BADGES[i].label}
            </div>

            {/* Item name */}
            <span className="text-xs text-white/70 truncate">
              {item}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
});

/**
 * OnboardingHero - Branded first-visit hero experience
 *
 * Shown only to first-time users below the G.O.A.T. title.
 * Introduces the three core categories with animated preview cards
 * showing sample ranked lists, plus a prominent CTA.
 */
export const OnboardingHero = memo(function OnboardingHero() {
  const router = useRouter();

  const handleCTA = useCallback(() => {
    router.push("/studio");
  }, [router]);

  return (
    <div className="relative z-10 px-4 pt-2 pb-6">
      <div className="max-w-3xl mx-auto">
        {/* Tagline */}
        <motion.p
          className="text-center text-sm md:text-base text-white/50 mb-6 tracking-wide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: DURATION.slow }}
        >
          Rank anything. Debate everything. Crown the G.O.A.T.
        </motion.p>

        {/* Category preview cards — stack on phones (a fixed 3-up flex row
            truncated sample names like "Red Dead Redemption 2" in ~110px columns
            for the new-user audience this hero targets), row on sm+. */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-8">
          {CATEGORY_PREVIEWS.map((preview, index) => (
            <PreviewCard
              key={preview.category}
              category={preview.category}
              icon={preview.icon}
              sampleItems={preview.sampleItems}
              index={index}
            />
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6, duration: DURATION.emphasis, type: "spring", stiffness: 80 }}
        >
          <motion.button
            onClick={handleCTA}
            className="group relative px-8 py-3.5 rounded-xl font-semibold text-sm tracking-wide cursor-pointer overflow-hidden"
            style={{
              background: gradients.amberButton,
              border: "1px solid rgba(251, 191, 36, 0.3)",
              color: "#fbbf24",
              boxShadow: "0 4px 20px rgba(251, 191, 36, 0.15)",
            }}
            whileHover={{
              scale: 1.03,
              boxShadow: "0 8px 30px rgba(251, 191, 36, 0.25)",
            }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Shimmer sweep overlay */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: gradients.shimmer,
                backgroundSize: "200% 100%",
              }}
              animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            <span className="relative flex items-center gap-2">
              Create Your First Ranking
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
});
