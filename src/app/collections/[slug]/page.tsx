"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Folder,
  Grid,
  List,
  Share2,
  Copy,
  Check,
  Calendar,
  Layers,
  MoreHorizontal,
} from "lucide-react";
import type { ListCollection, CollectionStats } from "@/types/collection";
import type { TopList } from "@/types/top-lists";

interface CollectionWithLists extends ListCollection {
  stats?: CollectionStats;
  lists?: TopList[];
}

export default function CollectionSharePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [collection, setCollection] = useState<CollectionWithLists | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchCollection() {
      try {
        // Fetch by share slug
        const response = await fetch(
          `/api/collections/by-slug/${slug}?include_stats=true&include_lists=true`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Collection not found");
          } else {
            setError("Failed to load collection");
          }
          return;
        }

        const data = await response.json();
        setCollection(data.data || data);
      } catch (err) {
        console.error("Error fetching collection:", err);
        setError("Failed to load collection");
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      fetchCollection();
    }
  }, [slug]);

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  const handleShare = useCallback(
    (platform: string) => {
      if (!collection) return;

      const url = window.location.href;
      const text = `Check out this collection: "${collection.name}"`;

      const shareUrls: Record<string, string> = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      };

      const shareUrl = shareUrls[platform];
      if (shareUrl) {
        window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
      }
    },
    [collection]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <motion.div
          className="w-12 h-12 border-4 border-brand-hover/30 border-t-brand-hover rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950">
        <Folder className="w-16 h-16 text-slate-600" />
        <div className="text-xl text-slate-400">{error || "Collection not found"}</div>
        <Link
          href="/"
          className="mt-4 px-6 py-3 bg-brand-muted hover:bg-brand rounded-xl font-medium transition-all duration-200 hover:shadow-lg hover:shadow-brand/25 active:scale-95 text-white"
        >
          Go Home
        </Link>
      </div>
    );
  }

  const lists = collection.lists || [];
  const stats = collection.stats || {
    listCount: collection.listIds.length,
    totalItems: 0,
    completedLists: 0,
    lastActivity: null,
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-all"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="text-sm">{copied ? "Copied!" : "Copy Link"}</span>
            </button>
            <div className="relative group">
              <button className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-300 transition-all">
                <Share2 className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-2 py-2 w-40 bg-slate-800 rounded-lg border border-slate-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {["twitter", "facebook", "linkedin"].map((platform) => (
                  <button
                    key={platform}
                    onClick={() => handleShare(platform)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 capitalize transition-colors"
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Collection Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl mb-8"
          style={{
            background: `linear-gradient(135deg, ${collection.color || "#06b6d4"}20 0%, rgba(15, 23, 42, 0.8) 100%)`,
            border: `1px solid ${collection.color || "#06b6d4"}30`,
          }}
        >
          {collection.coverImage && (
            <div className="absolute inset-0">
              <Image
                src={collection.coverImage}
                alt={collection.name}
                fill
                className="object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/80 to-transparent" />
            </div>
          )}

          <div className="relative p-8 sm:p-12">
            <div className="flex items-start gap-6">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${collection.color || "#06b6d4"} 0%, ${collection.color || "#06b6d4"}80 100%)`,
                  boxShadow: `0 8px 32px ${collection.color || "#06b6d4"}40`,
                }}
              >
                <Folder className="w-10 h-10 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 truncate">
                  {collection.name}
                </h1>
                {collection.description && (
                  <p className="text-slate-400 text-lg max-w-2xl">
                    {collection.description}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Layers className="w-4 h-4" />
                  Lists
                </div>
                <div className="text-2xl font-bold text-white">{stats.listCount}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Grid className="w-4 h-4" />
                  Items
                </div>
                <div className="text-2xl font-bold text-white">{stats.totalItems}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Check className="w-4 h-4" />
                  Completed
                </div>
                <div className="text-2xl font-bold text-white">{stats.completedLists}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                  <Calendar className="w-4 h-4" />
                  Updated
                </div>
                <div className="text-lg font-medium text-white">
                  {stats.lastActivity
                    ? new Date(stats.lastActivity).toLocaleDateString()
                    : "Never"}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* View Controls */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Lists in this collection
          </h2>
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lists Grid/List */}
        <AnimatePresence mode="wait">
          {lists.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Folder className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">This collection is empty</p>
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {lists.map((list, index) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={`/match/${list.id}`}
                    className="block group"
                  >
                    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 transition-all hover:bg-slate-800/80 hover:border-slate-600/50 hover:shadow-xl hover:-translate-y-1">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-white group-hover:text-brand-hover transition-colors line-clamp-2">
                          {list.title}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-400 shrink-0 ml-2">
                          Top {list.size}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="capitalize">{list.category}</span>
                        {list.subcategory && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{list.subcategory}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {lists.map((list, index) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    href={`/match/${list.id}`}
                    className="flex items-center gap-4 p-4 bg-slate-800/30 hover:bg-slate-800/60 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-brand-hover transition-colors">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white group-hover:text-brand-hover transition-colors truncate">
                        {list.title}
                      </h3>
                      <p className="text-sm text-slate-500 capitalize">
                        {list.category}
                        {list.subcategory && ` • ${list.subcategory}`}
                      </p>
                    </div>
                    <span className="text-sm px-3 py-1 rounded-full bg-slate-700/50 text-slate-400">
                      Top {list.size}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
