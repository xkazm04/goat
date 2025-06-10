import { motion } from "framer-motion";
import { useItemStore } from "@/app/stores/item-store";
import { useCurrentList } from "@/app/stores/use-list-store";
import { useMemo, useState } from "react";
import { CompletionModal } from "./modals/completion/CompletionModal";
import ShowcaseDecor from "./decorations/ShowcaseDecor";
import { getCenterTextStyles, getProgressLineStyles } from "../helpers/getCompletionStyles";

interface ProgressMainProps {
    text: string;
    showPercentage?: boolean;
    className?: string;
}

const ProgressMain = ({ text, showPercentage = true, className = "" }: ProgressMainProps) => {
    const currentList = useCurrentList();
    const { gridItems } = useItemStore();
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

    const { totalSize, progressPercentage, isCompleted } = useMemo(() => {
        if (!currentList) {
            return { matchedCount: 0, totalSize: 50, progressPercentage: 0, isCompleted: false };
        }

        const matched = gridItems.filter(item => item.matched).length;
        const total = currentList.size || 50;
        const percentage = total > 0 ? (matched / total) * 100 : 0;
        const completed = percentage >= 100;

        console.log('Progress calculation:', { matched, total, percentage, completed });

        return {
            matchedCount: matched,
            totalSize: total,
            progressPercentage: percentage,
            isCompleted: completed
        };
    }, [currentList, gridItems]);

    const handleCenterClick = () => {
        if (isCompleted) {
            setIsCompletionModalOpen(true);
        }
    };



    return (
        <>
            <div className="flex flex-col gap-2 justify-center w-full">
                {/* Progress Badge */}
                {showPercentage && progressPercentage > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1.8, duration: 0.4 }}
                        className="flex justify-center items-center gap-1 px-2 py-1 rounded-full text-xs"
                    >
                        <span
                            style={{
                                color: isCompleted ? '#10b981' : '#fbbf24',
                                fontWeight: isCompleted ? 'bold' : 'normal'
                            }}
                        >
                            {progressPercentage.toFixed(0)}%
                            {isCompleted && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="ml-2"
                                >
                                    ✨ Complete!
                                </motion.span>
                            )}
                        </span>
                    </motion.div>
                )}

                <motion.div
                    className={`flex items-center justify-center gap-4 mb-6 ${className}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                >
                    {/* Left Progress Line */}
                    <motion.div
                        className="h-px flex-1 relative overflow-hidden"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 1.2, duration: 0.8 }}
                    >
                        {/* Background line */}
                        <div
                            className="absolute inset-0"
                            style={{
                                background: `linear-gradient(90deg, transparent 0%, rgba(100, 116, 139, 0.3) 50%, rgba(245, 158, 11, 0.2) 100%)`,
                            }}
                        />

                        {/* Progress fill */}
                        <motion.div
                            className="absolute inset-0 origin-right"
                            initial={{ scaleX: 0 }}
                            animate={{
                                scaleX: progressPercentage / 100,
                                ...(isCompleted && {
                                    filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'],
                                })
                            }}
                            transition={{
                                delay: 1.5,
                                duration: 1.2,
                                ease: "easeOut",
                                ...(isCompleted && {
                                    filter: {
                                        repeat: Infinity,
                                        duration: 2,
                                        ease: "easeInOut"
                                    }
                                })
                            }}
                            style={getProgressLineStyles(true, isCompleted, progressPercentage)}
                        />
                    </motion.div>

                    {/* Center Text Container */}
                    <motion.div
                        className="text-xl z-30 font-semibold tracking-wider relative px-6 py-2 rounded-full flex items-center gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                            opacity: 1,
                            y: 0,
                            ...(isCompleted && {
                                textShadow: [
                                    '0 0 10px rgba(16, 185, 129, 0.8)',
                                    '0 0 20px rgba(16, 185, 129, 1)',
                                    '0 0 10px rgba(16, 185, 129, 0.8)'
                                ]
                            })
                        }}
                        transition={{
                            delay: 1,
                            duration: 0.6,
                            ...(isCompleted && {
                                textShadow: {
                                    repeat: Infinity,
                                    duration: 2,
                                    ease: "easeInOut"
                                }
                            })
                        }}
                        style={getCenterTextStyles(isCompleted)}
                        onClick={handleCenterClick}
                    >
                        {/* Main Text */}
                        <span>
                            {isCompleted ? " Compare Results" : text}
                        </span>

                    </motion.div>
                    {isCompleted &&
                        <div className="">
                            <ShowcaseDecor />
                        </div>}

                    {/* Right Progress Line */}
                    <motion.div
                        className="h-px flex-1 relative overflow-hidden"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 1.2, duration: 0.8 }}
                    >
                        {/* Background line */}
                        <div
                            className="absolute inset-0"
                            style={{
                                background: `linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, rgba(100, 116, 139, 0.3) 50%, transparent 100%)`,
                            }}
                        />

                        {/* Progress fill */}
                        <motion.div
                            className="absolute inset-0 origin-left"
                            initial={{ scaleX: 0 }}
                            animate={{
                                scaleX: progressPercentage / 100,
                                ...(isCompleted && {
                                    filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'],
                                })
                            }}
                            transition={{
                                delay: 1.5,
                                duration: 1.2,
                                ease: "easeOut",
                                ...(isCompleted && {
                                    filter: {
                                        repeat: Infinity,
                                        duration: 2,
                                        ease: "easeInOut"
                                    }
                                })
                            }}
                            style={getProgressLineStyles(false, isCompleted, progressPercentage)}
                        />
                    </motion.div>
                </motion.div>
            </div>

            {/* Completion Modal */}
            <CompletionModal
                isOpen={isCompletionModalOpen}
                onClose={() => setIsCompletionModalOpen(false)}
                listTitle={currentList?.title || "Your Ranking"}
                completionData={{
                    totalItems: totalSize,
                    timeTaken: "Just now", // We'll calculate this later
                    category: currentList?.category || "General"
                }}
            />
        </>
    );
};

export default ProgressMain;