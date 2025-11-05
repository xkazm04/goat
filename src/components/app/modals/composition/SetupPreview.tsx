import { motion } from "framer-motion";
import { Sparkles, Trophy } from "lucide-react";

type Props = {
    color: { primary: string; secondary: string; accent: string };
    selectedCategory: string;
    selectedSubcategory?: string;
    timePeriod: "all-time" | "decade" | "year";
    selectedDecade?: number;
    selectedYear?: number;
    hierarchy: string;
    customName?: string;
    categoryPreviews: Record<string, any>;
    getDisplayName: () => string;
    getCategoryDescription: () => string;
}

const SetupPreview = ({ color, selectedCategory, selectedSubcategory, timePeriod, selectedDecade, selectedYear, categoryPreviews, getDisplayName, getCategoryDescription }: Props) => {
    const renderSportsPreview = () => {
        const sportsData = categoryPreviews.Sports;
        const currentSport = sportsData[selectedSubcategory as keyof typeof sportsData];

        if (!currentSport) return null;

        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl"
                style={{
                    background: `linear-gradient(135deg, ${color.primary}12, ${color.secondary}12)`,
                    border: `1px solid ${color.primary}30`
                }}
            >
                {/* Enhanced Header with better visibility */}
                <div
                    className="flex items-center gap-3 mb-4 p-3 rounded-lg"
                    style={{
                        background: `linear-gradient(135deg, ${color.primary}25, ${color.secondary}25)`,
                        backdropFilter: 'blur(8px)',
                        border: `1px solid ${color.primary}40`
                    }}
                >
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                            background: `linear-gradient(135deg, ${color.primary}60, ${color.secondary}60)`
                        }}
                    >
                        <currentSport.icon
                            className="w-5 h-5 text-white"
                        />
                    </div>
                    <h5 className="font-bold text-slate-100 text-base">
                        {currentSport.name}
                    </h5>
                </div>

                {/* Team Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {currentSport.teams.map((team: string, index: number) => (
                        <motion.div
                            key={team}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center group hover:scale-105 transition-all duration-300 p-3"
                            style={{
                                borderColor: `${color.primary}40`,
                                background: `linear-gradient(135deg, ${color.primary}08, ${color.secondary}08)`
                            }}
                        >
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-200 mb-2"
                                style={{
                                    background: `linear-gradient(135deg, ${color.primary}30, ${color.secondary}30)`
                                }}
                            >
                                <Trophy
                                    className="w-5 h-5"
                                    style={{ color: color.accent }}
                                />
                            </div>
                            <span className="text-xs font-semibold text-slate-300 text-center leading-tight">
                                {team}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        );
    };

    const renderOtherCategoryPreview = () => {
        const currentPreview = categoryPreviews[selectedCategory as keyof typeof categoryPreviews];

        if (!currentPreview || selectedCategory === "Sports") return null;
        if (!('subcategories' in currentPreview)) return null;

        return currentPreview.subcategories.map((subcategory: any, categoryIndex: number) => (
            <motion.div
                key={subcategory.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
                className="p-4 rounded-xl"
                style={{
                    background: `linear-gradient(135deg, ${color.primary}08, ${color.secondary}08)`,
                    border: `1px solid ${color.primary}20`
                }}
            >
                {/* Subcategory Header */}
                <div className="flex items-center gap-3 mb-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                            background: `linear-gradient(135deg, ${color.primary}30, ${color.secondary}30)`
                        }}
                    >
                        <subcategory.icon
                            className="w-4 h-4"
                            style={{ color: color.accent }}
                        />
                    </div>
                    <h5 className="font-semibold text-slate-300 text-sm">
                        {subcategory.name}
                    </h5>
                </div>

                {/* Grid Items */}
                <div className="grid grid-cols-3 gap-3">
                    {subcategory.items.map((IconComponent: React.ComponentType<{ className?: string; style?: React.CSSProperties }>, itemIndex: number) => (
                        <motion.div
                            key={itemIndex}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: (categoryIndex * 0.1) + (itemIndex * 0.05) }}
                            className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center group hover:scale-105 transition-all duration-200"
                            style={{
                                borderColor: `${color.primary}30`,
                                background: `linear-gradient(135deg, ${color.primary}05, ${color.secondary}05)`
                            }}
                        >
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-200"
                                style={{
                                    background: `linear-gradient(135deg, ${color.primary}20, ${color.secondary}20)`
                                }}
                            >
                                <IconComponent
                                    className="w-4 h-4"
                                    style={{ color: color.accent }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        ));
    };


    return <>
        <div
            className="p-4 rounded-xl mb-6"
            style={{
                background: `linear-gradient(135deg, ${color.primary}10, ${color.secondary}10)`,
                border: `1px solid ${color.primary}30`
            }}
        >
            <h4 className="font-semibold text-slate-200 mb-2">
                {getDisplayName()}
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
                {getCategoryDescription()}
                {timePeriod === "decade" && ` from the ${selectedDecade}s`}
                {timePeriod === "year" && ` from ${selectedYear}`}
                {timePeriod === "all-time" && ` across all eras`}.
            </p>
        </div>

        {/* Enhanced Preview */}
        <div className="flex-1 mb-6 space-y-4">
            {selectedCategory === "Sports" ? (
                renderSportsPreview()
            ) : (
                renderOtherCategoryPreview()
            )}

            {!categoryPreviews[selectedCategory as keyof typeof categoryPreviews] && (
                <div
                    className="flex-1 rounded-2xl border-2 border-dashed p-8 flex items-center justify-center"
                    style={{
                        borderColor: `${color.primary}40`,
                        background: `linear-gradient(135deg, ${color.primary}05, ${color.secondary}05)`
                    }}
                >
                    <div className="text-center">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                            style={{
                                background: `linear-gradient(135deg, ${color.primary}20, ${color.secondary}20)`
                            }}
                        >
                            <Sparkles
                                className="w-8 h-8"
                                style={{ color: color.accent }}
                            />
                        </div>
                        <h4 className="font-semibold text-slate-300 mb-2">
                            Preview Loading...
                        </h4>
                        <p className="text-sm text-slate-500">
                            Category preview will appear here
                        </p>
                    </div>
                </div>
            )}
        </div>
    </>
}

export default SetupPreview;