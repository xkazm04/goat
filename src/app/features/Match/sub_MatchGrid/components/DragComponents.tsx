"use client";

import { motion } from 'framer-motion';

interface DragOverlayContentProps {
    activeItem: any;
}

export function DragOverlayContent({ activeItem }: DragOverlayContentProps) {
    if (!activeItem) return null;

    return (
        <div
            className="w-24 h-24 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.5)] border-2 border-cyan-400 scale-105"
            data-testid="drag-overlay-item"
        >
            {activeItem.image_url ? (
                <img
                    src={activeItem.image_url}
                    alt={activeItem.title}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <span className="text-xs text-gray-400">{activeItem.title}</span>
                </div>
            )}
        </div>
    );
}

interface CursorGlowProps {
    glowX: any;
    glowY: any;
    cursorX?: any;
    cursorY?: any;
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

            {/* Center dot - positioned below and right of cursor hotspot */}
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
                        left: '8px',
                        top: '8px',
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
