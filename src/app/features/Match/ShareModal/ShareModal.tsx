"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMatchStore } from "@/stores/match-store";
import { useListStore } from "@/stores/use-list-store";
import { useGridStore } from "@/stores/grid-store";
import { useActivityStore } from "@/stores/activity-store";
import { useTempUser } from "@/hooks/use-temp-user";
import { CreateSharedRankingRequest, SharedRankingItem } from "@/types/share";
import {
  SHARE_THEME_KEYS,
  getStyleConfig,
  IMAGE_SIZE_PRESETS,
  type ImageStyle,
  type ImageSizePreset,
} from "../lib/constants/image-styles";

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

  // Two-step flow state
  const [step, setStep] = useState<"theme" | "preview">("theme");
  const [selectedTheme, setSelectedTheme] = useState<ImageStyle>("modern");
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Share state
  const [linkCopied, setLinkCopied] = useState(false);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  const renderRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledIsOpen ?? showResultShareModal;

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setShowResultShareModal(false);
    }
    // Reset state
    setStep("theme");
    setCapturedImageUrl(null);
    setShareUrl(null);
    setShareError(null);
    setShowSizeDropdown(false);
  }, [onClose, setShowResultShareModal]);

  // Get ranked items for sharing
  const rankedItems = gridItems
    .filter((item) => item.matched)
    .sort((a, b) => a.position - b.position);

  const listTitle = currentList?.title || "My Top 10";
  const category = currentList?.category || "general";
  const subcategory = currentList?.subcategory;
  const timePeriod = currentList?.metadata?.timePeriod;

  const themeConfig = getStyleConfig(selectedTheme);

  // Generate preview image via snapdom
  const handleGeneratePreview = useCallback(async () => {
    if (!renderRef.current) return;
    setIsCapturing(true);
    try {
      const { snapdom } = await import("@zumer/snapdom");
      const canvas = await snapdom.toCanvas(renderRef.current, { scale: 2 });
      const dataUrl = canvas.toDataURL("image/png");
      setCapturedImageUrl(dataUrl);
      setStep("preview");
    } catch (err) {
      console.error("Image capture failed:", err);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // Create shareable link (lazy — only on user action)
  const createShareableLink = useCallback(async () => {
    if (shareUrl) return shareUrl;
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
      broadcastCompletion(listTitle, category, subcategory, rankedItems.length);
      return data.data.share_url as string;
    } catch (error) {
      console.error("Error creating share:", error);
      setShareError(error instanceof Error ? error.message : "Failed to create shareable link");
      return null;
    } finally {
      setIsGeneratingShare(false);
    }
  }, [rankedItems, currentList, tempUserId, listTitle, category, subcategory, timePeriod, broadcastCompletion, shareUrl]);

  // Copy link handler
  const handleCopyLink = useCallback(async () => {
    const url = await createShareableLink();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [createShareableLink]);

  // Social share handler
  const handleSocialShare = useCallback(
    async (platformId: string) => {
      const url = await createShareableLink();
      if (!url) return;

      const text = `I just ranked my ${listTitle}!\n\nThink you can do better? Challenge my ranking:\n${url}`;
      let shareLink = "";

      switch (platformId) {
        case "twitter":
          shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=GOAT,Rankings`;
          break;
        case "facebook":
          shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
          break;
        case "reddit":
          shareLink = `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(`My Top ${rankedItems.length} ${category} - "${listTitle}"`)}`;
          break;
        case "whatsapp":
          shareLink = `https://wa.me/?text=${encodeURIComponent(text)}`;
          break;
        case "discord":
          navigator.clipboard.writeText(url);
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2000);
          return;
      }

      if (shareLink) {
        window.open(shareLink, "_blank", "noopener,noreferrer,width=600,height=400");
      }
    },
    [createShareableLink, category, rankedItems.length, listTitle]
  );

  // Download with optional size preset
  const handleDownload = useCallback(
    async (preset?: ImageSizePreset) => {
      if (!capturedImageUrl) return;

      // If a specific size is requested, re-render at that size
      let downloadUrl = capturedImageUrl;

      if (preset && renderRef.current) {
        try {
          const { snapdom } = await import("@zumer/snapdom");
          const size = IMAGE_SIZE_PRESETS[preset];
          const canvas = await snapdom.toCanvas(renderRef.current, {
            width: size.width,
            height: size.height,
          });
          downloadUrl = canvas.toDataURL("image/png");
        } catch {
          // Fall back to original captured image
        }
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${listTitle.replace(/[^a-zA-Z0-9]/g, "_")}_ranking${preset ? `_${preset}` : ""}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowSizeDropdown(false);
    },
    [capturedImageUrl, listTitle]
  );

  // Skip share
  const handleSkip = useCallback(() => {
    broadcastCompletion(listTitle, category, subcategory, rankedItems.length);
    handleClose();
  }, [broadcastCompletion, listTitle, category, subcategory, rankedItems.length, handleClose]);

  return (
    <>
      {/* Hidden render template for snapdom capture */}
      <div
        ref={renderRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: 1200,
          height: 630,
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: 1200,
            height: 630,
            padding: 48,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            backgroundImage: `linear-gradient(135deg, ${themeConfig.colorPalette[0]}, ${themeConfig.colorPalette[1]}, ${themeConfig.colorPalette[2] || themeConfig.colorPalette[0]})`,
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
              borderRadius: 16,
              padding: 32,
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h1
              style={{
                fontSize: 36,
                fontWeight: 800,
                textAlign: "center",
                marginBottom: 4,
              }}
            >
              {listTitle}
            </h1>
            <p
              style={{
                fontSize: 14,
                opacity: 0.8,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              {category} &bull; Top {rankedItems.length}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {rankedItems.slice(0, 10).map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "8px 16px",
                  }}
                >
                  <span style={{ fontSize: 22, fontWeight: 700, opacity: 0.6, minWidth: 36 }}>
                    {index + 1}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 500 }}>{item.title}</span>
                </div>
              ))}
            </div>
            <p
              style={{
                fontSize: 11,
                opacity: 0.5,
                textAlign: "center",
                marginTop: 16,
              }}
            >
              Created with GOAT
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50"
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
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
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
                      <svg className="w-8 h-8 text-brand-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {step === "theme" ? "Share Your Ranking" : "Preview & Download"}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {step === "theme"
                        ? `Choose a theme for your ${rankedItems.length} item ranking`
                        : "Download or share your ranking image"}
                    </p>
                  </div>

                  <AnimatePresence mode="wait">
                    {step === "theme" ? (
                      <motion.div
                        key="theme-step"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-4"
                      >
                        {/* Theme picker */}
                        <div>
                          <p className="text-sm font-semibold text-gray-300 mb-3">Select Theme</p>
                          <div className="grid grid-cols-3 gap-3">
                            {SHARE_THEME_KEYS.map((theme) => {
                              const config = getStyleConfig(theme);
                              return (
                                <button
                                  key={theme}
                                  onClick={() => setSelectedTheme(theme)}
                                  className={`relative rounded-xl p-3 text-center transition-all ${
                                    selectedTheme === theme
                                      ? "ring-2 ring-cyan-400 bg-white/10 scale-105"
                                      : "bg-white/5 hover:bg-white/10"
                                  }`}
                                  data-testid={`theme-btn-${theme}`}
                                >
                                  {/* Color swatches */}
                                  <div className="flex justify-center gap-1 mb-2">
                                    {config.colorPalette.slice(0, 4).map((color, i) => (
                                      <div
                                        key={i}
                                        className="w-4 h-4 rounded-full border border-white/20"
                                        style={{ backgroundColor: color }}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm font-medium text-white">{config.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Mini preview */}
                        <div
                          className="rounded-xl p-4"
                          style={{
                            background: `linear-gradient(135deg, ${themeConfig.colorPalette[0]}40, ${themeConfig.colorPalette[1]}40)`,
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                          <div className="space-y-1">
                            {rankedItems.slice(0, 3).map((item, index) => (
                              <div key={item.id} className="flex items-center gap-2 text-sm">
                                <span className="text-brand-hover font-bold w-5">{index + 1}.</span>
                                <span className="text-white truncate">{item.title}</span>
                              </div>
                            ))}
                            {rankedItems.length > 3 && (
                              <p className="text-gray-500 text-xs mt-1">+{rankedItems.length - 3} more</p>
                            )}
                          </div>
                        </div>

                        {/* Generate Preview button */}
                        <button
                          onClick={handleGeneratePreview}
                          disabled={isCapturing || rankedItems.length === 0}
                          className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                          style={{
                            background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                            boxShadow: "0 4px 20px rgba(6, 182, 212, 0.3)",
                          }}
                          data-testid="generate-preview-btn"
                        >
                          {isCapturing ? (
                            <>
                              <motion.div
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              Generating Preview...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Generate Preview
                            </>
                          )}
                        </button>

                        {/* Skip */}
                        <button
                          onClick={handleSkip}
                          className="w-full text-gray-500 text-sm hover:text-gray-300 transition-colors"
                          data-testid="share-skip-btn"
                        >
                          Maybe later
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="preview-step"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        {/* Captured image preview */}
                        {capturedImageUrl && (
                          <div className="rounded-xl overflow-hidden border border-white/10">
                            <img
                              src={capturedImageUrl}
                              alt="Your ranking"
                              className="w-full"
                              crossOrigin="anonymous"
                            />
                          </div>
                        )}

                        {/* Error message */}
                        {shareError && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {shareError}
                          </div>
                        )}

                        {/* Copy Link button (prominent) */}
                        <button
                          onClick={handleCopyLink}
                          disabled={isGeneratingShare}
                          className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                          style={{
                            background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
                            boxShadow: "0 4px 20px rgba(6, 182, 212, 0.3)",
                          }}
                          data-testid="share-copy-link-btn"
                        >
                          {isGeneratingShare ? (
                            <>
                              <motion.div
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              Creating Link...
                            </>
                          ) : linkCopied ? (
                            <>
                              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Link Copied!
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              Copy Link
                            </>
                          )}
                        </button>

                        {/* Download with size presets */}
                        <div className="relative">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDownload()}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white bg-green-600 hover:bg-green-500 transition-colors"
                              data-testid="download-btn"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download PNG
                            </button>
                            <button
                              onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                              className="px-3 py-3 rounded-xl font-medium text-white bg-gray-700 hover:bg-gray-600 transition-colors"
                              data-testid="size-preset-btn"
                              title="Download for specific platform"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>

                          {/* Size dropdown */}
                          <AnimatePresence>
                            {showSizeDropdown && (
                              <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="absolute top-full mt-2 right-0 w-56 rounded-xl overflow-hidden z-20"
                                style={{
                                  background: "rgba(20, 28, 48, 0.98)",
                                  border: "1px solid rgba(255,255,255,0.1)",
                                }}
                              >
                                {(Object.entries(IMAGE_SIZE_PRESETS) as [ImageSizePreset, typeof IMAGE_SIZE_PRESETS[ImageSizePreset]][]).map(
                                  ([key, preset]) => (
                                    <button
                                      key={key}
                                      onClick={() => handleDownload(key)}
                                      className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                                      data-testid={`download-${key}-btn`}
                                    >
                                      {preset.label}
                                      <span className="text-gray-500 ml-1 text-xs">
                                        {preset.width}x{preset.height}
                                      </span>
                                    </button>
                                  )
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Social platform buttons */}
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Share on</p>
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
                        </div>

                        {/* Back button */}
                        <button
                          onClick={() => {
                            setStep("theme");
                            setCapturedImageUrl(null);
                          }}
                          className="w-full text-gray-500 text-sm hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
                          data-testid="share-back-btn"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          Back to Theme Picker
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
