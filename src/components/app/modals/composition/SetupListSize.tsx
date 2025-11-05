import { motion } from "framer-motion"

type Props = {
    hierarchyOptions: { value: string; label: string; description: string }[];
    activeHierarchy: string;
    color: { primary: string; secondary: string; accent: string };
    handleHierarchyChange: (value: string) => void;
}

const SetupListSize = ({hierarchyOptions, activeHierarchy, color, handleHierarchyChange}: Props) => {
    return <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-4">
            List Size
        </label>
        <div className=" flex gap-1">
            {hierarchyOptions.map((option, index) => (
                <motion.button
                    key={option.value}
                    onClick={() => handleHierarchyChange(option.value)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-300 group cursor-pointer backdrop-blur-sm ${
                        activeHierarchy === option.value ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    style={activeHierarchy === option.value ? {
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
                        boxShadow: activeHierarchy === option.value
                            ? `0 12px 30px ${color.primary}30, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                            : '0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                    }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div 
                                className={`text-lg font-bold mb-1 ${
                                    activeHierarchy === option.value 
                                        ? 'text-white' 
                                        : 'text-slate-300'
                                }`}
                            >
                                {option.label}
                            </div>
                        </div>
                        
                        {/* Enhanced selection indicator */}
                        <motion.div className="flex items-center gap-3">
                            {/* Size indicator bars */}
                            <div className="flex items-end gap-1 h-6">
                                {[...Array(3)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="w-1 rounded-full"
                                        style={{
                                            height: `${(i + 1) * 6}px`,
                                            background: activeHierarchy === option.value 
                                                ? `linear-gradient(to top, ${color.primary}, ${color.accent})`
                                                : 'rgba(148, 163, 184, 0.4)',
                                            opacity: i < (option.value === "Top 10" ? 1 : option.value === "Top 20" ? 2 : 3) ? 1 : 0.3
                                        }}
                                        animate={{
                                            scale: activeHierarchy === option.value ? [1, 1.2, 1] : 1
                                        }}
                                        transition={{ 
                                            delay: i * 0.1,
                                            duration: 0.6,
                                            repeat: activeHierarchy === option.value ? Infinity : 0,
                                            repeatDelay: 2
                                        }}
                                    />
                                ))}
                            </div>
                            
                            {/* Radio button indicator */}
                            <motion.div
                                className={`w-5 h-5 rounded-full border-2 ${
                                    activeHierarchy === option.value 
                                        ? 'border-white' 
                                        : 'border-slate-400'
                                }`}
                                style={{
                                    background: activeHierarchy === option.value 
                                        ? `linear-gradient(135deg, ${color.primary}, ${color.secondary})`
                                        : 'transparent',
                                    boxShadow: activeHierarchy === option.value 
                                        ? `0 0 10px ${color.primary}40, inset 0 1px 0 rgba(255, 255, 255, 0.3)`
                                        : 'none'
                                }}
                                animate={{
                                    scale: activeHierarchy === option.value ? 1.2 : 1
                                }}
                                transition={{ type: "spring", damping: 15 }}
                            />
                        </motion.div>
                    </div>
                </motion.button>
            ))}
        </div>
    </div>
}

export default SetupListSize;