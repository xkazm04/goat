"use client";

import { motion } from 'framer-motion';

interface DragOverlayContentProps {
    activeItem: any;
}

export function DragOverlayContent({ activeItem }: DragOverlayContentProps) {
    if (!activeItem) return null;

    return (
        <div
            className="w-24 h-24 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.5)] border-2 border-cyan-400 rotate-3 scale-110"
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
}

export function CursorGlow({ glowX, glowY }: CursorGlowProps) {
    return (
        <motion.div
            className="fixed pointer-events-none z-[100]"
            style={{
                left: glowX,
                top: glowY,
                x: '-50%',
                y: '-50%',
            }}
            data-testid="cursor-glow"
        >
            {/* Pulsing outer glow */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    width: '120px',
                    height: '120px',
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

            {/* Inner sharp glow */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    width: '80px',
                    height: '80px',
                    left: '20px',
                    top: '20px',
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

            {/* Center dot */}
            <motion.div
                className="absolute rounded-full bg-cyan-400"
                style={{
                    width: '8px',
                    height: '8px',
                    left: '56px',
                    top: '56px',
                    boxShadow: '0 0 10px rgba(34, 211, 238, 0.8)',
                }}
                animate={{
                    opacity: [0.8, 1, 0.8],
                }}
                transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </motion.div>
    );
}
