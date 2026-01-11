'use client';

import { Suspense } from 'react';
import { LandingMain } from './LandingMain';
import {
    LazyFeaturedListsSection,
    LazyUserListsSection,
    ListSectionSkeleton,
    UserListsSkeleton
} from './sub_LandingLists/LazyListSections';

/**
 * LandingLayout - Main layout for the landing page
 *
 * Uses lazy loading for below-the-fold sections to improve initial load time.
 * The FeaturedListsSection and UserListsSection are loaded asynchronously
 * after the main hero content is rendered.
 */
const LandingLayout = () => {
    return (
        <div className="min-h-screen" data-testid="landing-layout">
            {/* Main hero section - loads immediately */}
            <LandingMain />

            {/* Below-the-fold sections - lazy loaded */}
            <Suspense fallback={<ListSectionSkeleton />}>
                <LazyFeaturedListsSection />
            </Suspense>

            <Suspense fallback={<UserListsSkeleton />}>
                <LazyUserListsSection />
            </Suspense>
        </div>
    );
}

export default LandingLayout;