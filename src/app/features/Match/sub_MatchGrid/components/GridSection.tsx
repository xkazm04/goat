"use client";

import { memo, useCallback, useMemo } from 'react';
import { SimpleDropZone } from '../../sub_DropZone/SimpleDropZone';
import { useGridItemAtPosition, useGridStore } from '@/stores/grid-store';
import { getItemTitle } from '../lib/helpers';
import { triggerHaptic } from '../lib/hapticFeedback';

interface GridSectionProps {
    title?: string;
    startPosition: number;
    endPosition: number;
    columns: number;
    gap?: number;
    onRemove: (position: number) => void;
}

/**
 * Individual grid slot that subscribes only to its own position.
 * Re-renders only when the item at this specific position changes (O(1) per drag).
 * On mobile, supports tap-to-place: tapping an empty slot places the selected backlog item.
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
    const mobileSelectedItem = useGridStore((s) => s.mobileSelectedItem);

    const handleRemove = useCallback(() => {
        onRemove(position);
    }, [onRemove, position]);

    const handleTapSlot = useCallback(() => {
        if (!isOccupied && mobileSelectedItem) {
            useGridStore.getState().handleMobileTapSlot(position);
            triggerHaptic('dropPositionRegular');
        }
    }, [position, isOccupied, mobileSelectedItem]);

    // Show highlight ring when mobile selection is active and slot is empty
    const showMobileHighlight = !isOccupied && mobileSelectedItem !== null;

    return (
        <div
            onClick={handleTapSlot}
            className={showMobileHighlight ? 'ring-2 ring-brand-primary/60 rounded-lg transition-all' : ''}
        >
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
        <section className="relative">
            {title && (
                <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
                    <div className="h-px flex-1 bg-linear-to-r from-transparent via-white/8 to-white/12" />
                    <h3 className="text-xs sm:text-sm font-bold text-white/50 tracking-widest uppercase px-2">{title}</h3>
                    <div className="h-px flex-1 bg-linear-to-r from-white/12 via-white/8 to-transparent" />
                </div>
            )}
            <div
                className="grid"
                style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    gap: `${gap * 4}px`,
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
