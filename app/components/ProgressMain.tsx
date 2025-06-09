import { motion } from "framer-motion";
import { useItemStore } from "@/app/stores/item-store";
import { useCurrentList } from "@/app/stores/use-list-store";
import { useMemo, useState } from "react";
import { CompletionModal } from "./modals/completion/CompletionModal";

interface ProgressMainProps {
    text: string;
    showPercentage?: boolean;
    className?: string;
}

const ProgressMain = ({ text, showPercentage = true, className = "" }: ProgressMainProps) => {
    const currentList = useCurrentList();
    const { gridItems } = useItemStore();
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);

    // Calculate progress
    const { matchedCount, totalSize, progressPercentage, isCompleted } = useMemo(() => {
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

    const getProgressLineStyles = (isLeft: boolean) => {
        if (isCompleted) {
            return {
                background: isLeft 
                    ? `linear-gradient(90deg, transparent 0%, #10b981 30%, #34d399 70%, #6ee7b7 100%)`
                    : `linear-gradient(90deg, #6ee7b7 0%, #34d399 30%, #10b981 70%, transparent 100%)`,
                boxShadow: `
                    0 0 20px rgba(16, 185, 129, 0.8),
                    0 0 40px rgba(52, 211, 153, 0.6),
                    0 0 60px rgba(110, 231, 183, 0.4)
                `,
                filter: 'brightness(1.3)'
            };
        }
        
        return {
            background: isLeft
                ? `linear-gradient(90deg, transparent 0%, #10b981 30%, #f59e0b 70%, #fbbf24 100%)`
                : `linear-gradient(90deg, #fbbf24 0%, #f59e0b 30%, #10b981 70%, transparent 100%)`,
            boxShadow: progressPercentage > 0 ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
        };
    };

    const getCenterTextStyles = () => {
        if (isCompleted) {
            return {
                background: `
                    linear-gradient(135deg, 
                        rgba(16, 185, 129, 0.3) 0%,
                        rgba(52, 211, 153, 0.2) 50%,
                        rgba(110, 231, 183, 0.3) 100%
                    )
                `,
                border: '2px solid rgba(16, 185, 129, 0.8)',
                color: '#10b981',
                textShadow: `
                    0 0 10px rgba(16, 185, 129, 0.8),
                    0 0 20px rgba(52, 211, 153, 0.6)
                `,
                boxShadow: `
                    0 4px 20px rgba(16, 185, 129, 0.4),
                    0 0 40px rgba(52, 211, 153, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2)
                `,
                cursor: 'pointer'
            };
        }

        return {
            background: `
                linear-gradient(135deg, 
                    rgba(251, 191, 36, 0.1) 0%,
                    rgba(245, 158, 11, 0.05) 50%,
                    rgba(217, 119, 6, 0.1) 100%
                )
            `,
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#fbbf24',
            textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
            boxShadow: `
                0 4px 20px rgba(251, 191, 36, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `
        };
    };

    const getCenterHoverStyles = () => {
        if (isCompleted) {
            return {
                scale: 1.08,
                boxShadow: `
                    0 6px 30px rgba(16, 185, 129, 0.5),
                    0 0 60px rgba(52, 211, 153, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `,
                filter: 'brightness(1.2)'
            };
        }

        return {
            scale: 1.05,
            boxShadow: `
                0 6px 30px rgba(251, 191, 36, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.2)
            `
        };
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
                            style={getProgressLineStyles(true)}
                        />
                    </motion.div>

                    {/* Center Text Container */}
                    <motion.div
                        className="text-xl font-semibold tracking-wider relative px-6 py-2 rounded-full flex items-center gap-3"
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
                        style={getCenterTextStyles()}
                        whileHover={getCenterHoverStyles()}
                        onClick={handleCenterClick}
                    >
                        {/* Main Text */}
                        <span>
                            {isCompleted ? "🏆 Compare Results" : text}
                        </span>

                        {/* Completion sparkles */}
                        {isCompleted && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute -top-2 -right-2"
                            >
                                <motion.span
                                    animate={{
                                        rotate: [0, 360],
                                        scale: [1, 1.2, 1]
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 3,
                                        ease: "easeInOut"
                                    }}
                                    className="text-lg"
                                >
                                    ✨
                                </motion.span>
                            </motion.div>
                        )}
                    </motion.div>

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
                            style={getProgressLineStyles(false)}
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