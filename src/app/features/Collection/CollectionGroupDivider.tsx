"use client";

import { motion } from "framer-motion";
import { Folder, Loader2 } from "lucide-react";
import { getCategoryColor } from "@/lib/helpers/getColors";

interface CollectionGroupDividerProps {
  groupName: string;
  itemCount: number;
  totalItemCount?: number;
  category?: string;
  subcategory?: string;
  isLoading?: boolean;
}

/**
 * CollectionGroupDivider - Visual divider between groups
 *
 * Displays group name and item count with a horizontal divider line
 * - Compact design with category color accent
 * - Subtle animations
 * - Loading state support
 */
export function CollectionGroupDivider({
  groupName,
  itemCount,
  totalItemCount,
  category,
  subcategory,
  isLoading = false
}: CollectionGroupDividerProps) {
  // Get category color for accent
  const colors = category ? getCategoryColor(category) : {
    primary: "#3b82f6",
    secondary: "#1e40af"
  };

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0.9 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex items-center gap-2 py-2"
    >
      {/* Left Line with animated gradient */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${colors.primary}30, ${colors.primary}50)`
        }}
      />

      {/* Group Info - Enhanced */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
          border: `1px solid ${colors.primary}25`
        }}
      >
        {/* Background shimmer effect */}
        <motion.div
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 w-full h-full opacity-20"
          style={{
            background: `linear-gradient(90deg, transparent, ${colors.primary}40, transparent)`
          }}
        />

        {/* Icon with category color - animated */}
        <motion.div
          whileHover={{ rotate: 15, scale: 1.1 }}
          className="relative p-1 rounded border"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}30)`,
            borderColor: `${colors.primary}40`
          }}
        >
          <Folder
            className="w-3 h-3"
            style={{ color: colors.primary }}
          />
        </motion.div>

        {/* Group Name - improved font */}
        <span className="relative text-[11px] font-semibold text-white tracking-wide">
          {groupName}
        </span>

        {/* Item Count - enhanced */}
        <div className="relative flex items-center gap-1 ml-1">
          {isLoading ? (
            <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
          ) : (
            <>
              <span className="text-[10px] text-gray-500">•</span>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: `${colors.primary}20`,
                  color: colors.primary
                }}
              >
                {itemCount}
                {totalItemCount !== undefined && totalItemCount !== itemCount && (
                  <span className="text-gray-400">/{totalItemCount}</span>
                )}
              </motion.span>
            </>
          )}
        </div>
      </motion.div>

      {/* Right Line with animated gradient */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(to left, transparent, ${colors.primary}30, ${colors.primary}50)`
        }}
      />

      {/* Subtle glow effect - enhanced */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, ${colors.primary}15, transparent 60%)`
        }}
      />
    </motion.div>
  );
}
