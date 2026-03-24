"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { SocialButton } from "@/components/ui/SocialButton";
import { useForkRanking } from "@/hooks/use-fork-ranking";
import { DURATION } from "@/lib/animations/motion-presets";
import {
  pageEntranceVariants,
  staggerContainerVariants,
  listItemVariants,
  STAGGER,
  prefersReducedMotion,
  type SocialPlatform,
} from "@/lib/animations/sharing";
import { SharedRanking } from "@/types/share";

// Platform data for social share buttons
const socialPlatforms: { id: SocialPlatform; name: string }[] = [
  { id: "twitter", name: "X" },
  { id: "facebook", name: "Facebook" },
  { id: "linkedin", name: "LinkedIn" },
  { id: "reddit", name: "Reddit" },
  { id: "whatsapp", name: "WhatsApp" },
  { id: "discord", name: "Discord" },
];

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [ranking, setRanking] = useState<SharedRanking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const { forkRanking, isForking } = useForkRanking();
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    async function fetchRanking() {
      try {
        const response = await fetch(`/api/share/${code}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || "Ranking not found");
          return;
        }

        setRanking(data.data);
      } catch (err) {
        console.error("Error fetching ranking:", err);
        setError("Failed to load ranking");
      } finally {
        setIsLoading(false);
      }
    }

    if (code) {
      fetchRanking();
    }
  }, [code]);

  const handleStartRanking = () => {
    if (!ranking) return;
    router.push(`/?list=${ranking.list_id}`);
  };

  const handleShare = (platform: string) => {
    if (!ranking) return;

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${baseUrl}/share/${ranking.share_code}`;
    const text = `Check out my Top ${ranking.items.length} ${ranking.category} ranking: "${ranking.title}"`;

    let url = "";

    switch (platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&hashtags=GOAT,Rankings`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case "reddit":
        url = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`;
        break;
      case "discord":
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
    }
  };

  const handleCopyLink = async () => {
    if (!ranking) return;

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${baseUrl}/share/${ranking.share_code}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleNativeShare = async () => {
    if (!ranking || !navigator.share) return;

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = `${baseUrl}/share/${ranking.share_code}`;

    try {
      await navigator.share({
        title: ranking.title,
        text: `Check out my Top ${ranking.items.length} ${ranking.category} ranking!`,
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or share failed silently
    }
  };

  // Attribution text
  const getAttribution = () => {
    if (!ranking) return "";
    const count = ranking.items.length;
    if (ranking.display_name) {
      return `${ranking.display_name}'s Top ${count} ${ranking.category}`;
    }
    return `Someone ranked their Top ${count} ${ranking.category}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-brand-hover/30 border-t-brand-hover rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (error || !ranking) {
    return (
      <motion.div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        variants={pageEntranceVariants}
        initial={reducedMotion ? false : "hidden"}
        animate="visible"
      >
        <motion.div
          className="text-6xl"
          initial={reducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          404
        </motion.div>
        <motion.div
          className="text-xl text-gray-400"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: DURATION.fast }}
        >
          {error || "Ranking not found"}
        </motion.div>
        <motion.button
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-3 bg-brand-muted hover:bg-brand rounded-xl font-medium transition-all duration-200 focus-ring"
          data-testid="share-go-home-btn"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: DURATION.normal }}
          whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(6, 182, 212, 0.35)" }}
          whileTap={{ scale: 0.98 }}
        >
          Go Home
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen py-8 sm:py-12 px-4"
      variants={pageEntranceVariants}
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
    >
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <motion.button
          onClick={() => router.push("/")}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-200 min-h-[44px]"
          data-testid="share-back-btn"
          initial={reducedMotion ? false : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: DURATION.instant }}
          whileHover={{ x: -4 }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </motion.button>

        {/* Attribution Header */}
        <motion.div
          className="mb-6"
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: DURATION.quick }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {getAttribution()}
          </h1>
          <p className="text-gray-400 mt-1 text-sm">{ranking.title}</p>
        </motion.div>

        {/* Main content */}
        <AnimatePresence mode="wait">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.slow, delay: DURATION.fast }}
          >
            {/* Ranking List Card */}
            <motion.div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(6, 182, 212, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className="divide-y divide-white/5">
                {ranking.items.map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 hover:bg-white/[0.02] transition-colors"
                    initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: DURATION.fast + DURATION.instant + index * 0.03 }}
                  >
                    {/* Position */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        item.position === 1
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : item.position === 2
                          ? "bg-gray-300/20 text-gray-300 border border-gray-400/30"
                          : item.position === 3
                          ? "bg-amber-600/20 text-amber-500 border border-amber-600/30"
                          : "bg-white/5 text-gray-400 border border-white/10"
                      }`}
                    >
                      {item.position}
                    </div>

                    {/* Thumbnail */}
                    {item.image_url && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Title */}
                    <span className={`text-sm sm:text-base ${item.position <= 3 ? "text-white font-semibold" : "text-gray-300"}`}>
                      {item.title}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              className="mt-6 grid grid-cols-3 gap-3"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: DURATION.normal + DURATION.instant }}
            >
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)",
                  border: "1px solid rgba(6, 182, 212, 0.15)",
                }}
              >
                <AnimatedCounter
                  value={ranking.view_count}
                  className="text-2xl font-bold text-brand-hover"
                  delay={0.5}
                />
                <div className="text-xs text-gray-400 mt-1">Views</div>
              </div>
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)",
                  border: "1px solid rgba(139, 92, 246, 0.15)",
                }}
              >
                <AnimatedCounter
                  value={ranking.challenge_count}
                  className="text-2xl font-bold text-purple-400"
                  delay={0.6}
                />
                <div className="text-xs text-gray-400 mt-1">Challenges</div>
              </div>
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)",
                  border: "1px solid rgba(34, 197, 94, 0.15)",
                }}
              >
                <AnimatedCounter
                  value={ranking.fork_count}
                  className="text-2xl font-bold text-green-400"
                  delay={0.7}
                />
                <div className="text-xs text-gray-400 mt-1">Forks</div>
              </div>
            </motion.div>

            {/* Share buttons */}
            <motion.div
              className="mt-6"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: DURATION.slow }}
            >
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Share this ranking</h3>
              <motion.div
                className="grid grid-cols-3 sm:grid-cols-6 gap-2"
                variants={staggerContainerVariants}
                initial={reducedMotion ? false : "hidden"}
                animate="visible"
              >
                {socialPlatforms.map((platform, index) => (
                  <motion.div
                    key={platform.id}
                    variants={listItemVariants}
                    custom={index}
                    transition={{ delay: index * STAGGER.fast }}
                  >
                    <SocialButton
                      platform={platform.id}
                      onClick={() => handleShare(platform.id)}
                      size="lg"
                      showLabel
                      testId={`share-${platform.id}-btn`}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Copy link and native share */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition-all min-h-[44px]"
                  data-testid="share-copy-link-btn"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button
                    onClick={handleNativeShare}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition-all min-h-[44px]"
                    data-testid="share-native-btn"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Share
                  </button>
                )}
              </div>
            </motion.div>

            {/* Fork & Challenge CTA */}
            <motion.div
              className="mt-10"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: DURATION.emphasis }}
            >
              {/* Fork / Remix Button */}
              <motion.button
                onClick={() => forkRanking(code)}
                disabled={isForking}
                className="w-full px-6 py-4 rounded-xl font-bold text-lg text-white transition-all duration-300 focus-ring min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)",
                  boxShadow: "0 8px 30px rgba(34, 197, 94, 0.3)",
                }}
                data-testid="share-fork-btn"
                whileHover={isForking ? {} : { scale: 1.02, boxShadow: "0 12px 40px rgba(34, 197, 94, 0.4)" }}
                whileTap={isForking ? {} : { scale: 0.98 }}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  {isForking ? "Forking..." : "Fork & Remix This Ranking"}
                </span>
              </motion.button>
              <p className="text-center text-xs text-gray-500 mt-2">
                Creates your own editable copy with the same items pre-placed
              </p>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Original Challenge CTA */}
              <div className="text-center">
                <p className="text-gray-400 mb-4 text-lg">Start fresh with the same topic?</p>

                {!showPreview ? (
                  <motion.button
                    onClick={() => setShowPreview(true)}
                    className="px-8 py-4 rounded-xl font-bold text-lg text-white transition-all duration-300 focus-ring min-h-[44px]"
                    style={{
                      background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                      boxShadow: "0 8px 30px rgba(6, 182, 212, 0.35)",
                    }}
                    data-testid="share-challenge-cta-btn"
                    whileHover={{ scale: 1.05, boxShadow: "0 12px 40px rgba(6, 182, 212, 0.45)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Make Your Own
                  </motion.button>
                ) : (
                  <motion.div
                    className="rounded-2xl p-6 text-left"
                    style={{
                      background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)",
                      border: "1px solid rgba(6, 182, 212, 0.2)",
                    }}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <h4 className="text-lg font-bold text-white mb-2">{ranking.title}</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                        {ranking.category}
                      </span>
                      {ranking.subcategory && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
                          {ranking.subcategory}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/10">
                        {ranking.items.length} items
                      </span>
                      {ranking.time_period && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-white/10">
                          {ranking.time_period}
                        </span>
                      )}
                    </div>
                    <motion.button
                      onClick={handleStartRanking}
                      className="w-full px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 focus-ring min-h-[44px]"
                      style={{
                        background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                        boxShadow: "0 4px 20px rgba(6, 182, 212, 0.3)",
                      }}
                      data-testid="share-start-ranking-btn"
                      whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(6, 182, 212, 0.4)" }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Start Ranking
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
