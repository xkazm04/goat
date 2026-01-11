"use client";

import { motion } from "framer-motion";
import { SharedRanking } from "@/types/share";
import { useState } from "react";

interface ShareableListCardProps {
  ranking: SharedRanking;
  onChallenge?: () => void;
  onShare?: (platform: string) => void;
  onCopyLink?: () => void;
  compact?: boolean;
}

export function ShareableListCard({
  ranking,
  onChallenge,
  onShare,
  onCopyLink,
  compact = false,
}: ShareableListCardProps) {
  const [copied, setCopied] = useState(false);

  const { title, category, subcategory, time_period, items = [] } = ranking;
  const topItems = compact ? items.slice(0, 3) : items.slice(0, 10);
  const timePeriodText = time_period || "All Time";

  const handleCopy = async () => {
    onCopyLink?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get medal color for position
  const getMedalStyle = (position: number) => {
    switch (position) {
      case 1:
        return {
          bg: "linear-gradient(135deg, rgba(250, 204, 21, 0.2) 0%, rgba(250, 204, 21, 0.05) 100%)",
          border: "rgba(250, 204, 21, 0.4)",
          text: "#facc15",
          shadow: "0 0 20px rgba(250, 204, 21, 0.2)",
        };
      case 2:
        return {
          bg: "linear-gradient(135deg, rgba(226, 232, 240, 0.15) 0%, rgba(226, 232, 240, 0.03) 100%)",
          border: "rgba(226, 232, 240, 0.3)",
          text: "#e2e8f0",
          shadow: "0 0 15px rgba(226, 232, 240, 0.1)",
        };
      case 3:
        return {
          bg: "linear-gradient(135deg, rgba(180, 83, 9, 0.2) 0%, rgba(180, 83, 9, 0.05) 100%)",
          border: "rgba(180, 83, 9, 0.4)",
          text: "#f59e0b",
          shadow: "0 0 15px rgba(180, 83, 9, 0.15)",
        };
      default:
        return {
          bg: "rgba(255, 255, 255, 0.03)",
          border: "rgba(255, 255, 255, 0.05)",
          text: "#64748b",
          shadow: "none",
        };
    }
  };

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg,
          rgba(15, 20, 35, 0.98) 0%,
          rgba(20, 28, 48, 0.95) 50%,
          rgba(15, 20, 35, 0.98) 100%
        )`,
        boxShadow: `
          0 25px 50px -12px rgba(0, 0, 0, 0.5),
          0 0 100px rgba(6, 182, 212, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.05)
        `,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      data-testid="shareable-list-card"
    >
      {/* Decorative gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 80% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)",
        }}
      />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            {/* Category badges */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{
                  background: "rgba(6, 182, 212, 0.2)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  color: "#22d3ee",
                }}
              >
                {category}
                {subcategory && ` • ${subcategory}`}
              </span>
              <span
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{
                  background: "rgba(139, 92, 246, 0.2)",
                  border: "1px solid rgba(139, 92, 246, 0.3)",
                  color: "#a78bfa",
                }}
              >
                {timePeriodText}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>

            {/* Item count */}
            <p className="text-gray-400 mt-2">
              Top {items.length} Rankings
            </p>
          </div>

          {/* GOAT branding */}
          <div className="text-right">
            <div
              className="text-2xl font-extrabold"
              style={{
                background: "linear-gradient(135deg, #22d3ee 0%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              G.O.A.T.
            </div>
            <div className="text-xs text-gray-500">Greatest Of All Time</div>
          </div>
        </div>

        {/* Rankings list */}
        <div className="space-y-3 mb-6">
          {topItems.map((item, index) => {
            const style = getMedalStyle(item.position);
            const isTopThree = item.position <= 3;

            return (
              <motion.div
                key={index}
                className="flex items-center gap-4 rounded-xl p-3"
                style={{
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  boxShadow: style.shadow,
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                data-testid={`ranking-item-${item.position}`}
              >
                {/* Position */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                    isTopThree ? "text-xl" : "text-lg"
                  }`}
                  style={{
                    color: style.text,
                    background: isTopThree
                      ? `rgba(${item.position === 1 ? "250, 204, 21" : item.position === 2 ? "226, 232, 240" : "180, 83, 9"}, 0.15)`
                      : "transparent",
                  }}
                >
                  {item.position}
                </div>

                {/* Image */}
                {item.image_url && (
                  <div
                    className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Title and description */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium truncate ${
                      isTopThree ? "text-white" : "text-gray-300"
                    }`}
                  >
                    {item.title}
                  </div>
                  {item.description && !compact && (
                    <div className="text-sm text-gray-500 truncate">
                      {item.description}
                    </div>
                  )}
                </div>

                {/* Medal icon for top 3 */}
                {isTopThree && (
                  <div className="flex-shrink-0">
                    {item.position === 1 && (
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#facc15">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    )}
                    {item.position === 2 && (
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#e2e8f0">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    )}
                    {item.position === 3 && (
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#f59e0b">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* More items indicator */}
          {items.length > topItems.length && (
            <div className="text-center text-gray-500 text-sm pt-2">
              +{items.length - topItems.length} more items
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Challenge button */}
          {onChallenge && (
            <button
              onClick={onChallenge}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                boxShadow: "0 4px 20px rgba(6, 182, 212, 0.3)",
              }}
              data-testid="shareable-challenge-btn"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Challenge This Ranking
            </button>
          )}

          {/* Share buttons row */}
          <div className="flex gap-2">
            {/* Twitter/X */}
            {onShare && (
              <button
                onClick={() => onShare("twitter")}
                className="p-3 rounded-xl transition-all hover:scale-105"
                style={{
                  background: "rgba(29, 161, 242, 0.15)",
                  border: "1px solid rgba(29, 161, 242, 0.3)",
                }}
                data-testid="shareable-twitter-btn"
              >
                <svg className="w-5 h-5" fill="#1DA1F2" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
            )}

            {/* Copy link */}
            {onCopyLink && (
              <button
                onClick={handleCopy}
                className="p-3 rounded-xl transition-all hover:scale-105"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
                data-testid="shareable-copy-btn"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
