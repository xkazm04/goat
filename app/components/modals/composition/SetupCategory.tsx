import { motion, AnimatePresence } from "framer-motion"

type Props = {
    categories: string[];
    handleCategoryChange: (category: string) => void;
    isPredefined: boolean;
    selectedCategory: string;
    color: { primary: string; secondary: string; accent: string };
    sportsSubcategories: { value: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
    selectedSubcategory?: string;
    setSelectedSubcategory?: (subcategory: string) => void;
}


const SetupCategory = ({categories, handleCategoryChange, isPredefined, selectedCategory, color, sportsSubcategories, selectedSubcategory, setSelectedSubcategory}: Props) => {
    return <>
        <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-3">
                Category
            </label>
            <div className="flex flex-row gap-2">
                {categories.map((category) => (
                    <button
                        key={category}
                        disabled={isPredefined}
                        onClick={() => handleCategoryChange(category)}
                        className={`px-3 py-2 rounded-xl border-none outline-none text-sm font-semibold transition-all duration-200 ${selectedCategory === category
                                ? 'text-white shadow-lg'
                                : isPredefined
                                    ? 'text-slate-500 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        style={selectedCategory === category ? {
                            background: `linear-gradient(135deg, ${color.primary}80, ${color.secondary}80)`,
                            boxShadow: `0 2px 8px ${color.primary}30`
                        } : {
                            background: isPredefined ? 'rgba(51, 65, 85, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                        }}
                    >
                        {category}
                    </button>
                ))}
            </div>
        </div>

        {/* Sports Subcategories */}
        <AnimatePresence>
            {selectedCategory === "Sports" && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-8"
                >
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                        Sport Type
                    </label>
                    <div className="space-y-2">
                        {sportsSubcategories.map((subcategory) => (
                            <motion.button
                                key={subcategory.value}
                                disabled={isPredefined}
                                onClick={() => setSelectedSubcategory?.(subcategory.value)}
                                className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${selectedSubcategory === subcategory.value
                                        ? 'text-white'
                                        : isPredefined
                                            ? 'text-slate-500 cursor-not-allowed'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                style={selectedSubcategory === subcategory.value ? {
                                    background: `linear-gradient(135deg, ${color.primary}40, ${color.secondary}40)`,
                                    border: `2px solid ${color.primary}60`
                                } : {
                                    background: isPredefined ? 'rgba(51, 65, 85, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                                    border: '2px solid transparent'
                                }}
                                whileHover={!isPredefined ? { scale: 1.02 } : {}}
                                whileTap={!isPredefined ? { scale: 0.98 } : {}}
                            >
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{
                                        background: selectedSubcategory === subcategory.value
                                            ? `linear-gradient(135deg, ${color.primary}60, ${color.secondary}60)`
                                            : `linear-gradient(135deg, ${color.primary}20, ${color.secondary}20)`
                                    }}
                                >
                                    <subcategory.icon
                                        className="w-4 h-4"
                                        style={{ color: color.accent }}
                                    />
                                </div>
                                <span className="font-medium">
                                    {subcategory.label}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </>
}

export default SetupCategory;