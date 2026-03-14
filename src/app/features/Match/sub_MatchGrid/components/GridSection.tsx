"use client";

import { SimpleDropZone } from '../../sub_DropZone/SimpleDropZone';
import { GridItemType } from '@/types/match';

interface GridSectionProps {
    title?: string;
    gridItems: (GridItemType | null)[];
    startPosition: number;
    endPosition: number;
    columns: number;
    gap?: number;
    onRemove: (position: number) => void;
    getItemTitle: (item: GridItemType) => string;
}

export function GridSection({
    title,
    gridItems,
    startPosition,
    endPosition,
    columns,
    gap = 4,
    onRemove,
    getItemTitle
}: GridSectionProps) {
    return (
        <section className="relative">
            {title && (
                <div className="flex items-center gap-4 mb-6">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/8 to-white/12" />
                    <h3 className="text-sm font-bold text-white/50 tracking-widest uppercase px-2">{title}</h3>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/12 via-white/8 to-transparent" />
                </div>
            )}
            <div className={`grid gap-${gap}`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {gridItems.slice(startPosition, endPosition).map((item, idx) => {
                    const position = startPosition + idx;
                    const isOccupied = item && item.matched;
                    return (
                        <SimpleDropZone
                            key={position}
                            position={position}
                            isOccupied={!!isOccupied}
                            occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                            imageUrl={isOccupied ? item.image_url : undefined}
                            gridItem={isOccupied ? item : undefined}
                            onRemove={() => onRemove(position)}
                        />
                    );
                })}
            </div>
        </section>
    );
}
