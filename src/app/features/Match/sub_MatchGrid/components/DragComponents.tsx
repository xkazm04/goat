"use client";

import { motion } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { PlaceholderImage } from '@/components/ui/placeholder-image';

/**
 * Represents a draggable item with image and title
 */
interface DraggableItem {
    id?: string;
    title: string;
    image_url?: string | null;
}

interface DragOverlayContentProps {
    activeItem: DraggableItem;
    velocity?: { x: number; y: number };
    isSnapping?: boolean;
    previewPosition?: number | null;
}

/**
 * Enhanced DragOverlayContent with inertia-driven visuals
 *
 * Features:
 * - Dynamic shadow based on drag velocity
 * - Rotation effect based on horizontal movement
 * - Scale bounce on snap
 * - Glow intensity based on proximity to drop zone
 */
export function DragOverlayContent({
    activeItem,
    velocity = { x: 0, y: 0 },
    isSnapping = false,
    previewPosition,
}: DragOverlayContentProps) {
    if (!activeItem) return null;

    // Calculate rotation based on velocity (subtle tilt effect)
    const rotation = Math.max(-15, Math.min(15, velocity.x * 0.01));

    // Calculate shadow intensity based on combined velocity
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    const shadowIntensity = Math.min(1, speed / 500);

    return (
        <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{
                scale: isSnapping ? [1.1, 0.95, 1] : 1.05,
                rotate: rotation,
            }}
            transition={{
                scale: isSnapping ? { duration: 0.3, ease: "easeOut" } : { duration: 0.15 },
                rotate: { duration: 0.1 },
            }}
            className="relative w-24 h-24 rounded-xl overflow-hidden"
            style={{
                boxShadow: `
                    0 ${10 + shadowIntensity * 15}px ${20 + shadowIntensity * 30}px rgba(0, 0, 0, ${0.3 + shadowIntensity * 0.2}),
                    0 0 ${30 + shadowIntensity * 20}px rgba(34, 211, 238, ${0.3 + shadowIntensity * 0.3}),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1)
                `,
            }}
            data-testid="drag-overlay-item"
        >
            {/* Glow border */}
            <motion.div
                className="absolute inset-0 rounded-xl pointer-events-none z-20"
                animate={{
                    boxShadow: previewPosition !== null
                        ? "inset 0 0 15px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.4)"
                        : "inset 0 0 0px transparent",
                }}
                transition={{ duration: 0.2 }}
            />

            {/* Border */}
            <motion.div
                className="absolute inset-0 rounded-xl border-2 pointer-events-none z-10"
                animate={{
                    borderColor: previewPosition !== null
                        ? "rgba(34, 211, 238, 1)"
                        : "rgba(34, 211, 238, 0.6)",
                }}
                transition={{ duration: 0.15 }}
            />

            {/* Content */}
            <PlaceholderImage
                src={activeItem.image_url}
                alt={activeItem.title}
                testId="drag-overlay-image"
                seed={activeItem.id || activeItem.title}
                eager={true}
                blurAmount={15}
                fallbackComponent={
                    <span className="text-xs text-gray-400 text-center px-2">
                        {activeItem.title}
                    </span>
                }
            />

            {/* Position preview indicator */}
            {typeof previewPosition === 'number' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-1 right-1 bg-cyan-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm z-30"
                    data-testid="position-preview"
                >
                    #{previewPosition + 1}
                </motion.div>
            )}

            {/* Velocity trail effect */}
            {speed > 100 && (
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `linear-gradient(${Math.atan2(velocity.y, velocity.x) * (180 / Math.PI) + 180}deg, transparent 30%, rgba(34, 211, 238, ${Math.min(0.3, speed / 1000)}) 100%)`,
                    }}
                />
            )}
        </motion.div>
    );
}

/**
 * SnapPreviewGrid - Shows ghost preview of where item will snap
 */
interface SnapPreviewGridProps {
    previewPosition: number | null;
    gridConfig?: {
        rows: number;
        cols: number;
        cellWidth: number;
        cellHeight: number;
        gap: number;
    };
}

