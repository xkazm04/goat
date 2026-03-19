"use client";

import { RotateCcw } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { create } from 'zustand';

import { useGridItemAtPosition, useGridStore } from '@/stores/grid-store';

import { useGridPinchZoom } from '../../hooks/useGridPinchZoom';
import { SimpleDropZone } from '../../sub_DropZone/SimpleDropZone';
import { triggerHaptic } from '../lib/hapticFeedback';
import { getItemTitle } from '../lib/helpers';



interface GridSectionProps {
    title?: string;
    startPosition: number;
    endPosition: number;
    columns: number;
    gap?: number;
    onRemove: (position: number) => void;
}

/** Tiny store for grid click-to-move selection (avoids polluting main grid store) */
const useClickMoveStore = create<{
    selectedPosition: number | null;
    setSelectedPosition: (pos: number | null) => void;
}>((set) => ({
    selectedPosition: null,
    setSelectedPosition: (pos) => set({ selectedPosition: pos }),
}));

const clickToPlaceStyle = { boxShadow: 'var(--glow-brand-sm)', borderRadius: '0.75rem', cursor: 'pointer' } as const;
const clickMoveSourceStyle = { boxShadow: 'var(--glow-brand-md)', borderRadius: '0.75rem', cursor: 'pointer' } as const;

/**
 * Individual grid slot that subscribes only to its own position.
 * Supports click-to-place (from backlog) and click-to-move (between grid slots).
 */
const GridSlot = memo(function GridSlot({
    position,
    onRemove,
}: {
    position: number;
    onRemove: (position: number) => void;
}) {
    const item = useGridItemAtPosition(position);
    const isOccupied = item?.matched ?? false;
    const backlogSelectedItem = useGridStore((s) => s.mobileSelectedItem);
    const gridSelectedPos = useClickMoveStore((s) => s.selectedPosition);

    const handleRemove = useCallback(() => {
        onRemove(position);
    }, [onRemove, position]);

    const handleClickSlot = useCallback(() => {
        // Priority 1: Backlog item selected → place/replace it here
        if (backlogSelectedItem) {
            useGridStore.getState().handleMobileTapSlot(position);
            triggerHaptic('dropPositionRegular');
            useClickMoveStore.getState().setSelectedPosition(null);
            return;
        }

        const currentGridSelectedPos = useClickMoveStore.getState().selectedPosition;

        // Priority 2: A grid item is already selected → move/swap it to this position
        if (currentGridSelectedPos !== null) {
            if (currentGridSelectedPos === position) {
                // Clicked same slot → deselect
                useClickMoveStore.getState().setSelectedPosition(null);
                return;
            }
            // Move the grid item
            const gridStore = useGridStore.getState();
            const sourceItem = gridStore.gridItems[currentGridSelectedPos];
            if (sourceItem?.matched) {
                gridStore.moveGridItem(currentGridSelectedPos, position);
                triggerHaptic('dropPositionRegular');
            }
            useClickMoveStore.getState().setSelectedPosition(null);
            return;
        }

        // Priority 3: Nothing selected + slot is occupied → select this grid item for moving
        if (isOccupied) {
            useClickMoveStore.getState().setSelectedPosition(position);
            return;
        }
    }, [position, isOccupied, backlogSelectedItem]);

    // Determine highlight style
    const isGridMoveSource = gridSelectedPos === position;
    let slotStyle: React.CSSProperties | undefined;
    if (isGridMoveSource) {
        slotStyle = clickMoveSourceStyle;
    } else if (backlogSelectedItem || gridSelectedPos !== null) {
        slotStyle = clickToPlaceStyle;
    }

    return (
        <div onClick={handleClickSlot} style={slotStyle} data-testid={`grid-slot-${position}`}>
            <SimpleDropZone
                position={position}
                isOccupied={isOccupied}
                occupiedBy={isOccupied ? getItemTitle(item) : undefined}
                imageUrl={isOccupied ? item?.image_url : undefined}
                gridItem={isOccupied ? item ?? undefined : undefined}
                onRemove={handleRemove}
            />
        </div>
    );
});

export function GridSection({
    title,
    startPosition,
    endPosition,
    columns,
    gap = 4,
    onRemove,
}: GridSectionProps) {
    const gridSize = endPosition - startPosition;
    const { zoomState, enabled: pinchEnabled, containerRef, gridStyle, resetZoom, handlers: pinchHandlers } = useGridPinchZoom(gridSize);

    const positions = useMemo(() => {
        const arr: number[] = [];
        for (let i = startPosition; i < endPosition; i++) {
            arr.push(i);
        }
        return arr;
    }, [startPosition, endPosition]);

    // Responsive columns: fewer columns on mobile
    const mobileColumns = Math.min(columns, 4);

    return (
        <section className="relative" data-testid="grid-section">
            {title && (
                <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-white/8 to-white/12" />
                    <h3 className="text-xs sm:text-sm font-bold text-white/50 tracking-widest uppercase px-2">{title}</h3>
                    <div className="h-px flex-1 bg-linear-to-r from-white/12 via-white/8 to-transparent" />
                </div>
            )}

            {/* Pinch zoom controls — only show for large grids when zoomed */}
            {pinchEnabled && zoomState.scale !== 1.0 && (
                <div className="flex items-center justify-end gap-1 mb-2">
                    <span className="text-xs text-white/40 mr-1">{Math.round(zoomState.scale * 100)}%</span>
                    <button
                        onClick={resetZoom}
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/50 transition-colors touch-target"
                        aria-label="Reset zoom"
                        data-testid="grid-reset-zoom-btn"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Pinch-zoom container */}
            <div
                ref={containerRef}
                className="overflow-hidden touch-pan-x"
                {...(pinchEnabled ? pinchHandlers : {})}
            >
                <div
                    className="grid"
                    style={{
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        gap: `${gap * 4}px`,
                        ...gridStyle,
                    }}
                >
                    {positions.map((position) => (
                        <GridSlot
                            key={position}
                            position={position}
                            onRemove={onRemove}
                        />
                    ))}
                </div>
            </div>
            {/* Mobile-responsive override via CSS media query */}
            <style jsx>{`
                @media (max-width: 767px) {
                    .grid {
                        grid-template-columns: repeat(${mobileColumns}, minmax(0, 1fr)) !important;
                        gap: 4px !important;
                    }
                }
            `}</style>
        </section>
    );
}
