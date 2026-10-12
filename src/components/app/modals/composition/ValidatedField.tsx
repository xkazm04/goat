"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId } from "react";

import type { FieldValidationState } from "@/hooks/use-field-validation";

interface ValidatedFieldProps {
  /** The validation state for this field */
  fieldState: FieldValidationState;
  /** The border CSS class (from getBorderClass) */
  borderClass: string;
  /** Content to render inside the validated wrapper */
  children: React.ReactNode;
  /** Optional className on the outer wrapper */
  className?: string;
}

/**
 * Wraps a form field with a colored left-border validation indicator
 * and an accessible inline error region.
 *
 * - border-l-slate-600  for untouched
 * - border-l-green-500  for valid
 * - border-l-red-500    for invalid
 *
 * Error messages appear below the field with smooth opacity transition
 * inside an aria-live="polite" region.
 */
export function ValidatedField({
  fieldState,
  borderClass,
  children,
  className = "",
}: ValidatedFieldProps) {
  const errorId = useId();
  const hasErrors = fieldState.status === "invalid" && fieldState.errors.length > 0;

  return (
    <div
      className={`${borderClass} pl-3 transition-colors duration-200 ${className}`}
      aria-describedby={hasErrors ? errorId : undefined}
    >
      {children}

      {/* Accessible error region */}
      <div
        id={errorId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="min-h-0"
      >
        <AnimatePresence mode="wait">
          {hasErrors && (
            <motion.div
              key="errors"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1.5"
            >
              {fieldState.errors.map((error) => (
                <p
                  key={error}
                  className="text-sm text-red-400 leading-snug"
                >
                  {error}
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
