"use client";

import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Filter icon props — extends IconProps with a `size` prop
 * for Lucide-compatible drop-in replacement.
 */
interface FilterIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * GoatCrown — A crown with subtle horn-shaped prongs.
 * Replaces the generic Lucide Crown icon in ShowcaseHeader.
 * Uses currentColor for CSS color inheritance.
 */
export function GoatCrown({ className, style }: IconProps) {
  return (
    <svg className={cn("w-6 h-6", className)} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crown base */}
      <path
        d="M4 17h16l1.5-9-4.5 3-5-6-5 6-4.5-3L4 17z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Crown band */}
      <rect x="4" y="17" width="16" height="2.5" rx="0.5" fill="currentColor" />
      {/* Horn-shaped prong accents */}
      <path
        d="M7.5 8 C6 4.5, 4.5 3, 3 4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M16.5 8 C18 4.5, 19.5 3, 21 4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Center gem / goat diamond */}
      <path d="M12 11 L13 13 L12 14 L11 13 Z" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/**
 * GoatTrophy — Trophy with a small goat silhouette inside.
 * Replaces generic Trophy for Sports category.
 */
export function GoatTrophy({ className, style }: IconProps) {
  return (
    <svg className={cn("w-5 h-5", className)} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cup body */}
      <path
        d="M7 4h10v7c0 2.76-2.24 5-5 5s-5-2.24-5-5V4z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Left handle */}
      <path
        d="M7 6H5c-1.1 0-2 .9-2 2v1c0 1.66 1.34 3 3 3h1"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right handle */}
      <path
        d="M17 6h2c1.1 0 2 .9 2 2v1c0 1.66-1.34 3-3 3h-1"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Stem */}
      <line x1="12" y1="16" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" />
      {/* Base */}
      <path d="M8 19h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Goat horns inside cup */}
      <path d="M10 8 C9 6, 8.5 5.5, 8 6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M14 8 C15 6, 15.5 5.5, 16 6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* Star between horns */}
      <circle cx="12" cy="9" r="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/**
 * GoatMusic — Musical note with a horn-shaped stem.
 * Replaces generic Music icon for Music category.
 */
export function GoatMusic({ className, style }: IconProps) {
  return (
    <svg className={cn("w-5 h-5", className)} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Note heads */}
      <circle cx="8" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="18" cy="15" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Stems with horn curve */}
      <path
        d="M11 18V6c0-1 .5-2 2-2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M21 15V3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Connecting beam with horn-like curve */}
      <path
        d="M11 6 C11 3, 15 2, 21 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Small crown accent on beam */}
      <path d="M15 3 L15.5 1.5 L16 3" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

/**
 * GoatGamepad — Game controller with horn accents.
 * Replaces generic Gamepad2 for Games category.
 */
export function GoatGamepad({ className, style }: IconProps) {
  return (
    <svg className={cn("w-5 h-5", className)} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Controller body */}
      <path
        d="M6 11h12c2.2 0 4 1.8 4 4 0 2.2-1.8 4-4 4H6c-2.2 0-4-1.8-4-4 0-2.2 1.8-4 4-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      {/* D-pad */}
      <path d="M8 13v4M6 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Buttons */}
      <circle cx="16" cy="14" r="0.8" fill="currentColor" />
      <circle cx="18" cy="15" r="0.8" fill="currentColor" />
      {/* Horn-like grips curving up from top */}
      <path
        d="M7 11 C6 8, 5 6, 4 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M17 11 C18 8, 19 6, 20 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Small star between horns */}
      <circle cx="12" cy="7" r="0.8" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/**
 * GoatBook — Open book with a goat silhouette bookmark.
 * Replaces generic BookOpen for Stories category.
 */
export function GoatBook({ className, style }: IconProps) {
  return (
    <svg className={cn("w-5 h-5", className)} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left page */}
      <path
        d="M2 4c2-1 5-1 7 0 2 1 3 1 3 1v14s-1 0-3-1c-2-1-5-1-7 0V4z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Right page */}
      <path
        d="M22 4c-2-1-5-1-7 0-2 1-3 1-3 1v14s1 0 3-1c2-1 5-1 7 0V4z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Goat horn bookmark accent on spine */}
      <path d="M11 5 C10 2, 9.5 1, 9 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M13 5 C14 2, 14.5 1, 15 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.5" />
    </svg>
  );
}

/**
 * GoatSparkles — Sparkle/star pattern with a tiny crown motif.
 * Replaces generic Sparkles icon for branding.
 */
export function GoatSparkles({ size, className, style }: FilterIconProps) {
  return (
    <svg width={size} height={size} className={cn(!size && "w-[1em] h-[1em]", className)} style={style} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main sparkle */}
      <path
        d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Small sparkle top-right */}
      <path
        d="M19 2 L19.5 4 L21.5 4.5 L19.5 5 L19 7 L18.5 5 L16.5 4.5 L18.5 4 Z"
        fill="currentColor"
        opacity="0.5"
      />
      {/* Small sparkle bottom-left */}
      <path
        d="M5 17 L5.5 19 L7.5 19.5 L5.5 20 L5 22 L4.5 20 L2.5 19.5 L4.5 19 Z"
        fill="currentColor"
        opacity="0.4"
      />
      {/* Crown accent at top of main sparkle */}
      <path d="M11 3.5 L12 1.5 L13 3.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4" />
    </svg>
  );
}

