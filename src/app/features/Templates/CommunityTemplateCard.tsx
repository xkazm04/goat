'use client';

import { motion } from 'framer-motion';
import { Copy, Check, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { useState } from 'react';

import { StarRating } from '@/components/ui/star-rating';
import { useRateTemplate, useUserRating } from '@/hooks/use-blueprints';
import { DURATION } from '@/lib/animations/motion-presets';
import { getCategoryColor } from '@/lib/helpers/getColors';
import { Blueprint } from '@/types/blueprint';

interface CommunityTemplateCardProps {
  template: Blueprint;
  onUseTemplate: (template: Blueprint) => void;
}

export function CommunityTemplateCard({ template, onUseTemplate }: CommunityTemplateCardProps) {
  const [copied, setCopied] = useState(false);
  const rateTemplate = useRateTemplate();
  const { data: userRatingData } = useUserRating(template.slug || template.id);

  const colors = template.color || getCategoryColor(template.category);
  const itemCount = template.itemSnapshot?.length ?? 0;

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/templates?view=${template.slug || template.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const handleRate = (rating: number) => {
    rateTemplate.mutate({ slugOrId: template.slug || template.id, rating });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.normal }}
      className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02]
        hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300
        overflow-hidden cursor-pointer"
      onClick={() => onUseTemplate(template)}
    >
      {/* Color accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }}
      />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{template.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${colors.primary}20`,
                  color: colors.primary,
                }}
              >
                {template.category}
              </span>
              <span className="text-[10px] text-gray-500">Top {template.size}</span>
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]
              hover:bg-white/[0.08] transition-colors text-gray-400 hover:text-gray-300"
            aria-label="Copy template link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Description */}
        {template.description && (
          <p className="text-xs text-gray-400 line-clamp-2">{template.description}</p>
        )}

        {/* Item preview chips */}
        {itemCount > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.itemSnapshot!.slice(0, 4).map((item, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-400 border border-white/[0.06]"
              >
                {item.title}
              </span>
            ))}
            {itemCount > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-500">
                +{itemCount - 4} more
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-gray-500">
              <Users className="w-3 h-3" />
              <span className="text-[10px]">{template.cloneCount ?? 0}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span className="text-[10px]">{template.usageCount ?? 0} views</span>
            </div>
            {(template.completionRate ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <BarChart3 className="w-3 h-3" />
                <span className="text-[10px]">{template.completionRate}%</span>
              </div>
            )}
          </div>

          {/* Stop the rating click from bubbling to the card's onUseTemplate,
              which would otherwise yank the user into the composition modal. */}
          <span
            onClick={(e) => e.stopPropagation()}
            role="presentation"
            className="inline-flex"
          >
            <StarRating
              value={template.avgRating ?? 0}
              interactive
              onChange={handleRate}
              size="sm"
              showValue
            />
          </span>
        </div>

        {/* Author + user's rating */}
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>by {template.author || 'Anonymous'}</span>
          {userRatingData?.userRating && (
            <span className="text-yellow-500/70">Your rating: {userRatingData.userRating}/5</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
