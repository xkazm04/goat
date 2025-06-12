import { motion } from "framer-motion";
import { PlusIcon } from "lucide-react";

type Props = {
    showMatched: boolean;
    isDatabaseGroup?: boolean;
    hasLoadedItems?: boolean;
    availableItems: any[];
    setIsAddModalOpen: (open: boolean) => void;
    onAddNewItem?: () => void; 
}

const BacklogGroupEmpty = ({showMatched, isDatabaseGroup, hasLoadedItems, availableItems,setIsAddModalOpen, onAddNewItem }: Props) => {
    return <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ delay: 0.4, duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
        className="text-center py-8"
    >
        <motion.div
            className="text-sm text-slate-400 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
        >
            {showMatched
                ? "No ranked items yet"
                : isDatabaseGroup
                    ? hasLoadedItems
                        ? "No items available"
                        : "Items will load automatically"
                    : availableItems.length === 0 && "Add item into this group"
            }
        </motion.div>

        {/* Enhanced Action buttons */}
        <motion.div
            className="flex justify-center gap-2 mt-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
        >
            {!showMatched && !isDatabaseGroup && (
                <motion.button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsAddModalOpen(true);
                    }}
                    className="text-xs text-blue-400 rounded-xl hover:text-blue-300 transition-colors px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 flex items-center gap-1"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <PlusIcon size={14} />
                    Quick Add
                </motion.button>
            )}

            {!showMatched && onAddNewItem && (
                <motion.button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddNewItem();
                    }}
                    className="text-xs text-green-400 hover:text-green-300 transition-colors px-3 py-1 bg-green-500/10 hover:bg-green-500/20 flex items-center gap-1"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <PlusIcon size={14} />
                    Add
                </motion.button>
            )}
        </motion.div>
    </motion.div>
}

export default BacklogGroupEmpty;