import { Plus } from "lucide-react";

interface MatchEmptySlotProps {
  position: number;
  size?: 'small' | 'medium' | 'large';
  selectedBacklogItem: string | null;
  backlogGroups: any[]; // Replace with proper type
  gridItems: any[]; // Replace with proper type
  assignItemToGrid: (item: any, position: number) => void;
  canAddAtPosition: (position: number) => boolean;
}

const MatchEmptySlot = ({ 
  position, 
  size = 'medium',
  selectedBacklogItem,
  backlogGroups,
  gridItems,
  assignItemToGrid,
  canAddAtPosition
}: MatchEmptySlotProps) => {

    const selectedBacklogItemObj = selectedBacklogItem
        ? backlogGroups
            .flatMap(group => group.items)
            .find(item => item.id === selectedBacklogItem)
        : null;
    const getNextAvailablePosition = () => {
        return gridItems.findIndex(item => !item.matched);
    };

    const getLastAvailablePosition = () => {
        const lastIndex = gridItems.map(item => item.matched).lastIndexOf(false);
        return lastIndex !== -1 ? lastIndex : null;
    };

    const nextAvailable = getNextAvailablePosition();
    const lastAvailable = getLastAvailablePosition();
    const canAdd = canAddAtPosition(position);
    const isNextAvailable = nextAvailable === position;
    const isLastAvailable = lastAvailable === position;
    const shouldHighlight = selectedBacklogItemObj && canAdd && (isNextAvailable || isLastAvailable);

    const sizeClasses = {
        large: 'w-10 h-10 text-3xl',
        medium: 'w-8 h-8 text-2xl',
        small: 'w-6 h-6 text-lg'
    };

    const getFixedHeight = () => {
        switch (size) {
            case 'large': return 'h-44 lg:h-48 xl:h-52'; 
            case 'medium': return 'h-36 lg:h-40 xl:h-44'; 
            default: return 'h-28 sm:h-32 lg:h-36 xl:h-40'; 
        }
    };

    return (
        <div
            className={`relative w-full ${getFixedHeight()} rounded-xl border-2 border-dashed flex items-center justify-center group transition-all duration-300 ${shouldHighlight
                ? 'cursor-pointer hover:scale-105 border-green-400 hover:border-green-300'
                : canAdd && selectedBacklogItemObj
                    ? 'cursor-pointer hover:scale-105 border-slate-600 hover:border-blue-400'
                    : 'cursor-not-allowed border-slate-700 opacity-50'
                }`}
            style={{
                background: shouldHighlight
                    ? 'rgba(34, 197, 94, 0.12)'
                    : canAdd && selectedBacklogItemObj
                        ? 'rgba(59, 130, 246, 0.08)'
                        : 'rgba(71, 85, 105, 0.15)',
                border: shouldHighlight
                    ? '2px dashed rgba(34, 197, 94, 0.6)'
                    : canAdd && selectedBacklogItemObj
                        ? '2px dashed rgba(59, 130, 246, 0.5)'
                        : '2px dashed rgba(71, 85, 105, 0.6)'
            }}
            onClick={() => {
                if (selectedBacklogItemObj && canAdd) {
                    assignItemToGrid(selectedBacklogItemObj, position);
                }
            }}
        >
            <div className="flex flex-col items-center gap-3">
                <Plus
                    className={`${sizeClasses[size].split(' ').slice(0, 2).join(' ')} transition-all duration-300 ${shouldHighlight
                        ? 'opacity-80 group-hover:opacity-100 text-green-400 group-hover:text-green-300 scale-110'
                        : canAdd && selectedBacklogItemObj
                            ? 'opacity-60 group-hover:opacity-80 text-slate-400 group-hover:text-blue-400 group-hover:scale-110'
                            : 'opacity-30 text-slate-600'
                        }`}
                />
                <span
                    className={`text-sm font-bold ${shouldHighlight
                        ? 'text-green-400 group-hover:text-green-300'
                        : canAdd && selectedBacklogItemObj
                            ? 'text-slate-400 group-hover:text-blue-400'
                            : 'text-slate-600'
                        }`}
                >
                    {position + 1}
                </span>

                {/* Position indicator for top positions */}
                {position < 3 && (
                    <div className="absolute -top-3 -right-3">
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg"
                            style={{
                                background: position === 0 ? '#ffd700' : position === 1 ? '#c0c0c0' : '#cd7f32',
                                color: '#000'
                            }}
                        >
                            {position + 1}
                        </div>
                    </div>
                )}

                {/* Enhanced hint text */}
                <div className="absolute bottom-3 left-0 right-0 text-center">
                    <span className="text-xs text-slate-500 opacity-80">
                        {selectedBacklogItemObj && canAdd && position < 10
                            ? `Press ${position === 9 ? '0' : (position + 1).toString()}`
                            : 'Drop here'
                        }
                    </span>
                </div>
            </div>
        </div>
    );
};

export default MatchEmptySlot;