import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { TopList } from '@/types/top-lists';
import { getCategoryColor } from '@/lib/helpers/getColors';

interface FeatureListItemProps {
    list: TopList;
    onPlay: (list: TopList) => void;
}

export const FeatureListItem = ({ list, onPlay }: FeatureListItemProps) => {
    const colors = getCategoryColor(list.category);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className="relative bg-gray-800/40 border border-gray-700/50 rounded-lg overflow-hidden hover:border-cyan-500/30 transition-all duration-300"
            data-testid={`featured-list-item-${list.id}`}
        >
            {/* Subtle gradient overlay */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                }}
            />

            <div className="relative p-4">
                <div className="flex items-center justify-between gap-3">
                    {/* Left: Category badge + title */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="px-2 py-0.5 rounded text-xs font-bold text-white flex-shrink-0"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                                }}
                                data-testid={`featured-list-category-${list.id}`}
                            >
                                {list.category.toUpperCase()}
                            </div>
                            {list.subcategory && (
                                <span className="text-xs text-gray-400" data-testid={`featured-list-subcategory-${list.id}`}>
                                    {list.subcategory}
                                </span>
                            )}
                        </div>
                        <h4 className="text-sm font-semibold text-white truncate" data-testid={`featured-list-title-${list.id}`}>
                            {list.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1" data-testid={`featured-list-meta-${list.id}`}>
                            Top {list.size} • {list.time_period?.replace('-', ' ') || 'all time'}
                        </p>
                    </div>

                    {/* Right: Play button */}
                    <motion.button
                        onClick={() => onPlay(list)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex-shrink-0 p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded-lg transition-all shadow-lg shadow-cyan-500/10"
                        data-testid={`featured-list-play-btn-${list.id}`}
                    >
                        <Play className="w-4 h-4 text-cyan-400" />
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};