// ─── Filter-system branded icons ─────────────────────────────────────────────
// Drop-in replacements for Lucide icons in the filter UI.
// Accept `size` for pixel sizing (like Lucide) OR Tailwind `className`.

/**
 * GoatFilter — Goat-horn–shaped funnel icon.
 * Replaces the generic Lucide `Filter` icon across the filter system.
 */
export function GoatFilter({ size, className, style }: FilterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={cn(!size && "w-[1em] h-[1em]", className)}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main funnel — shaped like curved goat horns converging */}
      <path
        d="M3 4h18l-5.5 7.5c-.3.4-.5.9-.5 1.4V19l-6 2v-7.1c0-.5-.2-1-.5-1.4L3 4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Horn-curl accent on left rim */}
      <path
        d="M5 4 C4 2.5, 3.5 1.5, 2.5 2"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
      {/* Horn-curl accent on right rim */}
      <path
        d="M19 4 C20 2.5, 20.5 1.5, 21.5 2"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />
    </svg>
  );
}

/**
 * GoatSearch — Magnifying glass with a tiny crown on the rim.
 * Replaces the generic Lucide `Search` icon in filter search bars.
 */
export function GoatSearch({ size, className, style }: FilterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={cn(!size && "w-[1em] h-[1em]", className)}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Magnifying glass circle */}
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Handle */}
      <path d="M16.5 16.5 L21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Crown on top of glass */}
      <path
        d="M8 5.5 L9.5 3 L11 5 L12.5 3 L14 5.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

/**
 * GoatGrip — Two hoof-print drag handles.
 * Replaces the generic Lucide `GripVertical` in FilterBlock / FilterGroup.
 */
export function GoatGrip({ size, className, style }: FilterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={cn(!size && "w-[1em] h-[1em]", className)}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top hoof — split shape */}
      <path
        d="M8 6 C8 4.5, 9.5 4, 10.5 5 L10.5 7 C10.5 7, 9 7.5, 8 6z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M16 6 C16 4.5, 14.5 4, 13.5 5 L13.5 7 C13.5 7, 15 7.5, 16 6z"
        fill="currentColor"
        opacity="0.7"
      />
      {/* Bottom hoof — split shape */}
      <path
        d="M8 16 C8 14.5, 9.5 14, 10.5 15 L10.5 17 C10.5 17, 9 17.5, 8 16z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M16 16 C16 14.5, 14.5 14, 13.5 15 L13.5 17 C13.5 17, 15 17.5, 16 16z"
        fill="currentColor"
        opacity="0.7"
      />
      {/* Connecting dots for grip feel */}
      <circle cx="12" cy="11" r="0.8" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/**
 * GoatFolderGroup — Folder with horn silhouette on tab.
 * Replaces the generic Lucide `FolderPlus` in filter group creation.
 */
export function GoatFolderGroup({ size, className, style }: FilterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={cn(!size && "w-[1em] h-[1em]", className)}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Folder body */}
      <path
        d="M4 8V18c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-6l-2-2H6c-1.1 0-2 .9-2 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Horn accent on folder tab */}
      <path
        d="M8 6 C7 3.5, 6.5 2.5, 6 3.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Plus sign inside */}
      <path d="M12 12v4M10 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * GoatLightbulb — Lightbulb with horn-shaped filament.
 * Replaces the generic Lucide `Lightbulb` in smart filter suggestions.
 */
export function GoatLightbulb({ size, className, style }: FilterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={cn(!size && "w-[1em] h-[1em]", className)}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bulb outline */}
      <path
        d="M9 21h6M10 17c0-1.5-3-3.5-3-7a5 5 0 1 1 10 0c0 3.5-3 5.5-3 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Horn-shaped filament inside */}
      <path
        d="M10.5 12 C10 10, 9.5 9, 9 9.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M13.5 12 C14 10, 14.5 9, 15 9.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      {/* Spark between horns */}
      <circle cx="12" cy="10" r="0.6" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/**
 * GoatTarget — Crosshair with horn-tip pointers.
 * Replaces the generic Lucide `Target` in filter presets & suggestions.
 */
export function GoatTarget({ size, className, style }: FilterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={cn(!size && "w-[1em] h-[1em]", className)}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      {/* Horn-tip crosshair — top */}
      <path d="M12 3 C11 1.5, 10.5 1, 10 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.45" />
      {/* Horn-tip crosshair — right */}
      <path d="M21 12 C22.5 11, 23 10.5, 22.5 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.45" />
    </svg>
  );
}

/**
 * GoatSave — Floppy disk with crown accent.
 * Replaces the generic Lucide `Save` in filter saver.
 */
export function GoatSave({ size, className, style }: FilterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={cn(!size && "w-[1em] h-[1em]", className)}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Floppy disk body */}
      <path
        d="M19 21H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h11l5 5v11c0 1.1-.9 2-2 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Disk label area */}
      <rect x="7" y="13" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Crown accent on top */}
      <path
        d="M9 5 L10.5 3 L12 5 L13.5 3 L15 5"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.45"
      />
    </svg>
  );
}

/**
 * GoatListFilter — List with horn-accented filter lines.
 * Replaces the generic Lucide `ListFilter` in filter preview headers.
 */
export function GoatListFilter({ size, className, style }: FilterIconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={cn(!size && "w-[1em] h-[1em]", className)}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Decreasing filter lines */}
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Horn curls on top line ends */}
      <path d="M4 7 C3 5.5, 2.5 4.5, 2 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M20 7 C21 5.5, 21.5 4.5, 22 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.45" />
    </svg>
  );
}
