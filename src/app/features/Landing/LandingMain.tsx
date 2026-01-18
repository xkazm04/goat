"use client";

import { FloatingShowcase } from "./FloatingShowcase";
import { LazyCompositionModal } from "./sub_CreateList/LazyCompositionModal";
import { NeonArenaTheme } from "./shared";
import { CommandPaletteTrigger } from "@/app/features/CommandPalette";

export function LandingMain() {
  return (
    <div className="relative" data-testid="landing-main">
      <NeonArenaTheme
        variant="fullPage"
        as="section"
        data-testid="landing-main-classic"
      >
        {/* Main content */}
        <FloatingShowcase />

        {/* Composition Modal - lazy loaded */}
        <LazyCompositionModal />

        {/* Command Palette Trigger - floating button for quick create */}
        <CommandPaletteTrigger />
      </NeonArenaTheme>
    </div>
  );
}