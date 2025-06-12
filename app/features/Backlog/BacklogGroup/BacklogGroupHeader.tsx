import { motion } from "framer-motion"
import { ChevronDown, Loader2 } from "lucide-react"
import Image from "next/image"

type Props = {
    handleToggle: (e: React.MouseEvent) => void;
    group: {
        id: string;
        name: string;
        items: any[];
        isOpen?: boolean;
    };
    isExpanded: boolean;
    isLoading: boolean;
    isLoaded: boolean;
    displayCount: number | string;
    groupItems: any[];
    shouldShowLoading?: boolean;
    isDatabaseGroup?: boolean;
}

const BackloGroupHeader = ({handleToggle, group, isExpanded, isLoading, isLoaded, displayCount, groupItems,
    shouldShowLoading, isDatabaseGroup}: Props) => {
    return <motion.button
        onClick={handleToggle}
        className="w-full p-4 relative flex items-center gap-3 text-left transition-all duration-200 hover:bg-slate-700/30 group"
        whileHover={{ backgroundColor: 'rgba(51, 65, 85, 0.3)' }}
        whileTap={{ scale: 0.98 }}
    >
        {/* Background Image - TODO: Use actual group image or category-based image */}
        <Image
            src={`/groups/group_hockey_redwings.svg`}
            alt={group.name}
            fill
            style={{ objectFit: 'contain' }}
            className="opacity-20 absolute"
        />

        <div className="flex-1 min-w-0 relative z-10">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate text-slate-200 group-hover:text-white transition-colors">
                    {group.name}
                </h3>

                {/* Loading indicator next to title */}
                {shouldShowLoading && (
                    <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                )}
            </div>

            {/* Group metadata */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
                {isLoaded && groupItems.length > 0 && (
                    <span>• {groupItems.length} items loaded</span>
                )}
            </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
            {/* Item count badge */}
            <motion.div
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={{
                    background: isDatabaseGroup ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: isDatabaseGroup ? '#4ade80' : '#60a5fa'
                }}
                whileHover={{ scale: 1.05 }}
            >
                {shouldShowLoading ? '...' : displayCount}
            </motion.div>

            {/* Loading indicator in header */}
            {isLoading && groupItems.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400"
                >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Updating</span>
                </motion.div>
            )}

            {/* Expand/Collapse Indicator */}
            <div className="text-slate-400 group-hover:text-slate-300 transition-all duration-200">
                <motion.div
                    animate={{
                        rotate: isExpanded ? 180 : 0,
                        scale: isExpanded ? 1.1 : 1
                    }}
                    transition={{
                        duration: 0.3,
                        ease: [0.04, 0.62, 0.23, 0.98]
                    }}
                    whileHover={{ scale: 1.2 }}
                >
                    <ChevronDown className="w-4 h-4" />
                </motion.div>
            </div>
        </div>
    </motion.button>
}

export default BackloGroupHeader