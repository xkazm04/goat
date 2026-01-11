"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { ShowcaseCard } from "./ShowcaseCard";
import { BannedShowcaseCard } from "./BannedShowcaseCard";
import { ShowcaseHeader } from "./ShowcaseHeader";
import { showcaseData, LegacyShowcaseItem } from "@/lib/constants/showCaseExamples";
import ShowcaseDecor from "@/components/app/decorations/ShowcaseDecor";
import { staggerContainer, useCardClickHandler } from "./shared";
import { useAnimationPause } from "@/hooks/use-animation-pause";
import { useMotionCapabilities } from "@/hooks/use-motion-preference";

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

export const FloatingShowcase = memo(function FloatingShowcase() {
    const handleCardClick = useCardClickHandler();
    const {
        ref: animationRef,
        shouldAnimate,
        animationClass,
    } = useAnimationPause({ rootMargin: "200px" });
    const { allowAmbient, allowInteraction, allowTransitions } = useMotionCapabilities();

    // Validate and normalize showcase data, filtering out invalid items
    const validatedShowcaseData = useMemo(() => {
        if (!Array.isArray(showcaseData) || showcaseData.length === 0) {
            return [];
        }
        return showcaseData
            .filter(isValidShowcaseItem)
            .map(normalizeShowcaseItem);
    }, []);

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
            <ShowcaseHeader />
            <ShowcaseDecor shouldAnimate={shouldAnimate} />

            {/* Floating Cards with 3D transforms */}
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
                data-testid="floating-showcase-cards-container"
            >
                {validatedShowcaseData.map((item, index) => {
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
                                <BannedShowcaseCard {...item} onCardClick={handleCardClick} />
                            ) : (
                                <ShowcaseCard {...item} onCardClick={handleCardClick} />
                            )}
                        </motion.div>
                    );
                })}
            </motion.div>


        </div>
    );
});