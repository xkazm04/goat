import { motion } from "framer-motion";
import { PlusIcon } from "lucide-react";

type Props = {
    onAddNewItem?: () => void;
}

const AddItemButton = ({onAddNewItem}: Props) => {
    return <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
    >
        <button
            onClick={() => onAddNewItem?.()}
            className="relative aspect-square w-full rounded-xl border-2 border-dashed overflow-hidden transition-all duration-300 group cursor-pointer"
            style={{
                background: `linear-gradient(135deg, 
                              rgba(34, 197, 94, 0.05) 0%,
                              rgba(16, 185, 129, 0.05) 100%
                            )`,
                border: '2px dashed rgba(34, 197, 94, 0.3)',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)'
            }}
        >
            {/* Icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"
                    style={{
                        background: `linear-gradient(135deg, 
                                  rgba(34, 197, 94, 0.2) 0%,
                                  rgba(16, 185, 129, 0.2) 100%
                                )`,
                        border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}
                >
                    <PlusIcon className="w-6 h-6 text-green-400" />
                </div>

                {/* Text */}
                <span className="text-xs font-semibold text-center leading-tight text-green-400">
                    Add New
                </span>
            </div>
        </button>
    </motion.div>
}

export default AddItemButton;