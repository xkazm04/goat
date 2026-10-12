"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { validateListIntentField } from "@/lib/validation/list-intent-validator";
import { ListIntent } from "@/types/list-intent";

// ============================================================================
// Types
// ============================================================================

export type FieldStatus = "untouched" | "valid" | "invalid";

export interface FieldValidationState {
  status: FieldStatus;
  errors: string[];
}

export interface UseFieldValidationReturn {
  /** Get the current validation state for a specific field */
  getFieldState: (field: keyof ListIntent) => FieldValidationState;
  /** Mark a field as touched (user has interacted with it) */
  touchField: (field: keyof ListIntent) => void;
  /** Mark multiple fields as touched */
  touchFields: (fields: (keyof ListIntent)[]) => void;
  /** Check if a field has been touched */
  isTouched: (field: keyof ListIntent) => boolean;
  /** Get the border class for a field based on its validation state */
  getBorderClass: (field: keyof ListIntent) => string;
  /** Reset all touched state */
  reset: () => void;
  /** Whether any visible errors exist */
  hasVisibleErrors: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const BORDER_CLASSES: Record<FieldStatus, string> = {
  untouched: "border-l-2 border-l-slate-600",
  valid: "border-l-2 border-l-green-500",
  invalid: "border-l-2 border-l-red-500",
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Real-time field validation hook for ListIntent forms.
 *
 * Tracks which fields have been touched and provides validation
 * state per field using the existing validation-authority rules.
 */
export function useFieldValidation(intent: ListIntent): UseFieldValidationReturn {
  const [touchedFields, setTouchedFields] = useState<Set<keyof ListIntent>>(
    new Set()
  );
  // Use ref to avoid stale closure in callbacks
  const touchedRef = useRef(touchedFields);
  touchedRef.current = touchedFields;

  const touchField = useCallback((field: keyof ListIntent) => {
    setTouchedFields((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);

  const touchFields = useCallback((fields: (keyof ListIntent)[]) => {
    setTouchedFields((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const field of fields) {
        if (!next.has(field)) {
          next.add(field);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const isTouched = useCallback(
    (field: keyof ListIntent) => touchedFields.has(field),
    [touchedFields]
  );

  const getFieldState = useCallback(
    (field: keyof ListIntent): FieldValidationState => {
      if (!touchedFields.has(field)) {
        return { status: "untouched", errors: [] };
      }
      const errors = validateListIntentField(intent, field);
      return {
        status: errors.length > 0 ? "invalid" : "valid",
        errors,
      };
    },
    [intent, touchedFields]
  );

  const getBorderClass = useCallback(
    (field: keyof ListIntent): string => {
      const state = getFieldState(field);
      return BORDER_CLASSES[state.status];
    },
    [getFieldState]
  );

  const reset = useCallback(() => {
    setTouchedFields(new Set());
  }, []);

  const hasVisibleErrors = useMemo(() => {
    return Array.from(touchedFields).some((field) => {
      const errors = validateListIntentField(intent, field);
      return errors.length > 0;
    });
  }, [intent, touchedFields]);

  return {
    getFieldState,
    touchField,
    touchFields,
    isTouched,
    getBorderClass,
    reset,
    hasVisibleErrors,
  };
}
