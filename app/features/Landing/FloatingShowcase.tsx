"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShowcaseCard } from "./ShowcaseCard";
import { BannedShowcaseCard } from "./BannedShowcaseCard";
import { CompositionModal } from "./CompositionModal";
import { ShowcaseHeader } from "./ShowcaseHeader";
import { showcaseData } from "@/app/constants/showCaseExamples";
import { FloatingParticles } from "@/app/components/decorations/particles";
import ShowcaseDecor from "@/app/components/decorations/ShowcaseDecor";

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

export function FloatingShowcase() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCardData, setSelectedCardData] = useState<SelectedCardData>({
        category: "Sports",
        subcategory: "Basketball",
        timePeriod: "all-time",
        hierarchy: "Top 50",
        title: "Create Your Ranking",
        author: "You",
        comment: "Build your ultimate ranking",
        color: {
            primary: "#f59e0b",
            secondary: "#d97706",
            accent: "#fbbf24",
        }
    });

    const handleCardClick = (cardData: SelectedCardData) => {
        console.log("Card clicked with data:", cardData);
        setSelectedCardData(cardData);
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
                            delay: index * 0.2 + 1,
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

            {/* Composition Modal with Dynamic Data */}
            <CompositionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialCategory={selectedCardData.category}
                initialSubcategory={selectedCardData.subcategory}
                initialTimePeriod={selectedCardData.timePeriod}
                initialHierarchy={selectedCardData.hierarchy}
                initialTitle={selectedCardData.title}
                initialAuthor={selectedCardData.author}
                initialComment={selectedCardData.comment}
                initialColor={selectedCardData.color}
                onSuccess={(result) => {
                    console.log("List creation result:", result);
                    if (result.success) {
                        console.log(`Successfully created list: ${result.listId}`);
                    }
                }}
            />
        </>
    );
}