export function SnapPreviewGrid({ previewPosition, gridConfig }: SnapPreviewGridProps) {
    if (previewPosition === null) return null;

    const config = gridConfig || { rows: 10, cols: 10, cellWidth: 80, cellHeight: 80, gap: 8 };
    const row = Math.floor(previewPosition / config.cols);
    const col = previewPosition % config.cols;

    const x = col * (config.cellWidth + config.gap);
    const y = row * (config.cellHeight + config.gap);

    return (
        <motion.div
            className="absolute pointer-events-none z-40"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
                left: x,
                top: y,
                width: config.cellWidth,
                height: config.cellHeight,
            }}
            data-testid="snap-preview-grid"
        >
            {/* Preview ghost */}
            <motion.div
                className="absolute inset-0 rounded-xl"
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1, 1.02, 1],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                style={{
                    background: "rgba(34, 211, 238, 0.15)",
                    border: "2px dashed rgba(34, 211, 238, 0.5)",
                    boxShadow: "0 0 20px rgba(34, 211, 238, 0.2)",
                }}
            />

            {/* Position label */}
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-cyan-400/60 text-2xl font-bold">
                    {previewPosition + 1}
                </span>
            </div>
        </motion.div>
    );
}

/**
 * DragTrail - Creates a trailing effect behind the dragged item
 */
interface DragTrailProps {
    positions: Array<{ x: number; y: number; timestamp: number }>;
}

export function DragTrail({ positions }: DragTrailProps) {
    const now = Date.now();
    const maxAge = 200; // Trail lifetime in ms

    // Filter to only recent positions
    const validPositions = positions.filter(p => now - p.timestamp < maxAge);

    if (validPositions.length < 2) return null;

    return (
        <svg className="fixed inset-0 pointer-events-none z-[98]" data-testid="drag-trail">
            <defs>
                <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
                    <stop offset="100%" stopColor="rgba(34, 211, 238, 0.5)" />
                </linearGradient>
            </defs>
            {validPositions.slice(0, -1).map((pos, idx) => {
                const nextPos = validPositions[idx + 1];
                const age = now - pos.timestamp;
                const opacity = 1 - age / maxAge;

                return (
                    <line
                        key={idx}
                        x1={pos.x}
                        y1={pos.y}
                        x2={nextPos.x}
                        y2={nextPos.y}
                        stroke="rgba(34, 211, 238, 0.3)"
                        strokeWidth={3 * opacity}
                        strokeLinecap="round"
                        opacity={opacity * 0.5}
                    />
                );
            })}
        </svg>
    );
}

interface CursorGlowProps {
    glowX: MotionValue<number>;
    glowY: MotionValue<number>;
    cursorX?: MotionValue<number>;
    cursorY?: MotionValue<number>;
}

export function CursorGlow({ glowX, glowY, cursorX, cursorY }: CursorGlowProps) {
    // Use immediate cursor position if provided, otherwise fall back to glow position
    const dotX = cursorX ?? glowX;
    const dotY = cursorY ?? glowY;
    
    return (
        <>
            {/* Trailing glow effects - uses spring animation for smooth trailing */}
            <motion.div
                className="fixed pointer-events-none z-[99]"
                style={{
                    left: glowX,
                    top: glowY,
                }}
                data-testid="cursor-glow"
            >
                {/* Pulsing outer glow - centered on spring position */}
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        width: '120px',
                        height: '120px',
                        left: '-60px',
                        top: '-60px',
                        background: 'radial-gradient(circle, rgba(34, 211, 238, 0.3) 0%, rgba(34, 211, 238, 0.1) 40%, transparent 70%)',
                        filter: 'blur(15px)',
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 0.8, 0.6],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />

                {/* Inner sharp glow - centered on spring position */}
                <motion.div
                    className="absolute rounded-full"
                    style={{
                        width: '80px',
                        height: '80px',
                        left: '-40px',
                        top: '-40px',
                        background: 'radial-gradient(circle, rgba(34, 211, 238, 0.5) 0%, rgba(34, 211, 238, 0.2) 50%, transparent 70%)',
                        filter: 'blur(8px)',
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            </motion.div>

            {/* Center dot - positioned consistently slightly above the cursor for better visibility */}
            <motion.div
                className="fixed pointer-events-none z-[101]"
                style={{
                    left: dotX,
                    top: dotY,
                }}
                data-testid="cursor-dot"
            >
                <motion.div
                    className="absolute rounded-full bg-cyan-400"
                    style={{
                        width: '8px',
                        height: '8px',
                        left: '-4px',
                        top: '-16px',
                        boxShadow: '0 0 12px rgba(34, 211, 238, 0.9), 0 0 4px rgba(34, 211, 238, 1)',
                    }}
                    animate={{
                        opacity: [0.9, 1, 0.9],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            </motion.div>
        </>
    );
}
