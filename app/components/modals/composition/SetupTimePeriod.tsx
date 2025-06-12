import { motion } from "framer-motion"

type Props = {
    timePeriod: "all-time" | "decade" | "year";
    setTimePeriod: (value: "all-time" | "decade" | "year") => void;
    selectedDecade: number;
    setSelectedDecade: (decade: number) => void;
    selectedYear: number;
    setSelectedYear: (year: number) => void;
    color: { primary: string; secondary: string; accent: string };
}

const decades = [1980, 1990, 2000, 2010, 2020];

const SetupTimePeriod = ({timePeriod, setTimePeriod, selectedDecade, setSelectedDecade, selectedYear, setSelectedYear, color}: Props) => {
    return <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-4">
            Time Period
        </label>
        <div className="space-y-4">
            {/* Time Period Toggle with enhanced styling */}
            <div className="flex gap-2 p-1 rounded-xl backdrop-blur-sm"
                style={{
                    background: `linear-gradient(135deg, rgba(51, 65, 85, 0.4), rgba(71, 85, 105, 0.3))`,
                    border: '1px solid rgba(71, 85, 105, 0.3)',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
            >
                {[
                    { value: "all-time", label: "All Time" },
                    { value: "decade", label: "By Decade" },
                    { value: "year", label: "By Year" }
                ].map((option, index) => (
                    <motion.button
                        key={option.value}
                        onClick={() => setTimePeriod(option.value as any)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 backdrop-blur-sm ${
                            timePeriod === option.value
                                ? 'text-white'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                        style={timePeriod === option.value ? {
                            background: `linear-gradient(135deg, ${color.primary}70, ${color.secondary}60)`,
                            boxShadow: `
                                0 4px 15px ${color.primary}30,
                                inset 0 1px 0 rgba(255, 255, 255, 0.2)
                            `,
                            border: `1px solid ${color.primary}50`
                        } : {
                            background: 'transparent'
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        {option.label}
                    </motion.button>
                ))}
            </div>

            {/* Enhanced Decade Slider */}
            {timePeriod === "decade" && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-5 rounded-xl backdrop-blur-sm"
                    style={{
                        background: `linear-gradient(135deg, ${color.primary}10, ${color.secondary}10)`,
                        border: `1px solid ${color.primary}20`,
                        boxShadow: `
                            0 8px 25px rgba(0, 0, 0, 0.2),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1)
                        `
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-slate-400 font-medium">1980s</span>
                        <motion.span
                            className="text-sm font-bold px-3 py-1 rounded-full backdrop-blur-sm"
                            style={{
                                color: color.accent,
                                background: `linear-gradient(135deg, ${color.primary}30, ${color.secondary}20)`,
                                border: `1px solid ${color.primary}40`,
                                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                            }}
                            whileHover={{ scale: 1.05 }}
                        >
                            {selectedDecade}s
                        </motion.span>
                        <span className="text-xs text-slate-400 font-medium">2020s</span>
                    </div>

                    <div className="relative">
                        {/* Enhanced Slider Track */}
                        <div
                            className="h-3 rounded-lg relative overflow-hidden"
                            style={{
                                background: `linear-gradient(to right, ${color.primary}20, ${color.secondary}20)`,
                                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                            }}
                        >
                            {/* Progress fill */}
                            <div
                                className="absolute top-0 left-0 h-full rounded-lg transition-all duration-300"
                                style={{
                                    width: `${((selectedDecade - 1980) / 40) * 100}%`,
                                    background: `linear-gradient(90deg, ${color.primary}60, ${color.secondary}60)`,
                                    boxShadow: `0 0 10px ${color.primary}40`
                                }}
                            />

                            {/* Decade markers */}
                            {decades.map((decade, index) => (
                                <motion.div
                                    key={decade}
                                    className="absolute top-0 w-0.5 h-full bg-slate-500"
                                    style={{
                                        left: `${(index / (decades.length - 1)) * 100}%`,
                                        transform: 'translateX(-50%)'
                                    }}
                                    initial={{ opacity: 0, scaleY: 0 }}
                                    animate={{ opacity: 1, scaleY: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                />
                            ))}

                            {/* Enhanced thumb */}
                            <motion.div
                                className="absolute top-1/2 w-6 h-6 rounded-full border-2 border-white transition-all duration-300 cursor-grab active:cursor-grabbing"
                                style={{
                                    background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`,
                                    left: `${((selectedDecade - 1980) / 40) * 100}%`,
                                    transform: 'translate(-50%, -50%)',
                                    boxShadow: `
                                        0 4px 15px ${color.primary}40,
                                        0 0 0 4px rgba(255, 255, 255, 0.1),
                                        inset 0 1px 0 rgba(255, 255, 255, 0.3)
                                    `
                                }}
                                whileHover={{ 
                                    scale: 1.2,
                                    boxShadow: `
                                        0 6px 20px ${color.primary}50,
                                        0 0 0 6px rgba(255, 255, 255, 0.15),
                                        inset 0 1px 0 rgba(255, 255, 255, 0.4)
                                    `
                                }}
                                whileTap={{ scale: 1.1 }}
                            />
                        </div>

                        <input
                            type="range"
                            min={1980}
                            max={2020}
                            step={10}
                            value={selectedDecade}
                            onChange={(e) => setSelectedDecade(Number(e.target.value))}
                            className="absolute inset-0 w-full h-3 opacity-0 cursor-pointer"
                        />
                    </div>
                </motion.div>
            )}

            {/* Enhanced Year Input */}
            {timePeriod === "year" && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                >
                    <div className="relative">
                        <input
                            type="number"
                            min={2000}
                            max={2025}
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl text-slate-200 transition-all duration-300 focus:outline-none backdrop-blur-sm text-center text-lg font-semibold"
                            style={{
                                background: `
                                    linear-gradient(135deg, 
                                        rgba(30, 41, 59, 0.8) 0%,
                                        rgba(51, 65, 85, 0.9) 100%
                                    )
                                `,
                                border: `2px solid ${color.primary}40`,
                                boxShadow: `
                                    0 4px 20px rgba(0, 0, 0, 0.2),
                                    inset 0 1px 0 rgba(255, 255, 255, 0.1),
                                    inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                                `
                            }}
                        />
                        {/* Focus glow effect */}
                        <div 
                            className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none focus-within:opacity-100"
                            style={{
                                background: `linear-gradient(135deg, ${color.primary}20, ${color.secondary}20)`,
                                filter: 'blur(8px)',
                                zIndex: -1
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </div>
    </div>
}

export default SetupTimePeriod;