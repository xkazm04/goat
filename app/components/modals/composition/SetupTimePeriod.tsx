import { motion } from "framer-motion"

type Props = {
    hierarchyOptions: { value: string; label: string; description: string }[];
    isPredefined: boolean;
    activeHierarchy: string;
    color: { primary: string; secondary: string };
    handleHierarchyChange: (value: string) => void;
    timePeriod: "all-time" | "decade" | "year";
    setTimePeriod: (value: "all-time" | "decade" | "year") => void;
    selectedDecade: number;
    setSelectedDecade: (decade: number) => void;
    selectedYear: number;
    setSelectedYear: (year: number) => void;
}

const SetupTimePeriod = ({timePeriod, isPredefined, setTimePeriod, selectedDecade, setSelectedDecade, selectedYear, setSelectedYear, color}: Props) => {
    return <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-3">
            Time Period
        </label>
        <div className="space-y-3">
            {/* Time Period Toggle */}
            <div className="flex gap-2">
                {[
                    { value: "all-time", label: "All Time" },
                    { value: "decade", label: "By Decade" },
                    { value: "year", label: "By Year" }
                ].map((option) => (
                    <button
                        key={option.value}
                        disabled={isPredefined}
                        onClick={() => setTimePeriod(option.value as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${timePeriod === option.value
                                ? 'text-white'
                                : isPredefined
                                    ? 'text-slate-500 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        style={timePeriod === option.value ? {
                            background: `linear-gradient(135deg, ${color.primary}60, ${color.secondary}60)`,
                        } : {
                            background: isPredefined ? 'rgba(51, 65, 85, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                        }}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Enhanced Decade Slider */}
            {timePeriod === "decade" && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400">1980s</span>
                        <span
                            className="text-sm font-bold px-3 py-1 rounded-full"
                            style={{
                                color: color.accent,
                                background: `${color.primary}20`
                            }}
                        >
                            {selectedDecade}s
                        </span>
                        <span className="text-xs text-slate-400">2020s</span>
                    </div>

                    <div className="relative">
                        {/* Slider Track with Dividers */}
                        <div
                            className="h-2 rounded-lg relative"
                            style={{
                                background: `linear-gradient(to right, ${color.primary}20, ${color.secondary}20)`,
                            }}
                        >
                            {/* Dividers */}
                            {decades.map((decade, index) => (
                                <div
                                    key={decade}
                                    className="absolute top-0 w-0.5 h-2 bg-slate-600"
                                    style={{
                                        left: `${(index / (decades.length - 1)) * 100}%`,
                                        transform: 'translateX(-50%)'
                                    }}
                                />
                            ))}

                            {/* Active thumb */}
                            <div
                                className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white transition-all duration-200 shadow-lg"
                                style={{
                                    background: `linear-gradient(135deg, ${color.primary}, ${color.secondary})`,
                                    left: `${((selectedDecade - 1980) / 40) * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            />
                        </div>

                        <input
                            type="range"
                            min={1980}
                            max={2020}
                            step={10}
                            value={selectedDecade}
                            disabled={isPredefined}
                            onChange={(e) => setSelectedDecade(Number(e.target.value))}
                            className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                    </div>
                </motion.div>
            )}

            {/* Year Input */}
            {timePeriod === "year" && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                >
                    <input
                        type="number"
                        min={2000}
                        max={2025}
                        value={selectedYear}
                        disabled={isPredefined}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl text-slate-200 transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: `
                    linear-gradient(135deg, 
                      rgba(30, 41, 59, 0.9) 0%,
                      rgba(51, 65, 85, 0.95) 100%
                    )
                  `,
                            border: `2px solid ${color.primary}40`,
                        }}
                    />
                </motion.div>
            )}
        </div>
    </div>
}

export default SetupTimePeriod;