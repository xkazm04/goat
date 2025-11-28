"use client";

/**
 * ParticleShape Component
 * Renders different particle shapes for swipe effects
 */

import type { ParticleShape as ParticleShapeType } from '@/types/particle-theme.types';

interface ParticleShapeProps {
  shape: ParticleShapeType;
  color: string;
  size: number;
}

/**
 * Renders a particle shape with the specified color and size
 * Supports: circle, square, triangle, star, heart, sparkle
 */
export function ParticleShape({ shape, color, size }: ParticleShapeProps) {
  const baseClasses = 'absolute pointer-events-none';

  switch (shape) {
    case 'circle':
      return (
        <div
          className={`${baseClasses} rounded-full`}
          style={{
            width: size,
            height: size,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      );
    case 'square':
      return (
        <div
          className={baseClasses}
          style={{
            width: size,
            height: size,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      );
    case 'triangle':
      return (
        <div
          className={baseClasses}
          style={{
            width: 0,
            height: 0,
            borderLeft: `${size / 2}px solid transparent`,
            borderRight: `${size / 2}px solid transparent`,
            borderBottom: `${size}px solid ${color}`,
            filter: `drop-shadow(0 0 5px ${color})`,
          }}
        />
      );
    case 'star':
      return (
        <div
          className={baseClasses}
          style={{
            width: size,
            height: size,
            background: color,
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            filter: `drop-shadow(0 0 5px ${color})`,
          }}
        />
      );
    case 'heart':
      return (
        <div
          className={baseClasses}
          style={{
            width: size,
            height: size,
            background: color,
            clipPath: 'path("M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z")',
            filter: `drop-shadow(0 0 5px ${color})`,
          }}
        />
      );
    case 'sparkle':
      return (
        <div
          className={baseClasses}
          style={{
            width: size,
            height: size,
            background: `linear-gradient(45deg, ${color}, transparent)`,
            clipPath: 'polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)',
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      );
    default:
      return (
        <div
          className={`${baseClasses} rounded-full`}
          style={{
            width: size,
            height: size,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      );
  }
}
