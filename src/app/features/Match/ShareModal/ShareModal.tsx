"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMatchStore } from "@/stores/match-store";
import { useListStore } from "@/stores/use-list-store";
import { useGridStore } from "@/stores/grid-store";
import { useActivityStore } from "@/stores/activity-store";
import { useTempUser } from "@/hooks/use-temp-user";
import { CreateSharedRankingRequest, SharedRankingItem } from "@/types/share";

interface ShareModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// Social platform configurations
const SOCIAL_PLATFORMS = [
  {
    id: "twitter",
    name: "X",
    color: "#1DA1F2",
    icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "#4267B2",
    icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    id: "reddit",
    name: "Reddit",
    color: "#FF4500",
    icon: "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    color: "#25D366",
    icon: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  },
  {
    id: "discord",
    name: "Discord",
    color: "#5865F2",
    icon: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
  },
];

export function ShareModal({ isOpen: controlledIsOpen, onClose }: ShareModalProps) {
  const { showResultShareModal, setShowResultShareModal } = useMatchStore();
  const { currentList } = useListStore();
  const { gridItems } = useGridStore();
  const { broadcastCompletion } = useActivityStore();
  const { tempUserId } = useTempUser();

  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"share" | "social">("share");

  const isOpen = controlledIsOpen ?? showResultShareModal;

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setShowResultShareModal(false);
    }
    // Reset state
    setShareUrl(null);
    setShareError(null);
    setActiveTab("share");
  }, [onClose, setShowResultShareModal]);

  // Get ranked items for sharing
  const rankedItems = gridItems
    .filter((item) => item.matched)
    .sort((a, b) => a.position - b.position);

  const listTitle = currentList?.title || "My Top 10";
  const category = currentList?.category || "general";
  const subcategory = currentList?.subcategory;
  const timePeriod = currentList?.metadata?.timePeriod;

  // Create shareable link
  const createShareableLink = useCallback(async () => {
    setIsGeneratingShare(true);
    setShareError(null);

    try {
      const items: SharedRankingItem[] = rankedItems.map((item) => ({
        position: item.position + 1,
        title: item.title,
        description: item.description,
        image_url: item.image_url,
      }));

      const request: CreateSharedRankingRequest = {
        list_id: currentList?.id || "",
        user_id: tempUserId || undefined,
        title: listTitle,
        category,
        subcategory,
        time_period: timePeriod,
        items,
      };

      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create shareable link");
      }

      setShareUrl(data.data.share_url);

      // Broadcast to activity feed
      broadcastCompletion(listTitle, category, subcategory, rankedItems.length);

      // Switch to social tab
      setActiveTab("social");
    } catch (error) {
      console.error("Error creating share:", error);
      setShareError(error instanceof Error ? error.message : "Failed to create shareable link");
    } finally {
      setIsGeneratingShare(false);
    }
  }, [rankedItems, currentList, tempUserId, listTitle, category, subcategory, timePeriod, broadcastCompletion]);

  // Generate share text
  const generateShareText = useCallback(() => {
    const itemList = rankedItems
      .slice(0, 5)
      .map((item, i) => `${i + 1}. ${item.title}`)
      .join("\n");

    const url = shareUrl || "goat.app";
    return `I just ranked my ${listTitle}!\n\n${itemList}${rankedItems.length > 5 ? "\n..." : ""}\n\nThink you can do better? Challenge my ranking:\n${url}`;
  }, [rankedItems, listTitle, shareUrl]);

  // Handle social share
  const handleSocialShare = useCallback(
    (platformId: string) => {
      if (!shareUrl) return;

      const text = generateShareText();
      let url = "";

      switch (platformId) {
        case "twitter":
          url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=GOAT,Rankings`;
          break;
        case "facebook":
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
          break;
        case "reddit":
          url = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`My Top ${rankedItems.length} ${category} - "${listTitle}"`)}`;
          break;
        case "whatsapp":
          url = `https://wa.me/?text=${encodeURIComponent(text)}`;
          break;
        case "discord":
          // Discord picks up OG metadata when URL is pasted
          navigator.clipboard.writeText(shareUrl);
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
          return;
      }

      if (url) {
        window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
      }
    },
    [shareUrl, generateShareText, category, rankedItems.length, listTitle]
  );

  // Copy share link
  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [shareUrl]);

  // Copy share text
  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [generateShareText]);

  // Share natively (mobile)
  const handleNativeShare = useCallback(async () => {
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: listTitle,
          text: `Check out my Top ${rankedItems.length} ${category} ranking!`,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    }
  }, [listTitle, rankedItems.length, category, shareUrl]);

  // Skip share
  const handleSkip = useCallback(() => {
    // Still broadcast completion even if skipping share
    broadcastCompletion(listTitle, category, subcategory, rankedItems.length);
    handleClose();
  }, [broadcastCompletion, listTitle, category, subcategory, rankedItems.length, handleClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            data-testid="share-modal-backdrop"
          />

          {/* Modal */}
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            data-testid="share-modal"
          >
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: `linear-gradient(135deg,
                  rgba(15, 20, 35, 0.98) 0%,
                  rgba(20, 28, 48, 0.95) 50%,
                  rgba(15, 20, 35, 0.98) 100%
                )`,
                boxShadow: `
                  0 25px 50px -12px rgba(0, 0, 0, 0.5),
                  0 0 100px rgba(6, 182, 212, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
              }}
            >
              {/* Celebration effect */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)",
                }}
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10"
                data-testid="share-modal-close-btn"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div className="relative p-6">
                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                    style={{
                      background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(34, 211, 238, 0.1))",
                    }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white mb-2">Ranking Complete!</h2>
                  <p className="text-gray-400 text-sm">
                    You ranked {rankedItems.length} items in <span className="text-cyan-400">{listTitle}</span>
                  </p>
                </div>

                {/* Preview */}
                <div
                  className="rounded-xl p-4 mb-6"
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                >
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                  <div className="space-y-1">
                    {rankedItems.slice(0, 3).map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className="text-cyan-400 font-bold w-5">{index + 1}.</span>
                        <span className="text-white truncate">{item.title}</span>
                      </div>
                    ))}
                    {rankedItems.length > 3 && (
                      <p className="text-gray-500 text-xs mt-1">+{rankedItems.length - 3} more</p>
                    )}
                  </div>
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  {activeTab === "share" ? (
                    <motion.div
                      key="share"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-3"
                    >
                      {/* Error message */}
                      {shareError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          {shareError}
                        </div>
                      )}

                      {/* Create shareable link button */}
                      <button
                        onClick={createShareableLink}
                        disabled={isGeneratingShare}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                        style={{
                          background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                          boxShadow: "0 4px 20px rgba(6, 182, 212, 0.3)",
                        }}
                        data-testid="share-create-link-btn"
                      >
                        {isGeneratingShare ? (
                          <>
                            <motion.div
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Creating Shareable Link...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                              />
                            </svg>
                            Create Shareable Link
                          </>
                        )}
                      </button>

                      <div className="text-center text-gray-500 text-xs my-2">
                        Get a unique link with OG preview to share anywhere
                      </div>

                      {/* Copy text button */}
                      <button
                        onClick={handleCopyText}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium text-white transition-all hover:bg-white/10"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                        data-testid="share-copy-text-btn"
                      >
                        {copied ? (
                          <>
                            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            Copy as Text
                          </>
                        )}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="social"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      {/* Share URL display */}
                      {shareUrl && (
                        <div
                          className="flex items-center gap-2 p-3 rounded-lg"
                          style={{
                            background: "rgba(6, 182, 212, 0.1)",
                            border: "1px solid rgba(6, 182, 212, 0.2)",
                          }}
                        >
                          <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                          <span className="text-sm text-cyan-300 truncate flex-1">{shareUrl}</span>
                          <button
                            onClick={handleCopyLink}
                            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                            data-testid="share-copy-link-inline-btn"
                          >
                            {linkCopied ? (
                              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Social platform buttons */}
                      <div className="grid grid-cols-5 gap-2">
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <button
                            key={platform.id}
                            onClick={() => handleSocialShare(platform.id)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all hover:scale-105"
                            style={{
                              background: `rgba(${platform.id === "twitter" ? "29, 161, 242" : platform.id === "facebook" ? "66, 103, 178" : platform.id === "reddit" ? "255, 69, 0" : platform.id === "whatsapp" ? "37, 211, 102" : "88, 101, 242"}, 0.15)`,
                              border: `1px solid ${platform.color}40`,
                            }}
                            data-testid={`share-${platform.id}-btn`}
                          >
                            <svg className="w-5 h-5" style={{ color: platform.color }} viewBox="0 0 24 24" fill="currentColor">
                              <path d={platform.icon} />
                            </svg>
                            <span className="text-[10px] text-gray-400">{platform.name}</span>
                          </button>
                        ))}
                      </div>

                      {/* Native share (mobile) */}
                      {typeof navigator !== "undefined" && "share" in navigator && (
                        <button
                          onClick={handleNativeShare}
                          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02]"
                          style={{
                            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.8), rgba(34, 211, 238, 0.6))",
                            boxShadow: "0 4px 20px rgba(6, 182, 212, 0.3)",
                          }}
                          data-testid="share-native-btn"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                          Share via Device
                        </button>
                      )}

                      {/* Back button */}
                      <button
                        onClick={() => setActiveTab("share")}
                        className="w-full text-gray-500 text-sm hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
                        data-testid="share-back-btn"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Skip */}
                {activeTab === "share" && (
                  <button
                    onClick={handleSkip}
                    className="w-full mt-4 text-gray-500 text-sm hover:text-gray-300 transition-colors"
                    data-testid="share-skip-btn"
                  >
                    Maybe later
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
