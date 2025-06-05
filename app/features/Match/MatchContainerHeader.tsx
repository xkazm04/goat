import { useMatchStore } from "@/app/stores/match-store";
import { motion } from "framer-motion";
import { Keyboard, Target, Zap } from "lucide-react";

type Props = {
    selectedBacklogItem: string | null | undefined;
    setIsComparisonModalOpen: (isOpen: boolean) => void;
    compareList: { id: string; title: string }[];
    getSelectedItemName: () => string | null | undefined;
}

const MatchContainerHeader = ({ selectedBacklogItem, setIsComparisonModalOpen, compareList, getSelectedItemName }: Props) => {
    const { keyboardMode } = useMatchStore();
    return <>
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <div className="flex flex-row justify-between items-center gap-4 mb-2">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-white">
                        G.O.A.T. Ranking
                    </h1>
                    <p className="text-lg text-yellow-100">
                        Build your ultimate top 50 greatest of all time
                    </p>
                </div>

                {/* Center - VS Button */}
                <div className="flex justify-center">
                    <motion.button
                        onClick={() => setIsComparisonModalOpen(true)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white transition-all duration-300"
                        style={{
                            background: `linear-gradient(135deg, 
                  rgba(59, 130, 246, 0.8) 0%,
                  rgba(147, 51, 234, 0.8) 100%
                )`,
                            boxShadow: compareList.length > 0
                                ? '0 4px 15px rgba(59, 130, 246, 0.3)'
                                : 'none'
                        }}
                    >
                        <Zap className="w-5 h-5" />
                        <span className="text-lg">VS</span>
                        {compareList.length > 0 && (
                            <div className="w-6 h-6 rounded-full bg-white text-blue-600 text-xs font-bold flex items-center justify-center">
                                {compareList.length}
                            </div>
                        )}
                    </motion.button>
                </div>

                {/* Instructions */}
                <div className="flex flex-col gap-2">
                    <div
                        className="flex items-center text-gray-400 gap-2 text-sm px-4 py-2 rounded-lg w-fit"
                        style={{
                            background: 'rgba(30, 41, 59, 0.5)',
                            border: '1px solid rgba(71, 85, 105, 0.3)'
                        }}
                    >
                        <Target className="w-4 h-4" />
                        <span>Drag items to the ranking grid or select and use keyboard shortcuts</span>
                    </div>

                    {selectedBacklogItem && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center text-blue-300 gap-2 text-sm px-4 py-2 rounded-lg w-fit"
                            style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)'
                            }}
                        >
                            <Keyboard className="w-4 h-4" />
                            <span>
                                Press <strong>1-9</strong> or <strong>0</strong> to assign "{getSelectedItemName()}" to positions 1-10
                            </span>
                        </motion.div>
                    )}

                    {keyboardMode && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center text-green-300 gap-2 text-sm px-4 py-2 rounded-lg w-fit"
                            style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)'
                            }}
                        >
                            <Keyboard className="w-4 h-4" />
                            <span>Keyboard mode active - Press ESC to exit</span>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    </>
}

export default MatchContainerHeader;