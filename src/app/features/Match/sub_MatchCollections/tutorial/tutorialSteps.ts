/**
 * Tutorial steps configuration for MatchGridTutorial
 */

import { Sparkles, Hand, MousePointerClick, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TutorialStep {
  title: string;
  description: string;
  icon: LucideIcon;
  highlight: 'welcome' | 'drag' | 'swap' | 'complete';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to Match Grid!",
    description: "This interactive grid helps you rank your favorite items. Let's learn how it works in just a few seconds.",
    icon: Sparkles,
    highlight: "welcome"
  },
  {
    title: "Drag & Drop Items",
    description: "Simply drag items from the collection panel at the bottom and drop them into any grid position to start ranking.",
    icon: Hand,
    highlight: "drag"
  },
  {
    title: "Rearrange Positions",
    description: "Already placed an item? You can drag it to a different position or swap it with another item anytime.",
    icon: MousePointerClick,
    highlight: "swap"
  },
  {
    title: "You're Ready!",
    description: "That's all you need to know. Start building your personalized rankings now!",
    icon: CheckCircle2,
    highlight: "complete"
  }
];

// Tutorial localStorage key
export const TUTORIAL_STORAGE_KEY = 'match-grid-tutorial-completed';
