import { motion } from "framer-motion";
import { Play, ChevronRight } from "lucide-react";
import { TopList } from "@/types/top-lists";
import { getCategoryColor } from "@/lib/helpers/getColors";

interface FeatureListItemProps {
  list: TopList;
  onPlay: (list: TopList) => void;
}

export const FeatureListItem = ({ list, onPlay }: FeatureListItemProps) => {
  const colors = getCategoryColor(list.category);

  return (
    <motion.div
      className="relative group rounded-xl overflow-hidden cursor-pointer"
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onPlay(list)}
      data-testid={`featured-list-item-${list.id}`}
      style={{
        background: `
          linear-gradient(135deg,
            rgba(20, 28, 48, 0.8) 0%,
            rgba(30, 40, 60, 0.6) 50%,
            rgba(20, 28, 48, 0.8) 100%
          )
        `,
        boxShadow: `
          0 4px 20px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.05)
        `,
      }}
    >
      {/* Colored accent glow */}
      <motion.div
        className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}15)`,
        }}
      />

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 opacity-60 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(to bottom, ${colors.primary}, ${colors.secondary})`,
          boxShadow: `0 0 15px ${colors.primary}40`,
        }}
      />

      <div className="relative p-4 pl-5">
        <div className="flex items-center justify-between gap-3">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4
              className="text-sm font-semibold text-white truncate group-hover:text-opacity-100 transition-colors"
              data-testid={`featured-list-title-${list.id}`}
            >
              {list.title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `${colors.primary}20`,
                  color: colors.accent,
                }}
              >
                Top {list.size}
              </span>
              <span className="text-xs text-slate-500">
                {list.time_period?.replace("-", " ") || "all time"}
              </span>
            </div>
          </div>

          {/* Play button */}
          <motion.div
            className="flex-shrink-0 relative"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}25, ${colors.secondary}20)`,
                boxShadow: `0 4px 15px ${colors.primary}20`,
              }}
            >
              <Play className="w-4 h-4 text-white fill-current" />
            </div>
          </motion.div>
        </div>

        {/* Hover indicator */}
        <motion.div
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all"
          initial={false}
          animate={{ x: 0 }}
          whileHover={{ x: 3 }}
        >
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </motion.div>
      </div>

      {/* Shimmer effect on hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          background: `
            linear-gradient(
              105deg,
              transparent 40%,
              rgba(255, 255, 255, 0.03) 50%,
              transparent 60%
            )
          `,
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
      />
    </motion.div>
  );
};
