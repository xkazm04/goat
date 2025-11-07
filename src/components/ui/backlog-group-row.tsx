"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BacklogGroupRowProps {
  /** Unique identifier for the group */
  id: string;
  /** Display name of the group */
  name: string;
  /** Number of items in the group */
  itemCount: number;
  /** Whether the group is currently selected/active */
  isSelected?: boolean;
  /** Whether the group is expanded (shows items) */
  isExpanded?: boolean;
  /** Whether to show expand/collapse button */
  showExpandButton?: boolean;
  /** Sort order for visual indicators (asc/desc) */
  sortOrder?: "asc" | "desc";
  /** Callback when group is clicked */
  onClick?: (id: string) => void;
  /** Callback when expand/collapse button is clicked */
  onToggleExpand?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the group is currently loading */
  isLoading?: boolean;
}

/**
 * BacklogGroupRow Component
 *
 * A reusable component that renders a single group header with name, item count,
 * and optional expand/collapse button. Designed for use in the Backlog sidebar
 * and other group-based list interfaces.
 *
 * Features:
 * - Consistent Tailwind styling with dark mode support
 * - Keyboard navigation with focus rings
 * - Accessible ARIA attributes
 * - Test IDs for automated testing
 * - Flexible layout for sorting indicators
 *
 * @example
 * ```tsx
 * <BacklogGroupRow
 *   id="group-1"
 *   name="Action Movies"
 *   itemCount={42}
 *   isSelected={true}
 *   showExpandButton={true}
 *   onClick={(id) => handleGroupClick(id)}
 *   onToggleExpand={(id) => handleToggleExpand(id)}
 * />
 * ```
 */
export function BacklogGroupRow({
  id,
  name,
  itemCount,
  isSelected = false,
  isExpanded = false,
  showExpandButton = false,
  sortOrder = "asc",
  onClick,
  onToggleExpand,
  className,
  isLoading = false,
}: BacklogGroupRowProps) {
  const handleClick = () => {
    if (onClick && !isLoading) {
      onClick(id);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleExpand && !isLoading) {
      onToggleExpand(id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        // Base styles
        "w-full text-left px-3 py-2 rounded text-xs",
        "transition-all duration-200",
        "flex items-center justify-between gap-2",

        // Focus ring for keyboard navigation
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "focus:ring-cyan-500/50 focus:ring-offset-gray-900",

        // Selected state
        isSelected
          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
          : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-750",

        // Dark mode hover state
        !isSelected && "dark:hover:bg-gray-700/50",

        // Disabled/loading state
        isLoading && "opacity-50 cursor-not-allowed",

        // Custom className
        className
      )}
      aria-pressed={isSelected}
      aria-expanded={showExpandButton ? isExpanded : undefined}
      aria-label={`${name} group with ${itemCount} items${isSelected ? ", selected" : ""}`}
      data-testid={`backlog-group-row-${id}`}
      data-group-id={id}
    >
      {/* Left side: Group name and item count */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "font-medium truncate",
            isSelected ? "text-cyan-300" : "text-gray-300"
          )}
          data-testid={`backlog-group-name-${id}`}
        >
          {name}
        </div>
        <div
          className={cn(
            "text-[10px] opacity-70 mt-0.5",
            isSelected ? "text-cyan-400/80" : "text-gray-500"
          )}
          data-testid={`backlog-group-count-${id}`}
        >
          {isLoading ? "Loading..." : `${itemCount} items`}
        </div>
      </div>

      {/* Right side: Expand/collapse button */}
      {showExpandButton && (
        <button
          type="button"
          onClick={handleToggleExpand}
          className={cn(
            "p-1 rounded hover:bg-gray-700/50 transition-colors",
            "focus:outline-none focus:ring-1 focus:ring-cyan-500/50",
            isSelected ? "text-cyan-400" : "text-gray-500"
          )}
          aria-label={isExpanded ? "Collapse group" : "Expand group"}
          data-testid={`backlog-group-expand-btn-${id}`}
        >
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      )}
    </button>
  );
}
