"use client";

import { Calendar, Tag, FolderOpen, Clock, Hash, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetadataGridProps {
  /** Item year */
  year?: number;
  /** Year range end (for series, etc.) */
  yearTo?: number;
  /** Category name */
  category?: string;
  /** Subcategory name */
  subcategory?: string;
  /** Tags array */
  tags?: string[];
  /** Group/collection name */
  groupName?: string;
  /** Description text */
  description?: string;
  /** Created date */
  createdAt?: string;
  /** Optional className */
  className?: string;
}

interface MetadataItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  className?: string;
}

function MetadataItem({ icon, label, value, className }: MetadataItemProps) {
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50", className)}>
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
        <div className="text-sm text-gray-200 font-medium">{value}</div>
      </div>
    </div>
  );
}

/**
 * MetadataGrid - Structured display of item metadata
 *
 * Displays item metadata in a clean, organized grid format with icons
 * and labels for each field.
 */
export function MetadataGrid({
  year,
  yearTo,
  category,
  subcategory,
  tags,
  groupName,
  description,
  createdAt,
  className,
}: MetadataGridProps) {
  const hasYearRange = year && yearTo && yearTo !== year;
  const yearDisplay = hasYearRange ? `${year} - ${yearTo}` : year?.toString();

  const hasAnyMetadata = year || category || tags?.length || groupName || description;

  if (!hasAnyMetadata) {
    return (
      <div className={cn("p-4 text-center text-gray-500 text-sm", className)}>
        <Info className="w-5 h-5 mx-auto mb-2 opacity-50" />
        No metadata available
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Year */}
        {yearDisplay && (
          <MetadataItem
            icon={<Calendar className="w-4 h-4" />}
            label="Year"
            value={yearDisplay}
          />
        )}

        {/* Category */}
        {category && (
          <MetadataItem
            icon={<FolderOpen className="w-4 h-4" />}
            label="Category"
            value={
              <span>
                {category}
                {subcategory && (
                  <span className="text-gray-400"> / {subcategory}</span>
                )}
              </span>
            }
          />
        )}

        {/* Group */}
        {groupName && (
          <MetadataItem
            icon={<Hash className="w-4 h-4" />}
            label="Collection"
            value={groupName}
          />
        )}

        {/* Created Date */}
        {createdAt && (
          <MetadataItem
            icon={<Clock className="w-4 h-4" />}
            label="Added"
            value={new Date(createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          />
        )}
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500 uppercase tracking-wider">Tags</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {description && (
        <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500 uppercase tracking-wider">Description</p>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
