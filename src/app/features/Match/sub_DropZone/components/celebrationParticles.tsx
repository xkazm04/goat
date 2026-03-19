"use client";

import { motion } from "framer-motion";
import { DURATION } from '@/lib/animations/motion-presets';

// Types
export interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
  duration: number;
  shape: 'circle' | 'square' | 'star';
}

export interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

// Generators
export function generateConfettiParticles(rankColor: string, position: number): ConfettiParticle[] {
  const colors = position === 0
    ? ['#FFD700', '#FFA500', '#FFE55C', '#FFEC8B', '#FFFFFF']
    : position === 1
    ? ['#C0C0C0', '#E8E8E8', '#A0A0A0', '#FFFFFF', '#D4D4D4']
    : ['#CD7F32', '#E8A060', '#D4A056', '#FFD700', '#FFFFFF'];

  const shapes: Array<'circle' | 'square' | 'star'> = ['circle', 'square', 'star'];
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < 20; i++) {
    particles.push({
      id: i,
      x: Math.random() * 100 - 50,
      y: Math.random() * -100 - 20,
      rotation: Math.random() * 360,
      scale: 0.3 + Math.random() * 0.7,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.15,
      duration: DURATION.dramatic + Math.random() * 0.4,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    });
  }
  return particles;
}

export function generateSparkles(): SparkleParticle[] {
  const sparkles: SparkleParticle[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const distance = 40 + Math.random() * 30;
    sparkles.push({
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size: 3 + Math.random() * 4,
      delay: i * 0.03,
      duration: 0.4 + Math.random() * 0.2,
    });
  }
  return sparkles;
}

// Components
export function ConfettiParticleComponent({ particle }: { particle: ConfettiParticle }) {
  const Shape = () => {
    if (particle.shape === 'circle') return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: particle.color }} />;
    if (particle.shape === 'square') return <div className="w-2 h-2" style={{ backgroundColor: particle.color }} />;
    return <svg className="w-3 h-3" viewBox="0 0 24 24" fill={particle.color}><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" /></svg>;
  };

  return (
    <motion.div
      initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
      animate={{ x: particle.x, y: particle.y, scale: [0, particle.scale, particle.scale * 0.5, 0], rotate: particle.rotation, opacity: [1, 1, 0.5, 0] }}
      transition={{ duration: particle.duration, delay: particle.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ transform: 'translate(-50%, -50%)' }}
    >
      <Shape />
    </motion.div>
  );
}

export function SparkleParticleComponent({ sparkle, color }: { sparkle: SparkleParticle; color: string }) {
  return (
    <motion.div
      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
      animate={{ x: sparkle.x, y: sparkle.y, scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
      transition={{ duration: sparkle.duration, delay: sparkle.delay, ease: "easeOut" }}
      className="absolute left-1/2 top-1/2 pointer-events-none"
      style={{ width: sparkle.size, height: sparkle.size, backgroundColor: color, borderRadius: '50%', boxShadow: `0 0 ${sparkle.size * 2}px ${color}`, transform: 'translate(-50%, -50%)' }}
    />
  );
}

export function GlowPulseRing({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: [0.8, 1.3, 1.5], opacity: [0, 0.8, 0] }}
      transition={{ duration: DURATION.emphasis, delay, ease: "easeOut" }}
      className="absolute -inset-2 rounded-card pointer-events-none"
      style={{ border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}` }}
      data-testid="glow-pulse-ring"
    />
  );
}
