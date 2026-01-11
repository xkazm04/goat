"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SharedRanking } from "@/types/share";
import { ShareableListCard } from "@/app/features/Share/ShareableListCard";

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [ranking, setRanking] = useState<SharedRanking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">404</div>
        <div className="text-xl text-gray-400">{error || "Ranking not found"}</div>
        <button
          onClick={() => router.push("/")}
          className="mt-4 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-xl font-medium transition-colors"
          data-testid="share-go-home-btn"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          data-testid="share-back-btn"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </button>

        {/* Main content */}
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Shareable Card */}
            <ShareableListCard
              ranking={ranking}
              onChallenge={handleChallenge}
              onShare={handleShare}
              onCopyLink={handleCopyLink}
            />

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <div className="text-3xl font-bold text-cyan-400">{ranking.view_count}</div>
                <div className="text-sm text-gray-400 mt-1">Views</div>
              </div>
              <div
                className="rounded-xl p-6 text-center"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <div className="text-3xl font-bold text-purple-400">{ranking.challenge_count}</div>
                <div className="text-sm text-gray-400 mt-1">Challenges</div>
              </div>
            </div>

            {/* Share buttons section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-4">Share this ranking</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { id: "twitter", name: "X", color: "#1DA1F2", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                  { id: "facebook", name: "Facebook", color: "#4267B2", icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
                  { id: "linkedin", name: "LinkedIn", color: "#0077B5", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
                  { id: "reddit", name: "Reddit", color: "#FF4500", icon: "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" },
                  { id: "whatsapp", name: "WhatsApp", color: "#25D366", icon: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" },
                  { id: "discord", name: "Discord", color: "#5865F2", icon: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" },
                ].map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => handleShare(platform.id)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:scale-105"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                    data-testid={`share-${platform.id}-btn`}
                  >
                    <svg className="w-6 h-6" style={{ color: platform.color }} viewBox="0 0 24 24" fill="currentColor">
                      <path d={platform.icon} />
                    </svg>
                    <span className="text-xs text-gray-400">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Challenge CTA */}
            <div className="mt-12 text-center">
              <div className="text-gray-400 mb-4">Think you can do better?</div>
              <button
                onClick={handleChallenge}
                className="px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                  boxShadow: "0 4px 20px rgba(6, 182, 212, 0.3)",
                }}
                data-testid="share-challenge-cta-btn"
              >
                Challenge This Ranking
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
