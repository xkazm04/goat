'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { LandingMain } from './LandingMain';
import {
    LazyFeaturedListsSection,
    LazyUserListsSection,
    ListSectionSkeleton,
    UserListsSkeleton
} from './sub_LandingLists/LazyListSections';
import { ParallaxSection, ParallaxLayer, FloatingElements, FloatingPresets } from '@/components/3d';
import { useScrollTrigger, scrollAnimationVariants } from '@/lib/animations';

/**
 * ScrollRevealSection - Wrapper that reveals content on scroll
 */
function ScrollRevealSection({
    children,
    className,
    animation = 'fadeUp',
}: {
    children: React.ReactNode;
    className?: string;
    animation?: 'fadeUp' | 'fadeLeft' | 'fadeRight' | 'scale';
}) {
    const { ref, isInView } = useScrollTrigger({
        threshold: 0.1,
        rootMargin: '-50px',
        triggerOnce: true,
    });

    return (
        <motion.div
            ref={ref as React.RefObject<HTMLDivElement>}
            className={className}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            variants={scrollAnimationVariants[animation]}
        >
            {children}
        </motion.div>
    );
}

/**
 * LandingLayout - Main layout for the landing page
 *
 * Features immersive 3D effects, parallax scrolling, and scroll-triggered
 * animations. Uses lazy loading for below-the-fold sections.
 * All animations respect reduced motion preferences.
 */
const LandingLayout = () => {
    return (
        <div className="min-h-screen relative" data-testid="landing-layout">
            {/* Global floating elements - ambient decoration */}
            <FloatingElements
                count={15}
                pattern="random"
                {...FloatingPresets.ocean}
                zIndex={1}
                className="fixed inset-0"
            />

            {/* Main hero section - loads immediately */}
            <LandingMain />

            {/* Below-the-fold sections with parallax and scroll reveals */}
            <ParallaxSection
                offset={['start end', 'end start']}
                className="relative z-10"
            >
                {/* Featured Lists with parallax depth */}
                <ParallaxLayer speedY={0.1} enableFade fadeStart={0.5}>
                    <ScrollRevealSection animation="fadeUp">
                        <Suspense fallback={<ListSectionSkeleton />}>
                            <LazyFeaturedListsSection />
                        </Suspense>
                    </ScrollRevealSection>
                </ParallaxLayer>

                {/* Decorative floating layer */}
                <ParallaxLayer
                    speedY={-0.2}
                    zIndex={-1}
                    className="absolute inset-0 pointer-events-none"
                >
                    <FloatingElements
                        count={8}
                        pattern="wave"
                        {...FloatingPresets.nebula}
                        floatDistance={50}
                    />
                </ParallaxLayer>
            </ParallaxSection>

            {/* User Lists section with different animation */}
            <ParallaxSection
                offset={['start end', 'end start']}
                className="relative z-10"
            >
                <ParallaxLayer speedY={0.05}>
                    <ScrollRevealSection animation="scale">
                        <Suspense fallback={<UserListsSkeleton />}>
                            <LazyUserListsSection />
                        </Suspense>
                    </ScrollRevealSection>
                </ParallaxLayer>
            </ParallaxSection>
        </div>
    );
}

export default LandingLayout;