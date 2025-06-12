
import { BacklogItemType } from "@/app/types/match";
import Image from "next/image";

interface BacklogItemContentProps {
    item: BacklogItemType;
    size?: 'small' | 'medium' | 'large';
    isEffectivelyMatched?: boolean;
    isSelected?: boolean;
    isInCompareList?: boolean;
    isDragOverlay?: boolean;
    isDragging?: boolean;
}

export function BacklogItemContent({
    item,
    size = 'medium',
    isEffectivelyMatched = false,
    isSelected = false,
    isInCompareList = false,
    isDragOverlay = false,
    isDragging = false
}: BacklogItemContentProps) {

    // Size configurations
    const sizeConfig = {
        small: {
            icon: 'w-4 h-4',
            iconContainer: 'w-8 h-8',
            text: 'text-xs',
            padding: ''
        },
        medium: {
            icon: 'w-5 h-5',
            iconContainer: 'w-10 h-10',
            text: 'text-xs',
            padding: ''
        },
        large: {
            icon: 'w-6 h-6',
            iconContainer: 'w-12 h-12',
            text: 'text-sm',
            padding: ''
        }
    };

    const config = sizeConfig[size];

    return (
        <>
            <Image
                src={item.image_url || '/avatars/basket_michael_jordan.jpg'}
                alt={item.title}
                fill
                style={{ objectFit: 'cover' }}
                className="rounded-md opacity-20"
            />
            {/* Main Content */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center ${config.padding} pointer-events-none`}>
                <div
                    className={`${config.text} font-semibold text-center leading-tight line-clamp-2 ${isEffectivelyMatched ? 'text-slate-500' : 'text-slate-200'
                        }`}
                    title={item.title}
                >
                    {item.title}
                </div>
            </div>

            {/* Hover Overlay for Available Items */}
            {!isEffectivelyMatched && !isDragOverlay && !isDragging && size !== 'small' && (
                <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none ${isSelected ? 'bg-blue-500/10' : isInCompareList ? 'bg-green-500/10' : 'bg-black/20'
                        }`}
                >
                </div>
            )}
        </>
    );
}