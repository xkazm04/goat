"use client";

import { ReactNode } from "react";
import * as HoverCard from "@radix-ui/react-hover-card";
import { motion, AnimatePresence } from "framer-motion";
import { Hash, Calendar, BarChart3, Loader2, Star, Clock } from "lucide-react";
import { useListPreview } from "@/hooks/use-list-preview";
import { getCategoryColor } from "@/lib/helpers/getColors";

interface ListPreviewPopoverProps {
  listId: string;
  children: ReactNode;
  /** Side to show the popover (default: top) */
  side?: "top" | "right" | "bottom" | "left";
  /** Align the popover (default: center) */
  align?: "start" | "center" | "end";
  /** Open delay in ms (default: 300) */
  openDelay?: number;
  /** Close delay in ms (default: 200) */
  closeDelay?: number;
}

export function ListPreviewPopover({
  listId,
  children,
  side = "top",
  align = "center",
  openDelay = 300,
  closeDelay = 200,
}: ListPreviewPopoverProps) {
  const { previewData, isLoading, startHover, endHover } = useListPreview(listId, {
    hoverDelay: openDelay,
  });

  return (
    <HoverCard.Root
      openDelay={openDelay}
      closeDelay={closeDelay}
      onOpenChange={(open) => {
        if (open) {
          startHover();
        } else {
          endHover();
        }
      }}
    >
      <HoverCard.Trigger asChild data-testid={`list-preview-trigger-${listId}`}>
        {children}
      </HoverCard.Trigger>

      <AnimatePresence>
        <HoverCard.Portal>
          <HoverCard.Content
            side={side}
            align={align}
            sideOffset={8}
            className="z-50"
            data-testid={`list-preview-popover-${listId}`}
          >
            <motion.div
              initial={{ opacity: 0, y: side === "top" ? 5 : side === "bottom" ? -5 : 0, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: side === "top" ? 5 : side === "bottom" ? -5 : 0, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="w-64 rounded-xl overflow-hidden"
              style={{
                background: `linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)`,
                border: "1px solid rgba(255, 255, 255, 0.1)",
                boxShadow: `
                  0 20px 40px rgba(0, 0, 0, 0.4),
                  0 0 30px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
                backdropFilter: "blur(20px)",
              }}
            >
              {isLoading ? (
                <div
                  className="p-6 flex items-center justify-center"
                  data-testid={`list-preview-loading-${listId}`}
                >
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              ) : previewData ? (
                <PreviewContent data={previewData} />
              ) : (
                <div className="p-4 text-center text-slate-500 text-sm">
                  Unable to load preview
                </div>
              )}
            </motion.div>

            <HoverCard.Arrow
              className="fill-slate-800/90"
              width={12}
              height={6}
            />
          </HoverCard.Content>
        </HoverCard.Portal>
      </AnimatePresence>
    </HoverCard.Root>
  );
}

interface PreviewContentProps {
  data: {
    title: string;
    category: string;
    subcategory?: string;
    size: number;
    itemCount: number;
    averageRanking?: number;
    timePeriod?: string;
    createdAt: string;
  };
}

function PreviewContent({ data }: PreviewContentProps) {
  const colors = getCategoryColor(data.category);
  const completionPercent = Math.round((data.itemCount / data.size) * 100);
  const createdDate = new Date(data.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="p-4" data-testid="list-preview-content">
      {/* Category badge and title */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-wide"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            boxShadow: `0 2px 8px ${colors.primary}30`,
          }}
          data-testid="list-preview-category"
        >
          {data.category}
        </div>
        {data.subcategory && (
          <span className="text-[11px] text-slate-500 mt-0.5">
            {data.subcategory}
          </span>
        )}
      </div>

      <h4
        className="text-sm font-semibold text-white mb-3 line-clamp-2"
        data-testid="list-preview-title"
      >
        {data.title}
      </h4>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Item count */}
        <div
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
          data-testid="list-preview-item-count"
        >
          <Hash className="w-3.5 h-3.5 text-cyan-400" />
          <div>
            <div className="text-xs font-medium text-white">
              {data.itemCount}/{data.size}
            </div>
            <div className="text-[10px] text-slate-500">items</div>
          </div>
        </div>

        {/* Average ranking badge */}
        <div
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
          data-testid="list-preview-avg-ranking"
        >
          <Star className="w-3.5 h-3.5 text-yellow-400" />
          <div>
            <div className="text-xs font-medium text-white">
              {data.averageRanking !== undefined
                ? `#${data.averageRanking}`
                : "—"}
            </div>
            <div className="text-[10px] text-slate-500">avg rank</div>
          </div>
        </div>
      </div>

      {/* Completion progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wide">
            Completion
          </span>
          <span className="text-[10px] font-medium text-slate-400">
            {completionPercent}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255, 255, 255, 0.08)" }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
              boxShadow: `0 0 10px ${colors.primary}50`,
            }}
            data-testid="list-preview-progress-bar"
          />
        </div>
      </div>

      {/* Footer with time info */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span className="capitalize">
            {data.timePeriod?.replace("-", " ") || "all time"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{createdDate}</span>
        </div>
      </div>
    </div>
  );
}

export default ListPreviewPopover;
