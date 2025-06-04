"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShowcaseCard } from "./ShowcaseCard";
import { BannedShowcaseCard } from "./BannedShowcaseCard";
import { CompositionModal } from "./CompositionModal";
import { ShowcaseHeader } from "./ShowcaseHeader";
import { showcaseData } from "@/app/constants/showCaseExamples";
import { FloatingParticles } from "@/app/components/decorations/particles";
import ShowcaseDecor from "@/app/components/decorations/ShowCaseDecor";

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
                <ShowcaseDecor />

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

                <FloatingParticles />
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