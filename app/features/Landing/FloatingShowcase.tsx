"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Music, Gamepad2, Film, Book } from "lucide-react";
import { ShowcaseCard } from "./ShowcaseCard";
import { BannedShowcaseCard } from "./BannedShowcaseCard";
import { CompositionModal } from "./CompositionModal";
import Image from "next/image";
import { ShowcaseHeader } from "./ShowcaseHeader";

const showcaseData = [
    {
        id: 1,
        category: "Sports",
        title: "Top 50 NBA Players",
        author: "@mbj",
        comment: "never lost in finals",
        icon: Trophy,
        color: {
            primary: "#f59e0b",
            secondary: "#d97706",
            accent: "#fbbf24",
        },
        position: { x: 10, y: 20 },
        rotation: -5,
        scale: 1.0,
    },
    {
        id: 2,
        category: "Games",
        title: "Greatest Video Games",
        author: "@gamer_pro",
        comment: "timeless classics that changed everything",
        icon: Gamepad2,
        color: {
            primary: "#8b5cf6",
            secondary: "#7c3aed",
            accent: "#a78bfa",
        },
        position: { x: 65, y: 15 },
        rotation: 3,
        scale: 0.9,
    },
    {
        id: 3,
        category: "Music",
        title: "Top Hip-Hop Tracks",
        author: "@music_head",
        comment: "beats that defined generations",
        icon: Music,
        color: {
            primary: "#ef4444",
            secondary: "#dc2626",
            accent: "#f87171",
        },
        position: { x: 20, y: 60 },
        rotation: 2,
        scale: 1.1,
        isBanned: true, // Special flag for banned card
    },
    {
        id: 4,
        category: "Stories",
        title: "Sci-Fi Masterpieces",
        author: "@film_buff",
        comment: "mind-bending cinema at its finest",
        icon: Film,
        color: {
            primary: "#06b6d4",
            secondary: "#0891b2",
            accent: "#22d3ee",
        },
        position: { x: 70, y: 65 },
        rotation: -3,
        scale: 0.85,
    },
    {
        id: 5,
        category: "Stories",
        title: "Fantasy Novels",
        author: "@book_worm",
        comment: "worlds beyond imagination",
        icon: Book,
        color: {
            primary: "#10b981",
            secondary: "#059669",
            accent: "#34d399",
        },
        position: { x: 45, y: 40 },
        rotation: 1,
        scale: 0.95,
    },
];

export function FloatingShowcase() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("Sports");
    const [selectedColor, setSelectedColor] = useState({
        primary: "#f59e0b",
        secondary: "#d97706",
        accent: "#fbbf24",
    });

    const handleCardClick = (category: string, color: any) => {
        setSelectedCategory(category);
        setSelectedColor(color);
        setIsModalOpen(true);
    };

    return (
        <>
            <div className="relative w-full h-screen overflow-hidden">
                <ShowcaseHeader />
                {/* Animated Goat Background Image */}
                <motion.div
                    className="absolute inset-0 w-full h-full"
                    initial={{ opacity:0, x: "-40%" }}
                    animate={{ opacity:5, x: "-20%" }}
                    transition={{
                        duration: 5,
                    }}
                >
                    <Image 
                        src="/goat.png"
                        alt="GOAT Background"
                        fill
                        className="object-cover opacity-5"
                        style={{
                            objectPosition: "left center",
                            transform: "translateX(-20%)"
                        }}
                        priority
                    />
                </motion.div>

                {/* Background gradient overlay to ensure readability */}
                <div 
                    className="absolute inset-0"
                    style={{
                        background: `
                            linear-gradient(135deg, 
                                rgba(15, 23, 42, 0.3) 0%,
                                rgba(30, 41, 59, 0.2) 25%,
                                rgba(51, 65, 85, 0.1) 50%,
                                rgba(30, 41, 59, 0.2) 75%,
                                rgba(15, 23, 42, 0.3) 100%
                            )
                        `
                    }}
                />

                {/* Floating Cards */}
                {showcaseData.map((item, index) => (
                    <motion.div
                        key={item.id}
                        className="absolute"
                        style={{
                            left: `${item.position.x}%`,
                            top: `${item.position.y}%`,
                            transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                        }}
                        initial={{ opacity: 0, y: 100, rotate: item.rotation + 10 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            rotate: item.rotation,
                            scale: item.scale,
                        }}
                        transition={{
                            duration: 0.8,
                            delay: index * 0.2 + 1, // Delay to let goat animate first
                            type: "spring",
                            stiffness: 100,
                        }}
                        whileHover={{
                            scale: item.scale * 1.05,
                            rotate: item.rotation * 0.5,
                            z: 50,
                            transition: { duration: 0.3 },
                        }}
                    >
                        {item.isBanned ? (
                            <BannedShowcaseCard {...item} onCardClick={handleCardClick} />
                        ) : (
                            <ShowcaseCard {...item} onCardClick={handleCardClick} />
                        )}
                    </motion.div>
                ))}

                {/* Floating particles/decorations */}
                <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full opacity-20"
                            style={{
                                background: `linear-gradient(45deg, #3b82f6, #8b5cf6)`,
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                y: [0, -20, 0],
                                opacity: [0.2, 0.5, 0.2],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{
                                duration: 3 + Math.random() * 2,
                                repeat: Infinity,
                                delay: Math.random() * 2 + 1.5, // Delay to let initial animation finish
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Composition Modal */}
            <CompositionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialCategory={selectedCategory}
                initialColor={selectedColor}
            />
        </>
    );
}