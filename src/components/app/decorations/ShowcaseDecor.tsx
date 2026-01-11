"use client";

import { motion } from "framer-motion"
import Image from "next/image"
import { useMotionCapabilities } from "@/hooks/use-motion-preference"

interface ShowcaseDecorProps {
    /** Whether animations should be playing (from useAnimationPause) */
    shouldAnimate?: boolean;
}

const ShowcaseDecor = ({ shouldAnimate = true }: ShowcaseDecorProps) => {
    const { allowTransitions, allowAmbient } = useMotionCapabilities();

    // Skip the entrance animation if motion not allowed or animations paused
    const skipAnimation = !allowTransitions || !shouldAnimate || !allowAmbient;

    return (
        <>
            <motion.div
                className="absolute inset-0 w-full h-full"
                initial={skipAnimation ? { opacity: 0.05, x: "-20%" } : { opacity: 0, x: "-40%" }}
                animate={{ opacity: 0.05, x: "-20%" }}
                transition={skipAnimation ? { duration: 0 } : { duration: 5 }}
                data-testid="showcase-decor-image"
                data-framer-motion-reducible="true"
            >
                <Image
                    src="/goat.png"
                    alt="GOAT Background"
                    fill
                    className="object-cover opacity-5"
                    style={{
                        objectPosition: "left center",
                        transform: "translateX(-20%)"
                    }}
                    priority
                />
            </motion.div>

            {/* Background gradient overlay to ensure readability */}
            <div
                className="absolute inset-0"
                style={{
                    background: `
                        linear-gradient(135deg,
                            rgba(15, 23, 42, 0.3) 0%,
                            rgba(30, 41, 59, 0.2) 25%,
                            rgba(51, 65, 85, 0.1) 50%,
                            rgba(30, 41, 59, 0.2) 75%,
                            rgba(15, 23, 42, 0.3) 100%
                        )
                    `
                }}
            />
        </>
    );
}

export default ShowcaseDecor;