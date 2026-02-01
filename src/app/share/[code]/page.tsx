"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SharedRanking } from "@/types/share";
import { ShareableListCard } from "@/app/features/Share/ShareableListCard";
import { SocialButton } from "@/components/ui/SocialButton";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import {
  pageEntranceVariants,
  staggerContainerVariants,
  listItemVariants,
  STAGGER,
  prefersReducedMotion,
  type SocialPlatform,
} from "@/lib/animations/sharing";

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

  const handleChallenge = async () => {
    try {
      // Call the challenge API
      const response = await fetch(`/api/share/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to create a new list with the same config
        router.push(data.data.redirect_url);
      }
    } catch (err) {
      console.error("Error challenging ranking:", err);
    }
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
        // Discord uses the OG metadata when a URL is pasted
        navigator.clipboard.writeText(shareUrl);
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
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full"
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
          transition={{ delay: 0.2 }}
        >
          {error || "Ranking not found"}
        </motion.div>
        <motion.button
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          data-testid="share-go-home-btn"
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
      className="min-h-screen py-12 px-4"
      variants={pageEntranceVariants}
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
    >
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <motion.button
          onClick={() => router.push("/")}
          className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-all duration-200"
          data-testid="share-back-btn"
          initial={reducedMotion ? false : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ x: -4 }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </motion.button>

        {/* Main content */}
        <AnimatePresence mode="wait">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Shareable Card */}
            <ShareableListCard
              ranking={ranking}
              onChallenge={handleChallenge}
              onShare={handleShare}
              onCopyLink={handleCopyLink}
            />

            {/* Stats with Animated Counters */}
            <motion.div
              className="mt-8 grid grid-cols-2 gap-4"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="rounded-xl p-6 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)",
                  border: "1px solid rgba(6, 182, 212, 0.15)",
                  boxShadow: "0 4px 20px rgba(6, 182, 212, 0.05)",
                }}
                whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(6, 182, 212, 0.1)" }}
                transition={{ duration: 0.2 }}
              >
                <AnimatedCounter
                  value={ranking.view_count}
                  className="text-3xl font-bold text-cyan-400"
                  delay={0.5}
                />
                <div className="text-sm text-gray-400 mt-1">Views</div>
              </motion.div>
              <motion.div
                className="rounded-xl p-6 text-center"
                style={{
                  background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)",
                  border: "1px solid rgba(139, 92, 246, 0.15)",
                  boxShadow: "0 4px 20px rgba(139, 92, 246, 0.05)",
                }}
                whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(139, 92, 246, 0.1)" }}
                transition={{ duration: 0.2 }}
              >
                <AnimatedCounter
                  value={ranking.challenge_count}
                  className="text-3xl font-bold text-purple-400"
                  delay={0.6}
                />
                <div className="text-sm text-gray-400 mt-1">Challenges</div>
              </motion.div>
            </motion.div>

            {/* Share buttons section */}
            <motion.div
              className="mt-8"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4 tracking-tight">Share this ranking</h3>
              <motion.div
                className="grid grid-cols-3 sm:grid-cols-6 gap-3"
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
            </motion.div>

            {/* Challenge CTA */}
            <motion.div
              className="mt-12 text-center"
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="text-gray-400 mb-4"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                Think you can do better?
              </motion.div>
              <motion.button
                onClick={handleChallenge}
                className="px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                  boxShadow: "0 8px 30px rgba(6, 182, 212, 0.35)",
                }}
                data-testid="share-challenge-cta-btn"
                initial={reducedMotion ? false : { scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 400, damping: 20 }}
                whileHover={{ scale: 1.05, boxShadow: "0 12px 40px rgba(6, 182, 212, 0.45)" }}
                whileTap={{ scale: 0.98 }}
              >
                Challenge This Ranking
              </motion.button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
