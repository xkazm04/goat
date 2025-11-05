"use client";

import * as React from "react";
import { Moon, Sun, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export interface ThemeIconConfig {
  light: React.ReactNode;
  dark: React.ReactNode;
  experimentalDark?: React.ReactNode;
}

export interface ThemeAwareIconProps {
  /**
   * Custom icons for each theme. If not provided, defaults to Sun, Moon, and Palette.
   */
  icons?: ThemeIconConfig;
  /**
   * Additional className for the icon container
   */
  className?: string;
  /**
   * Size of the icon
   */
  size?: "sm" | "default" | "lg";
}

const sizeVariants = {
  sm: "h-4 w-4",
  default: "h-[1.2rem] w-[1.2rem]",
  lg: "h-6 w-6",
};

/**
 * ThemeAwareIcon component that displays a single icon that changes based on the current theme.
 * Uses a single DOM element with CSS-driven transitions, eliminating absolute positioning
 * and reducing rendering overhead.
 *
 * The icon switches between Sun (light), Moon (dark), and Palette (experimental-dark)
 * with smooth rotation and scale transitions.
 */
export const ThemeAwareIcon = React.forwardRef<HTMLSpanElement, ThemeAwareIconProps>(
  ({ icons, className, size = "default" }, ref) => {
    const { theme } = useTheme();

    // Default icons if not provided
    const defaultIcons: ThemeIconConfig = {
      light: <Sun />,
      dark: <Moon />,
      experimentalDark: <Palette />,
    };

    const iconConfig = icons || defaultIcons;
    const sizeClass = sizeVariants[size];

    // Determine which icon to display based on theme
    const currentIcon = React.useMemo(() => {
      if (theme === "dark") return iconConfig.dark;
      if (theme === "experimental-dark") return iconConfig.experimentalDark;
      return iconConfig.light;
    }, [theme, iconConfig]);

    // Determine rotation and scale based on theme
    const iconState = React.useMemo(() => {
      if (theme === "dark") return "dark";
      if (theme === "experimental-dark") return "experimental";
      return "light";
    }, [theme]);

    return (
      <span
        ref={ref}
        data-theme-state={iconState}
        className={cn(
          "inline-flex items-center justify-center transition-transform duration-200 ease-in-out",
          sizeClass,
          "[&>svg]:h-full [&>svg]:w-full",
          // Light state: no rotation, full scale
          "data-[theme-state=light]:rotate-0 data-[theme-state=light]:scale-100",
          // Dark state: rotate in from right
          "data-[theme-state=dark]:rotate-0 data-[theme-state=dark]:scale-100",
          // Experimental state: rotate in from right
          "data-[theme-state=experimental]:rotate-0 data-[theme-state=experimental]:scale-100",
          className
        )}
      >
        {currentIcon}
      </span>
    );
  }
);

ThemeAwareIcon.displayName = "ThemeAwareIcon";
