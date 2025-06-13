import { motion } from "framer-motion";

type Props = {
    assignedItems: any[]; // Replace with actual type
    availableItems: any[]; // Replace with actual type
    debouncedDisplayItems: any[]; // Replace with actual type
    group: {
        items: any[];
    };
}

const BacklogGroupFooter = ({assignedItems, availableItems, debouncedDisplayItems, group}: Props) => {
    return <motion.div
        className="mt-4 pt-3 border-t border-slate-600/30"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 + debouncedDisplayItems.length * 0.08, duration: 0.4 }}
    >
        <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-slate-400">
                <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                >
                    {availableItems.length} available
                </motion.span>
                {assignedItems.length > 0 && (
                    <motion.span
                        className="text-green-400"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7, duration: 0.3 }}
                    >
                        {assignedItems.length} ranked
                    </motion.span>
                )}
                <motion.span
                    className="text-slate-500"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.3 }}
                >
                    {group.items.length} total
                </motion.span>
            </div>
        </div>
    </motion.div>
}

export default BacklogGroupFooter;