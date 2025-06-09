import ProgressMain from "@/app/components/ProgressMain";
import { useCurrentList } from "@/app/stores/use-list-store";
import { useComparisonStore } from "@/app/stores/comparison-store";
import { motion } from "framer-motion";
import { useMemo } from "react";

type Props = {
    setIsComparisonModalOpen: (isOpen: boolean) => void;
}

const MatchContainerHeader = ({ setIsComparisonModalOpen }: Props) => {
    const currentList = useCurrentList();
    const { items: compareList, openComparison } = useComparisonStore();
    
    // Generate dynamic subtitle and description based on current list
    const { subtitle, description } = useMemo(() => {
        if (!currentList) {
            return {
                subtitle: "Greatest of All Time",
                description: "Build your ultimate top 50 greatest of all time"
            };
        }
        
        const { metadata, title } = currentList;
        const size = metadata?.size || currentList.size || 50;
        const timePeriod = metadata?.timePeriod || "all-time";
        
        const formatTimePeriod = (period: string) => {
            switch (period) {
                case "all-time":
                    return "All Time";
                case "decade":
                    return metadata?.selectedDecade ? `${metadata.selectedDecade}s` : "Decade";
                case "year":
                    return metadata?.selectedYear ? `${metadata.selectedYear}` : "Year";
                default:
                    return "All Time";
            }
        };
        
        const formattedTimePeriod = formatTimePeriod(timePeriod);
        
        return {
            subtitle: `Top ${size} of ${formattedTimePeriod}`,
            description: title
        };
    }, [currentList]);
    
    const contextInfo = useMemo(() => {
        if (!currentList) return null;
        
        const selectedCategory = currentList.metadata?.selectedCategory || currentList.category;
        const selectedSubcategory = currentList.metadata?.selectedSubcategory || currentList.subcategory;
        
        if (selectedSubcategory) {
            return `${selectedCategory} • ${selectedSubcategory}`;
        }
        
        return selectedCategory;
    }, [currentList]);

    const handleOpenComparison = () => {
        openComparison();
        setIsComparisonModalOpen(true);
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <div className="flex flex-row justify-between items-start gap-4 mb-4">
                <div className="flex-1">
                    <div className="space-y-2">
                        <p className="text-lg text-yellow-100 font-medium">
                            {description}
                        </p>
                        {contextInfo && (
                            <p className="text-sm text-yellow-200/70 capitalize">
                                {contextInfo}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex justify-center">
                    <motion.button
                        onClick={handleOpenComparison}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gray-700/50 flex items-center gap-3 px-4 py-2 rounded-2xl font-bold text-white transition-all duration-300 relative"
                        style={{
                            boxShadow: compareList.length > 0
                                ? '0 4px 15px rgba(59, 130, 246, 0.3)'
                                : 'none'
                        }}
                    >
                        <span className="text-sm">Bench</span>
                        {compareList.length > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                            >
                                {compareList.length}
                            </motion.div>
                        )}
                    </motion.button>
                </div>
            </div>

            <ProgressMain 
                text={subtitle} 
                showPercentage={true}
                className="mb-2"
            />
        </motion.div>
    );
};

export default MatchContainerHeader;