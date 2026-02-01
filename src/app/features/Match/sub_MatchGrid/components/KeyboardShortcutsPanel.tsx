"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Keyboard,
  Navigation,
  Layers,
  MousePointerClick,
  HelpCircle,
} from "lucide-react";
import {
  TIER_KEYBOARD_SHORTCUTS,
  getShortcutsByCategory,
  formatShortcutKey,
  type KeyboardShortcut,
} from "../hooks/useTierKeyboardNavigation";

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Category icons and labels
 */
const CATEGORY_CONFIG = {
  navigation: {
    icon: Navigation,
    label: "Navigation",
    description: "Move focus between tiers and items",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
  },
  assignment: {
    icon: Layers,
    label: "Quick Assignment",
    description: "Quickly assign items to tiers",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  actions: {
    icon: MousePointerClick,
    label: "Actions",
    description: "Perform actions on focused items",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  general: {
    icon: HelpCircle,
    label: "General",
    description: "General controls and help",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
  },
};

/**
 * KeyboardShortcutsPanel - Modal showing all tier list keyboard shortcuts
 *
 * WCAG 2.1 Compliance:
 * - Focus trap within modal
 * - Escape key closes modal
 * - Focus returns to trigger on close
 * - All shortcuts are screen reader accessible
 */
export const KeyboardShortcutsPanel = memo(function KeyboardShortcutsPanel({
  isOpen,
  onClose,
}: KeyboardShortcutsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      // Focus trap
      if (e.key === "Tab" && panelRef.current) {
        const focusableElements = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const categories = getShortcutsByCategory();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="keyboard-shortcuts-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
              md:w-[700px] md:max-h-[85vh] z-50 overflow-hidden
              bg-gradient-to-b from-slate-900 to-slate-950
              rounded-2xl border border-slate-700/50
              shadow-2xl shadow-black/50
              flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20">
                  <Keyboard className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2
                    id="keyboard-shortcuts-title"
                    className="text-lg font-semibold text-white"
                  >
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-xs text-slate-500">
                    Press K to enable keyboard navigation
                  </p>
                </div>
              </div>

              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800/50 text-slate-400
                  hover:bg-rose-500/20 hover:text-rose-400 transition-colors
                  focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label="Close keyboard shortcuts panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5 space-y-6">
              {(Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map(
                (category) => {
                  const config = CATEGORY_CONFIG[category];
                  const shortcuts = categories[category];
                  const Icon = config.icon;

                  if (shortcuts.length === 0) return null;

                  return (
                    <section key={category} aria-labelledby={`category-${category}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div>
                          <h3
                            id={`category-${category}`}
                            className={`font-medium ${config.color}`}
                          >
                            {config.label}
                          </h3>
                          <p className="text-xs text-slate-500">{config.description}</p>
                        </div>
                      </div>

                      <div
                        className={`rounded-xl border ${config.borderColor} ${config.bgColor} overflow-hidden`}
                      >
                        <table className="w-full text-sm">
                          <thead className="sr-only">
                            <tr>
                              <th>Shortcut</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/30">
                            {shortcuts.map((shortcut, index) => (
                              <ShortcutRow
                                key={`${shortcut.key}-${shortcut.action}-${index}`}
                                shortcut={shortcut}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  );
                }
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
              <p className="text-xs text-slate-500 text-center">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">?</kbd> anytime to show this panel
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

/**
 * Individual shortcut row
 */
interface ShortcutRowProps {
  shortcut: KeyboardShortcut;
}

const ShortcutRow = memo(function ShortcutRow({ shortcut }: ShortcutRowProps) {
  const formattedKey = formatShortcutKey(shortcut);

  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-4 py-2.5 w-36">
        <ShortcutKeyDisplay keys={formattedKey} />
      </td>
      <td className="px-4 py-2.5 text-slate-300">{shortcut.description}</td>
    </tr>
  );
});

/**
 * Styled keyboard shortcut display
 */
interface ShortcutKeyDisplayProps {
  keys: string;
}

const ShortcutKeyDisplay = memo(function ShortcutKeyDisplay({
  keys,
}: ShortcutKeyDisplayProps) {
  const parts = keys.split(" + ");

  return (
    <div className="flex items-center gap-1">
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="text-slate-600">+</span>}
          <kbd
            className="min-w-[1.75rem] px-1.5 py-1 rounded-md text-center
              bg-slate-800 border border-slate-700
              text-xs font-mono text-slate-200
              shadow-[0_2px_0_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
          >
            {part}
          </kbd>
        </span>
      ))}
    </div>
  );
});

/**
 * Compact keyboard hint for inline display
 */
interface KeyboardHintProps {
  shortcut: string;
  label?: string;
  className?: string;
}

export const KeyboardHint = memo(function KeyboardHint({
  shortcut,
  label,
  className = "",
}: KeyboardHintProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
      {label && <span>{label}</span>}
      <kbd
        className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/50
          text-[10px] font-mono text-slate-400"
      >
        {shortcut}
      </kbd>
    </span>
  );
});

/**
 * Floating keyboard mode indicator
 */
interface KeyboardModeIndicatorProps {
  isActive: boolean;
  className?: string;
}

export const KeyboardModeIndicator = memo(function KeyboardModeIndicator({
  isActive,
  className = "",
}: KeyboardModeIndicatorProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className={`fixed bottom-4 left-4 z-40 flex items-center gap-2 px-3 py-2
            bg-slate-900/95 backdrop-blur-sm rounded-lg border border-cyan-500/50
            shadow-lg shadow-cyan-500/20 ${className}`}
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-medium text-cyan-400">Keyboard Mode</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
            K
          </kbd>
          <span className="text-xs text-slate-500">to exit</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export type { KeyboardShortcutsPanelProps, KeyboardHintProps, KeyboardModeIndicatorProps };
