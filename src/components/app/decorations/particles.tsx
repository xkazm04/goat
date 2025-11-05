import { motion } from 'framer-motion';

// Predefined particle configuration to avoid hydration mismatch
const floatingParticleConfig = [
    { left: 12.5, top: 18.3, duration: 3.2, delay: 1.8 },
    { left: 87.2, top: 31.7, duration: 4.1, delay: 2.3 },
    { left: 23.8, top: 72.4, duration: 3.8, delay: 1.5 },
    { left: 76.1, top: 14.9, duration: 3.5, delay: 2.8 },
    { left: 44.7, top: 86.2, duration: 4.0, delay: 1.7 },
    { left: 91.3, top: 58.6, duration: 3.7, delay: 2.1 },
    { left: 8.9, top: 43.2, duration: 3.3, delay: 2.5 },
    { left: 67.4, top: 27.8, duration: 3.9, delay: 1.9 },
    { left: 33.6, top: 89.1, duration: 3.6, delay: 2.7 },
    { left: 58.2, top: 9.5, duration: 3.4, delay: 1.6 },
    { left: 79.8, top: 74.3, duration: 4.2, delay: 2.2 },
    { left: 18.7, top: 51.9, duration: 3.1, delay: 2.4 },
    { left: 94.1, top: 35.4, duration: 3.8, delay: 1.8 },
    { left: 26.3, top: 67.8, duration: 4.0, delay: 2.6 },
    { left: 52.9, top: 22.1, duration: 3.7, delay: 1.4 },
    { left: 71.6, top: 93.7, duration: 3.5, delay: 2.9 },
    { left: 5.4, top: 48.6, duration: 4.1, delay: 1.3 },
    { left: 88.7, top: 16.2, duration: 3.9, delay: 2.0 },
    { left: 39.2, top: 81.5, duration: 3.2, delay: 2.8 },
    { left: 63.8, top: 7.3, duration: 3.6, delay: 1.7 }
];

export const FloatingParticles = () => {
    return <>
        <div className="absolute inset-0 pointer-events-none">
            {floatingParticleConfig.map((particle, i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full opacity-20"
                    style={{
                        background: `linear-gradient(45deg, #3b82f6, #8b5cf6)`,
                        left: `${particle.left}%`,
                        top: `${particle.top}%`,
                    }}
                    animate={{
                        y: [0, -20, 0],
                        opacity: [0.2, 0.5, 0.2],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        delay: particle.delay,
                    }}
                />
            ))}
        </div>
    </>
}