"use client";

import { motion } from "framer-motion";
import {
  Folder,
  MoreHorizontal,
  ChevronRight,
  Globe,
  Lock,
  Layers,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo, useCallback } from "react";

import { use3DTilt } from "@/hooks/use-3d-tilt";
import { SPRING } from "@/lib/animations/motion-presets";

import type { ListCollection, CollectionStats } from "@/types/collection";

interface CollectionCardProps {
  collection: ListCollection;
  stats?: CollectionStats;
  onSelect?: (collection: ListCollection) => void;
  onEdit?: (collection: ListCollection) => void;
  onDelete?: (collection: ListCollection) => void;
  isSelected?: boolean;
  showActions?: boolean;
  variant?: "default" | "compact" | "minimal";
}

const DEFAULT_COLORS = {
  primary: "#06b6d4",
  secondary: "#0891b2",
};

export const CollectionCard = memo(function CollectionCard({
  collection,
  stats,
  onSelect,
  onEdit,
  onDelete,
  isSelected = false,
  showActions = true,
  variant = "default",
}: CollectionCardProps) {
  const color = collection.color || DEFAULT_COLORS.primary;

  const { ref, style: tiltStyle, handlers } = use3DTilt({
    maxRotation: 6,
    stiffness: SPRING.snappy.stiffness,
    damping: SPRING.snappy.damping,
    scale: 1.02,
  });

  const handleClick = useCallback(() => {
    onSelect?.(collection);
  }, [onSelect, collection]);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onEdit?.(collection);
    },
    [onEdit, collection]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onDelete?.(collection);
    },
    [onDelete, collection]
  );

  const listCount = stats?.listCount ?? collection.listIds.length;
  const totalItems = stats?.totalItems ?? 0;

  if (variant === "minimal") {
    return (
      <motion.div
        className={`flex items-center gap-3 p-3 rounded-container cursor-pointer transition-all ${
          isSelected
            ? "bg-slate-700/50 border-brand/50"
            : "bg-slate-800/30 hover:bg-slate-800/60 border-transparent"
        } border`}
        onClick={handleClick}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className="w-8 h-8 rounded-control flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Folder className="w-4 h-4" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {collection.name}
          </p>
          <p className="text-xs text-slate-500">{listCount} lists</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </motion.div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        ref={ref}
        className={`relative p-4 rounded-container cursor-pointer group ${
          isSelected
            ? "ring-2 ring-brand"
            : "ring-1 ring-slate-700/50 hover:ring-slate-600"
        }`}
        style={{
          ...tiltStyle,
          background: `linear-gradient(135deg, ${color}10 0%, rgba(15, 23, 42, 0.8) 100%)`,
        }}
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        {...handlers}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-card flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
              boxShadow: `0 4px 16px ${color}40`,
            }}
          >
            <Folder className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-brand-hover transition-colors">
              {collection.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">{listCount} lists</span>
              {collection.isPublic ? (
                <Globe className="w-3 h-3 text-slate-500" />
              ) : (
                <Lock className="w-3 h-3 text-slate-500" />
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Default variant - full card
  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden rounded-container cursor-pointer group ${
        isSelected ? "ring-2 ring-brand" : ""
      }`}
      style={{
        ...tiltStyle,
        background: `linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(20, 28, 48, 0.9) 50%, rgba(15, 23, 42, 0.95) 100%)`,
        boxShadow: `0 12px 40px rgba(0, 0, 0, 0.4), 0 0 60px ${color}08`,
      }}
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      {...handlers}
    >
      {/* Cover Image or Gradient */}
      <div className="relative h-32 overflow-hidden">
        {collection.coverImage ? (
          <>
            <Image
              src={collection.coverImage}
              alt={collection.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/50 to-transparent" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${color}30 0%, ${color}10 50%, transparent 100%)`,
            }}
          />
        )}

        {/* Aurora glow */}
        <motion.div
          className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-32 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${color}30, transparent 60%)`,
            filter: "blur(25px)",
          }}
          animate={{ opacity: [0.4, 0.6, 0.4], scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Visibility badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-badge bg-black/40 backdrop-blur-xs text-xs text-white/80">
          {collection.isPublic ? (
            <>
              <Globe className="w-3 h-3" />
              Public
            </>
          ) : (
            <>
              <Lock className="w-3 h-3" />
              Private
            </>
          )}
        </div>

        {/* Actions menu */}
        {showActions && (onEdit || onDelete) && (
          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-control bg-black/40 backdrop-blur-xs hover:bg-black/60 text-white/80 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              <div className="absolute left-0 top-full mt-1 py-1 w-32 bg-slate-800 rounded-card border border-slate-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-dropdown">
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="w-full px-3 py-1.5 text-left text-sm text-slate-300 hover:bg-slate-700/50"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-slate-700/50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Folder icon overlay */}
        <div className="absolute -right-6 -bottom-6 opacity-10 scale-150 pointer-events-none">
          <Folder className="w-24 h-24" style={{ color }} />
        </div>
      </div>

      {/* Content */}
      <div className="relative p-5">
        <h3 className="text-lg font-semibold text-white mb-1 truncate group-hover:text-brand-hover transition-colors">
          {collection.name}
        </h3>

        {collection.description && (
          <p className="text-sm text-slate-400 mb-3 line-clamp-2">
            {collection.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Layers className="w-4 h-4" />
            <span>{listCount} lists</span>
          </div>
          {totalItems > 0 && (
            <div className="text-slate-600">•</div>
          )}
          {totalItems > 0 && (
            <div className="text-slate-500">{totalItems} items</div>
          )}
        </div>

        {/* Hover glow */}
        <motion.div
          className="absolute inset-0 rounded-container pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            boxShadow: `inset 0 0 30px ${color}08, 0 0 40px ${color}10`,
          }}
        />
      </div>

      {/* View link indicator */}
      {collection.shareSlug && collection.isPublic && (
        <Link
          href={`/collections/${collection.shareSlug}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 right-4 flex items-center gap-1 text-xs text-slate-500 hover:text-brand-hover transition-colors"
        >
          View <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </motion.div>
  );
});
