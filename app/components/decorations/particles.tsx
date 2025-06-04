import { motion } from 'framer-motion';

export const FloatingParticles = () => {
    return <>
        <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full opacity-20"
                    style={{
                        background: `linear-gradient(45deg, #3b82f6, #8b5cf6)`,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                        y: [0, -20, 0],
                        opacity: [0.2, 0.5, 0.2],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2 + 1.5, // Delay to let initial animation finish
                    }}
                />
            ))}
        </div>
    </>
}