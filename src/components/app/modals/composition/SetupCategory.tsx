import { motion, AnimatePresence } from "framer-motion"

type Props = {
    categories: string[];
    handleCategoryChange: (category: string) => void;
    selectedCategory: string;
    color: { primary: string; secondary: string; accent: string };
    sportsSubcategories: { value: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
    selectedSubcategory?: string;
    setSelectedSubcategory?: (subcategory: string) => void;
}

const SetupCategory = ({categories, handleCategoryChange, selectedCategory, color, sportsSubcategories, selectedSubcategory, setSelectedSubcategory}: Props) => {
    return <>
        <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-4">
                Category
            </label>
            <div className="flex flex-wrap gap-2">
                {categories.map((category, index) => (
                    <motion.button
                        key={category}
                        onClick={() => handleCategoryChange(category)}
                        className={`px-4 py-2 rounded-xl border-none outline-none text-sm font-semibold transition-all duration-300 backdrop-blur-sm ${
                            selectedCategory === category
                                ? 'text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                        style={selectedCategory === category ? {
                            background: `linear-gradient(135deg, ${color.primary}70, ${color.secondary}70)`,
                            boxShadow: `
                                0 4px 20px ${color.primary}30,
                                inset 0 1px 0 rgba(255, 255, 255, 0.2),
                                inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                            `,
                            border: `1px solid ${color.primary}50`
                        } : {
                            background: `linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(71, 85, 105, 0.4))`,
                            boxShadow: `
                                0 2px 10px rgba(0, 0, 0, 0.2),
                                inset 0 1px 0 rgba(255, 255, 255, 0.1)
                            `,
                            border: '1px solid rgba(71, 85, 105, 0.3)'
                        }}
                        whileHover={{ 
                            scale: 1.05,
                            boxShadow: selectedCategory === category 
                                ? `0 6px 25px ${color.primary}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                                : '0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                        }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        {category}
                    </motion.button>
                ))}
            </div>
        </div>

        {/* Sports Subcategories with enhanced styling */}
        <AnimatePresence>
            {selectedCategory === "Sports" && (
                <motion.div
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="mb-8"
                >
                    <label className="block text-sm font-medium text-slate-300 mb-4">
                        Sport Type
                    </label>
                    <div className="space-y-3">
                        {sportsSubcategories.map((subcategory, index) => (
                            <motion.button
                                key={subcategory.value}
                                onClick={() => setSelectedSubcategory?.(subcategory.value)}
                                className={`w-full text-left p-4 rounded-xl transition-all duration-300 flex items-center gap-3 group backdrop-blur-sm ${
                                    selectedSubcategory === subcategory.value
                                        ? 'text-white'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                                style={selectedSubcategory === subcategory.value ? {
                                    background: `linear-gradient(135deg, ${color.primary}50, ${color.secondary}40)`,
                                    border: `2px solid ${color.primary}60`,
                                    boxShadow: `
                                        0 8px 25px ${color.primary}25,
                                        inset 0 1px 0 rgba(255, 255, 255, 0.2),
                                        inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                                    `
                                } : {
                                    background: `linear-gradient(135deg, rgba(51, 65, 85, 0.4), rgba(71, 85, 105, 0.3))`,
                                    border: '2px solid rgba(71, 85, 105, 0.3)',
                                    boxShadow: `
                                        0 4px 15px rgba(0, 0, 0, 0.2),
                                        inset 0 1px 0 rgba(255, 255, 255, 0.1)
                                    `
                                }}
                                whileHover={{ 
                                    scale: 1.02,
                                    boxShadow: selectedSubcategory === subcategory.value
                                        ? `0 12px 30px ${color.primary}30, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                                        : '0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                                }}
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <motion.div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm"
                                    style={{
                                        background: selectedSubcategory === subcategory.value
                                            ? `linear-gradient(135deg, ${color.primary}80, ${color.secondary}80)`
                                            : `linear-gradient(135deg, ${color.primary}30, ${color.secondary}20)`,
                                        boxShadow: `0 4px 15px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
                                        color: selectedSubcategory === subcategory.value ? '#fff' : color.accent
                                    }}
                                    whileHover={{ scale: 1.1 }}
                                >
                                    <subcategory.icon
                                        className="w-5 h-5"
                                    />
                                </motion.div>
                                <div className="flex-1">
                                    <span className="font-medium text-base">
                                        {subcategory.label}
                                    </span>
                                    <div className={`text-xs mt-1 ${
                                        selectedSubcategory === subcategory.value ? 'text-slate-300' : 'text-slate-500'
                                    }`}>
                                        Professional & amateur leagues
                                    </div>
                                </div>
                                
                                {/* Selection indicator */}
                                <motion.div
                                    className={`w-4 h-4 rounded-full border-2 ${
                                        selectedSubcategory === subcategory.value 
                                            ? 'border-white' 
                                            : 'border-slate-400'
                                    }`}
                                    style={{
                                        background: selectedSubcategory === subcategory.value 
                                            ? `linear-gradient(135deg, ${color.primary}, ${color.secondary})`
                                            : 'transparent'
                                    }}
                                    animate={{
                                        scale: selectedSubcategory === subcategory.value ? 1.2 : 1
                                    }}
                                    transition={{ type: "spring", damping: 15 }}
                                />
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
}

export default SetupCategory;