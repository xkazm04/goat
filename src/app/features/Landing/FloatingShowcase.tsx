"use client";

import { memo, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { ShowcaseCard } from "./ShowcaseCard";
import { BannedShowcaseCard } from "./BannedShowcaseCard";
import { ShowcaseHeader } from "./ShowcaseHeader";
import { showcaseData, LegacyShowcaseItem } from "@/lib/constants/showCaseExamples";
import ShowcaseDecor from "@/components/app/decorations/ShowcaseDecor";
import { staggerContainer, useCardClickHandler } from "./shared";
import type { ShowcaseCardData } from "./types";
import { useAnimationPause } from "@/hooks/use-animation-pause";
import { useMotionCapabilities } from "@/hooks/use-motion-preference";
import { usePersonalization, type ContentItem } from "@/lib/personalization";

// Default color fallback for items missing color properties
const DEFAULT_COLOR = {
    primary: "rgba(6,182,212,0.8)",
    secondary: "rgba(8,145,178,0.8)",
    accent: "rgba(34,211,238,0.8)",
};

// Default position fallback for items missing position properties
const DEFAULT_POSITION = { x: 50, y: 50 };

// Validates that a showcase item has all required properties
function isValidShowcaseItem(item: unknown): item is LegacyShowcaseItem {
    if (!item || typeof item !== "object") return false;
    const obj = item as Record<string, unknown>;

    // Required fields
    if (typeof obj.id !== "number") return false;
    if (typeof obj.title !== "string" || !obj.title) return false;
    if (typeof obj.category !== "string" || !obj.category) return false;

    return true;
}

// Normalizes a showcase item by providing defaults for missing optional properties
function normalizeShowcaseItem(item: LegacyShowcaseItem): LegacyShowcaseItem {
    return {
        ...item,
        position: item.position && typeof item.position.x === "number" && typeof item.position.y === "number"
            ? item.position
            : DEFAULT_POSITION,
        color: item.color && item.color.primary
            ? item.color
            : DEFAULT_COLOR,
        rotation: typeof item.rotation === "number" ? item.rotation : 0,
        scale: typeof item.scale === "number" && item.scale > 0 ? item.scale : 1,
    };
}

// 3D perspective card variants
const cardVariants = {
    hidden: (index: number) => ({
        opacity: 0,
        y: 120,
        rotateX: -15,
        rotateY: index % 2 === 0 ? -10 : 10,
        scale: 0.8,
    }),
    visible: (index: number) => ({
        opacity: 1,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        transition: {
            duration: 1,
            delay: index * 0.15 + 0.8,
            type: "spring" as const,
            stiffness: 80,
            damping: 15,
        },
    }),
};

// Convert showcase item to content item for personalization
function toContentItem(item: LegacyShowcaseItem, index: number): ContentItem {
    return {
        id: item.id,
        category: item.category,
        subcategory: item.subcategory,
        popularity: 70 + Math.random() * 30, // Simulated for now
        trending: index <= 3, // First 3 items are considered trending
    };
}

export const FloatingShowcase = memo(function FloatingShowcase() {
    const handleCardClick = useCardClickHandler();
    const {
        ref: animationRef,
        shouldAnimate,
        animationClass,
    } = useAnimationPause({ rootMargin: "200px" });
    const { allowAmbient, allowInteraction, allowTransitions } = useMotionCapabilities();

    // Personalization hook
    const {
        isInitialized,
        isPersonalized,
        personalizeItems,
        trackClick,
        topInterests
    } = usePersonalization();

    // Validate and normalize showcase data, filtering out invalid items
    const validatedShowcaseData = useMemo(() => {
        if (!Array.isArray(showcaseData) || showcaseData.length === 0) {
            return [];
        }
        return showcaseData
            .filter(isValidShowcaseItem)
            .map(normalizeShowcaseItem);
    }, []);

    // Personalize the showcase data based on user interests
    const personalizedShowcaseData = useMemo(() => {
        if (!isInitialized || validatedShowcaseData.length === 0) {
            return validatedShowcaseData;
        }

        // Convert to content items for scoring
        const contentItems = validatedShowcaseData.map((item, index) => ({
            ...toContentItem(item, index),
            originalItem: item,
        }));

        // Score and sort by personalization
        const scored = personalizeItems(contentItems);

        // Sort by relevance but keep position-based layout
        // Higher relevance items get better positions (lower index)
        const sorted = [...scored].sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Map back to original items with adjusted scales based on relevance
        return sorted.map((scored, index) => {
            const item = (scored.item as typeof contentItems[0]).originalItem;
            // Boost scale for highly relevant items
            const relevanceBoost = scored.relevanceScore > 70 ? 0.1 : 0;
            return {
                ...item,
                scale: Math.min(1.3, (item.scale || 1) + relevanceBoost),
                // Store personalization info for potential UI indicators
                _personalization: {
                    relevanceScore: scored.relevanceScore,
                    reason: scored.selectionReason,
                },
            };
        });
    }, [isInitialized, validatedShowcaseData, personalizeItems]);

    // Handle card click with tracking
    const handlePersonalizedCardClick = useCallback((cardData: ShowcaseCardData) => {
        // Track the click for personalization
        trackClick(cardData.category, cardData.title);
        // Call original handler
        handleCardClick(cardData);
    }, [handleCardClick, trackClick]);

    // Early return if no valid showcase data - render header only with empty state
    if (validatedShowcaseData.length === 0) {
        return (
            <div
                ref={animationRef}
                className={`relative w-full h-screen ${animationClass}`}
                style={{ perspective: "1500px" }}
                data-testid="floating-showcase"
            >
                <ShowcaseHeader />
                <ShowcaseDecor shouldAnimate={shouldAnimate} />
                <div
                    className="absolute inset-0 flex items-center justify-center"
                    data-testid="floating-showcase-empty"
                >
                    <p className="text-muted-foreground text-sm opacity-50">
                        No showcase items available
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={animationRef}
            className={`relative w-full h-screen ${animationClass}`}
            style={{ perspective: "1500px" }}
            data-testid="floating-showcase"
        >
            {/* Background decor - lowest z-index */}
            <div className="absolute inset-0 z-0">
                <ShowcaseDecor shouldAnimate={shouldAnimate} />
            </div>

            {/* Noise texture overlay - adds tactile quality */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none noise-texture"
                aria-hidden="true"
            />

            {/* Header - above decor */}
            <div className="relative z-10">
                <ShowcaseHeader />
            </div>

            {/* Personalization indicator for returning users */}
            {isPersonalized && topInterests.length > 0 && (
                <motion.div
                    className="absolute top-24 left-1/2 -translate-x-1/2 z-20"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                >
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10">
                        <span className="text-xs text-white/50">Personalized for you</span>
                        <div className="flex gap-1">
                            {topInterests.slice(0, 3).map((interest) => (
                                <span
                                    key={interest.category}
                                    className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400"
                                >
                                    {interest.category}
                                </span>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Floating Cards with 3D transforms - z-5 to be above decor but below header */}
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="absolute inset-0 z-[5]"
                style={{ transformStyle: "preserve-3d" }}
                data-testid="floating-showcase-cards-container"
            >
                {personalizedShowcaseData.map((item, index) => {
                    // CSS custom properties for card float animation
                    const cardCssVars = {
                        "--card-float-duration": `${4 + index * 0.5}s`,
                        "--card-float-delay": `${index * 0.3}s`,
                    } as React.CSSProperties;

                    // Only apply float animation in full tier when animations should play
                    const shouldFloat = shouldAnimate && allowAmbient;

                    return (
                        <motion.div
                            key={item.id}
                            custom={index}
                            variants={allowTransitions ? cardVariants : undefined}
                            initial={allowTransitions ? "hidden" : undefined}
                            animate={allowTransitions ? "visible" : undefined}
                            className={`absolute cursor-pointer ${shouldFloat ? "animate-ambient-card-float" : ""}`}
                            style={{
                                ...cardCssVars,
                                left: `${item.position.x}%`,
                                top: `${item.position.y}%`,
                                transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                                transformStyle: "preserve-3d",
                                zIndex: Math.round(item.scale * 10),
                            }}
                            whileHover={allowInteraction ? {
                                scale: item.scale * 1.08,
                                rotateY: item.rotation * 0.3,
                                rotateX: -5,
                                z: 80,
                                transition: {
                                    duration: allowTransitions ? 0.4 : 0,
                                    ease: [0.23, 1, 0.32, 1]
                                },
                            } : undefined}
                            whileTap={allowInteraction ? { scale: item.scale * 0.98 } : undefined}
                            data-testid={`showcase-card-${item.id}`}
                            data-framer-motion-reducible="true"
                        >
                            {/* Card glow effect */}
                            <div
                                className="absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                                style={{
                                    background: `radial-gradient(circle, ${item.color.primary} 0%, transparent 70%)`,
                                }}
                            />

                            {item.isBanned ? (
                                <BannedShowcaseCard {...item} onCardClick={handlePersonalizedCardClick} />
                            ) : (
                                <ShowcaseCard {...item} onCardClick={handlePersonalizedCardClick} />
                            )}
                        </motion.div>
                    );
                })}
            </motion.div>


        </div>
    );
});