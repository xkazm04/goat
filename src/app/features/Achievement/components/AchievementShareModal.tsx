"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Check, Download, Settings2, Eye } from "lucide-react";
import {
  Achievement,
  AchievementCardConfig,
  AchievementCardStyle,
  ACHIEVEMENT_SHARE_PLATFORMS,
  TIER_CONFIG,
} from "@/types/achievement";
import { AchievementCard } from "./AchievementCard";

interface AchievementShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievement: Achievement;
  username?: string;
  userAvatar?: string;
}

const STYLE_OPTIONS: { value: AchievementCardStyle; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'vibrant', label: 'Vibrant' },
  { value: 'dark', label: 'Dark' },
  { value: 'neon', label: 'Neon' },
];

export function AchievementShareModal({
  isOpen,
  onClose,
  achievement,
  username,
  userAvatar,
}: AchievementShareModalProps) {
  const [activeTab, setActiveTab] = useState<'customize' | 'share'>('customize');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Card customization options
  const [config, setConfig] = useState<AchievementCardConfig>({
    style: 'default',
    showUsername: true,
    showProgress: true,
    showRarity: true,
    showDate: true,
    animated: false, // Disable for preview/share
  });

  const tierConfig = TIER_CONFIG[achievement.tier];

  // Generate shareable link
  const generateShareLink = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/achievement/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          achievement_id: achievement.id,
          config,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create shareable link');
      }

      setShareUrl(data.data.share_url);
      setActiveTab('share');
    } catch (err) {
      console.error('Error creating share:', err);
      setError(err instanceof Error ? err.message : 'Failed to create shareable link');
    } finally {
      setIsGenerating(false);
    }
  }, [achievement.id, config]);

  // Handle social share
  const handleSocialShare = useCallback((platformId: string) => {
    if (!shareUrl) return;

    const platform = ACHIEVEMENT_SHARE_PLATFORMS.find(p => p.id === platformId);
    if (!platform) return;

    const text = `I just unlocked "${achievement.title}" on G.O.A.T.! 🏆`;
    const url = platform.generateUrl(shareUrl, text);

    if (platformId === 'discord') {
      // Discord picks up OG metadata when URL is pasted
      navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  }, [shareUrl, achievement.title]);

  // Copy link
  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareUrl]);

  // Download image (placeholder - would require canvas rendering)
  const handleDownload = useCallback(() => {
    // This would require server-side image generation
    // For now, show a message
    alert('Image download coming soon!');
  }, []);

  // Native share (mobile)
  const handleNativeShare = useCallback(async () => {
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: `${achievement.title} - G.O.A.T. Achievement`,
          text: `I just unlocked "${achievement.title}"!`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  }, [achievement.title, shareUrl]);

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
            onClick={onClose}
            data-testid="achievement-share-backdrop"
          />

          {/* Modal */}
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            data-testid="achievement-share-modal"
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
                  0 0 100px ${tierConfig.glow},
                  inset 0 1px 0 rgba(255, 255, 255, 0.05)
                `,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: tierConfig.gradient }}
                  >
                    🏆
                  </span>
                  Share Achievement
                </h2>

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                  data-testid="achievement-share-close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setActiveTab('customize')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'customize'
                      ? 'text-white border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  Customize
                </button>
                <button
                  onClick={() => setActiveTab('share')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'share'
                      ? 'text-white border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  disabled={!shareUrl}
                >
                  <Link2 className="w-4 h-4" />
                  Share
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'customize' ? (
                    <motion.div
                      key="customize"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6"
                    >
                      {/* Preview */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-400">Preview</span>
                        </div>
                        <div className="transform scale-90 origin-top">
                          <AchievementCard
                            achievement={achievement}
                            config={config}
                            username={config.showUsername ? username : undefined}
                            userAvatar={config.showUsername ? userAvatar : undefined}
                          />
                        </div>
                      </div>

                      {/* Style selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Card Style
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {STYLE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setConfig(c => ({ ...c, style: option.value }))}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                config.style === option.value
                                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Toggle options */}
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { key: 'showUsername', label: 'Show Username' },
                          { key: 'showProgress', label: 'Show Progress' },
                          { key: 'showRarity', label: 'Show Rarity' },
                          { key: 'showDate', label: 'Show Date' },
                        ].map(({ key, label }) => (
                          <label
                            key={key}
                            className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={config[key as keyof AchievementCardConfig] as boolean}
                              onChange={(e) =>
                                setConfig(c => ({ ...c, [key]: e.target.checked }))
                              }
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                            />
                            <span className="text-sm text-gray-300">{label}</span>
                          </label>
                        ))}
                      </div>

                      {/* Error message */}
                      {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          {error}
                        </div>
                      )}

                      {/* Generate button */}
                      <button
                        onClick={generateShareLink}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                        style={{
                          background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
                          boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
                        }}
                        data-testid="achievement-generate-link"
                      >
                        {isGenerating ? (
                          <>
                            <motion.div
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Link2 className="w-5 h-5" />
                            Generate Shareable Link
                          </>
                        )}
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="share"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      {/* Share URL display */}
                      {shareUrl && (
                        <div
                          className="flex items-center gap-2 p-3 rounded-lg"
                          style={{
                            background: 'rgba(6, 182, 212, 0.1)',
                            border: '1px solid rgba(6, 182, 212, 0.2)',
                          }}
                        >
                          <Link2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                          <span className="text-sm text-cyan-300 truncate flex-1">{shareUrl}</span>
                          <button
                            onClick={handleCopyLink}
                            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                            data-testid="achievement-copy-link"
                          >
                            {linkCopied ? (
                              <Check className="w-4 h-4 text-green-400" />
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
                      <div>
                        <p className="text-sm text-gray-400 mb-3">Share to</p>
                        <div className="grid grid-cols-5 gap-3">
                          {ACHIEVEMENT_SHARE_PLATFORMS.map((platform) => (
                            <button
                              key={platform.id}
                              onClick={() => handleSocialShare(platform.id)}
                              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
                              style={{
                                background: `${platform.color}15`,
                                border: `1px solid ${platform.color}40`,
                              }}
                              data-testid={`achievement-share-${platform.id}`}
                            >
                              <svg
                                className="w-6 h-6"
                                style={{ color: platform.color }}
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d={platform.icon} />
                              </svg>
                              <span className="text-[10px] text-gray-400">{platform.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Additional actions */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Download image */}
                        <button
                          onClick={handleDownload}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white transition-all hover:bg-white/10"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <Download className="w-5 h-5" />
                          Download Image
                        </button>

                        {/* Native share (mobile) */}
                        {typeof navigator !== 'undefined' && 'share' in navigator && (
                          <button
                            onClick={handleNativeShare}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white transition-all hover:scale-[1.02]"
                            style={{
                              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.8), rgba(34, 211, 238, 0.6))',
                            }}
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
                      </div>

                      {/* Embed code */}
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Embed Code</p>
                        <div
                          className="p-3 rounded-lg font-mono text-xs text-gray-400 overflow-x-auto"
                          style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                        >
                          {`<iframe src="${shareUrl}/embed" width="400" height="300" frameborder="0"></iframe>`}
                        </div>
                      </div>

                      {/* Back button */}
                      <button
                        onClick={() => setActiveTab('customize')}
                        className="w-full text-gray-500 text-sm hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Customize
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
  );
}
