"use client";

/**
 * Particle Theme Settings Panel
 * Allows users to select particle themes and manage theme packs
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Check, Volume2, VolumeX, Smartphone, ShoppingCart, Sparkles } from 'lucide-react';
import { useParticleThemeStore } from '@/stores/particle-theme-store';
import { ALL_THEME_PACKS } from '@/lib/particle-themes/theme-configs';
import type { ParticleThemeConfig, ParticleThemePack } from '@/types/particle-theme.types';

interface ParticleThemeSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ParticleThemeSettings({ isOpen, onClose }: ParticleThemeSettingsProps) {
  const [selectedPack, setSelectedPack] = useState<string>('free-pack');

  const {
    activeThemeId,
    setActiveTheme,
    soundEnabled,
    toggleSound,
    hapticEnabled,
    toggleHaptic,
    isThemeUnlocked,
    ownedPackIds,
    purchasePack,
  } = useParticleThemeStore();

  const handleThemeSelect = (themeId: string) => {
    if (isThemeUnlocked(themeId)) {
      setActiveTheme(themeId);
    }
  };

  const handlePurchasePack = (packId: string) => {
    // In production, integrate with payment system (Stripe, Apple Pay, etc.)
    // For now, simulate purchase
    purchasePack(packId);
  };

  const selectedPackData = ALL_THEME_PACKS.find((pack) => pack.id === selectedPack);
  const isPackOwned = ownedPackIds.includes(selectedPack);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
            data-testid="particle-theme-settings-backdrop"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="w-full max-w-5xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-xl">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Particle Themes</h2>
                        <p className="text-sm text-gray-400">Customize your swipe animations</p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                      data-testid="close-theme-settings-btn"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Settings Toggle Row */}
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={toggleSound}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        soundEnabled
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                      }`}
                      data-testid="toggle-sound-btn"
                    >
                      {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      <span className="text-sm font-medium">Sound {soundEnabled ? 'On' : 'Off'}</span>
                    </button>
                    <button
                      onClick={toggleHaptic}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        hapticEnabled
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                      }`}
                      data-testid="toggle-haptic-btn"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span className="text-sm font-medium">Haptic {hapticEnabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex h-[600px]">
                  {/* Sidebar - Theme Packs */}
                  <div className="w-64 bg-gray-900/50 border-r border-gray-700 p-4 overflow-y-auto">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Theme Packs</h3>
                    <div className="space-y-2">
                      {ALL_THEME_PACKS.map((pack) => {
                        const owned = ownedPackIds.includes(pack.id);
                        const isSelected = selectedPack === pack.id;

                        return (
                          <button
                            key={pack.id}
                            onClick={() => setSelectedPack(pack.id)}
                            className={`w-full text-left p-3 rounded-lg transition-all ${
                              isSelected
                                ? 'bg-purple-500/20 border border-purple-500/50'
                                : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-800'
                            }`}
                            data-testid={`theme-pack-${pack.id}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-white text-sm">{pack.name}</span>
                              {!owned && pack.price > 0 && (
                                <span className="text-xs text-green-400 font-semibold">
                                  ${(pack.price / 100).toFixed(2)}
                                </span>
                              )}
                              {owned && (
                                <Check className="w-4 h-4 text-green-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{pack.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Main Content - Themes */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    {selectedPackData && (
                      <>
                        {/* Pack Header */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-white">{selectedPackData.name}</h3>
                            {!isPackOwned && selectedPackData.price > 0 && (
                              <button
                                onClick={() => handlePurchasePack(selectedPackData.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all shadow-lg"
                                data-testid={`purchase-pack-btn-${selectedPackData.id}`}
                              >
                                <ShoppingCart className="w-4 h-4" />
                                Purchase ${(selectedPackData.price / 100).toFixed(2)}
                              </button>
                            )}
                          </div>
                          <p className="text-gray-400">{selectedPackData.description}</p>
                        </div>

                        {/* Theme Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          {selectedPackData.themes.map((theme) => {
                            const isActive = activeThemeId === theme.id;
                            const isLocked = !isThemeUnlocked(theme.id);

                            return (
                              <motion.button
                                key={theme.id}
                                onClick={() => handleThemeSelect(theme.id)}
                                disabled={isLocked}
                                className={`relative p-4 rounded-xl border transition-all ${
                                  isActive
                                    ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                                    : isLocked
                                    ? 'border-gray-700 bg-gray-800/30 opacity-60 cursor-not-allowed'
                                    : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600'
                                }`}
                                whileHover={!isLocked ? { scale: 1.02 } : {}}
                                whileTap={!isLocked ? { scale: 0.98 } : {}}
                                data-testid={`theme-option-${theme.id}`}
                              >
                                {/* Active Indicator */}
                                {isActive && (
                                  <div className="absolute top-2 right-2 bg-purple-500 rounded-full p-1">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                )}

                                {/* Lock Indicator */}
                                {isLocked && (
                                  <div className="absolute top-2 right-2 bg-gray-700 rounded-full p-1">
                                    <Lock className="w-4 h-4 text-gray-400" />
                                  </div>
                                )}

                                {/* Theme Preview */}
                                <div className="mb-3">
                                  <div className="flex gap-2 justify-center mb-2">
                                    {theme.colors.right.slice(0, 3).map((color, idx) => (
                                      <div
                                        key={idx}
                                        className="w-8 h-8 rounded-full"
                                        style={{
                                          background: color,
                                          boxShadow: `0 0 12px ${color}`,
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>

                                {/* Theme Info */}
                                <div className="text-center">
                                  <h4 className="font-semibold text-white mb-1">{theme.name}</h4>
                                  <p className="text-xs text-gray-400 mb-2">{theme.description}</p>
                                  <div className="flex justify-center gap-2 text-xs text-gray-500">
                                    <span>{theme.particleCount} particles</span>
                                    <span>•</span>
                                    <span>{theme.shape}</span>
                                  </div>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-900/80 border-t border-gray-700 px-6 py-4">
                  <p className="text-xs text-gray-400 text-center">
                    Premium themes include exclusive particle shapes and sound effects
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
