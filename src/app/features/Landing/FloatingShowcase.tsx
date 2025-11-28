"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ShowcaseCard } from "./ShowcaseCard";
import { BannedShowcaseCard } from "./BannedShowcaseCard";
import { ShowcaseHeader } from "./ShowcaseHeader";
import { showcaseData } from "@/lib/constants/showCaseExamples";
import { FloatingParticles } from "@/components/app/decorations/particles";
import ShowcaseDecor from "@/components/app/decorations/ShowcaseDecor";
import { useComposition } from "@/hooks/use-composition";
import { staggerContainer, floatAnimation } from "./shared";

interface SelectedCardData {
    category: string;
    subcategory?: string;
    timePeriod: "all-time" | "decade" | "year";
    hierarchy: string;
    title: string;
    author: string;
    comment: string;
    color: {
        primary: string;
        secondary: string;
        accent: string;
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

export function FloatingShowcase() {
    const { openWithPreset } = useComposition();
    const prefersReducedMotion = useReducedMotion();

    const handleCardClick = (cardData: SelectedCardData) => {
        openWithPreset({
            category: cardData.category,
            subcategory: cardData.subcategory,
            timePeriod: cardData.timePeriod,
            hierarchy: cardData.hierarchy,
            title: cardData.title,
            color: cardData.color
        });
    };

    return (
        <div className="relative w-full h-screen overflow-hidden" style={{ perspective: "1500px" }}>
            {/* Ambient gradient layers - matching MatchGrid theme */}
            <div className="absolute inset-0 bg-[#050505]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12)_0%,transparent_60%)]" />
            
            {/* Neon grid overlay - matching MatchGrid pattern */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(0deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent),
                                      linear-gradient(90deg, transparent 24%, #22d3ee 25%, #22d3ee 26%, transparent 27%, transparent 74%, #22d3ee 75%, #22d3ee 76%, transparent 77%, transparent)`,
                    backgroundSize: "60px 60px",
                }}
            />

            <ShowcaseHeader />
            <ShowcaseDecor />

            {/* Floating Cards with 3D transforms */}
            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
            >
                {showcaseData.map((item, index) => (
                    <motion.div
                        key={item.id}
                        custom={index}
                        variants={cardVariants}
                        className="absolute cursor-pointer"
                        style={{
                            left: `${item.position.x}%`,
                            top: `${item.position.y}%`,
                            transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                            transformStyle: "preserve-3d",
                            zIndex: Math.round(item.scale * 10),
                        }}
                        whileHover={{
                            scale: item.scale * 1.08,
                            rotateY: item.rotation * 0.3,
                            rotateX: -5,
                            z: 80,
                            transition: { 
                                duration: 0.4, 
                                ease: [0.23, 1, 0.32, 1] 
                            },
                        }}
                        whileTap={{ scale: item.scale * 0.98 }}
                        animate={prefersReducedMotion ? {} : {
                            y: [0, -8, 0],
                            transition: {
                                duration: 4 + index * 0.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: index * 0.3,
                            }
                        }}
                    >
                        {/* Card glow effect */}
                        <div 
                            className="absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                            style={{
                                background: `radial-gradient(circle, ${item.color?.primary || 'rgba(6,182,212,0.3)'} 0%, transparent 70%)`,
                            }}
                        />
                        
                        {item.isBanned ? (
                            <BannedShowcaseCard {...item} onCardClick={handleCardClick} />
                        ) : (
                            <ShowcaseCard {...item} onCardClick={handleCardClick} />
                        )}
                    </motion.div>
                ))}
            </motion.div>

            {/* Enhanced floating orbs - cyan theme matching MatchGrid */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
                }}
                animate={{
                    x: [0, 50, 0],
                    y: [0, -30, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />
            <motion.div
                className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)",
                }}
                animate={{
                    x: [0, -40, 0],
                    y: [0, 40, 0],
                    scale: [1, 1.15, 1],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            <FloatingParticles />
        </div>
    );
}