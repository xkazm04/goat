/**
 * List Intent Validator
 *
 * Centralized validation logic for ListIntent objects.
 * This module provides comprehensive validation that can be used
 * across all list creation entry points (modals, command palette, etc.)
 *
 * Features:
 * - Schema validation
 * - Business rule validation
 * - Category-specific validation
 * - Custom validation rules
 */

import {
  ListIntent,
  validateListIntent as basicValidateListIntent,
  ListIntentValidation,
} from '@/types/list-intent';
import {
  categoryHasSubcategories,
  isValidSubcategory,
  CATEGORY_CONFIG,
} from '@/lib/config/category-config';

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Extended validation result with detailed field errors
 */
export interface ListIntentValidationResult extends ListIntentValidation {
  /** Field-specific errors for form display */
  fieldErrors: Record<string, string[]>;
  /** Warnings that don't block submission */
  warnings: string[];
}

/**
 * Validation context for conditional validation rules
 */
export interface ValidationContext {
  /** Whether this is a predefined list (less strict validation) */
  isPredefined?: boolean;
  /** Whether to skip optional field validation */
  skipOptional?: boolean;
  /** Custom validation rules to apply */
  customRules?: ValidationRule[];
}

/**
 * Custom validation rule interface
 */
export interface ValidationRule {
  /** Unique identifier for the rule */
  id: string;
  /** Field this rule applies to (or 'intent' for cross-field) */
  field: keyof ListIntent | 'intent';
  /** Validation function returning error message or null if valid */
  validate: (intent: ListIntent) => string | null;
  /** Whether this is a warning (doesn't block submission) */
  isWarning?: boolean;
}

// ============================================================================
// Built-in Validation Rules
// ============================================================================

const TITLE_MIN_LENGTH = 3;
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Standard validation rules applied to all intents
 */
export const STANDARD_VALIDATION_RULES: ValidationRule[] = [
  // Category validation
  {
    id: 'category-required',
    field: 'category',
    validate: (intent) => {
      if (!intent.category || !intent.category.trim()) {
        return 'Category is required';
      }
      return null;
    },
  },
  {
    id: 'category-valid',
    field: 'category',
    validate: (intent) => {
      if (intent.category && !CATEGORY_CONFIG[intent.category]) {
        return `Invalid category: ${intent.category}`;
      }
      return null;
    },
  },

  // Subcategory validation
  {
    id: 'subcategory-required-when-needed',
    field: 'subcategory',
    validate: (intent) => {
      if (intent.category && categoryHasSubcategories(intent.category)) {
        if (!intent.subcategory) {
          return `Please select a subcategory for ${intent.category}`;
        }
        if (!isValidSubcategory(intent.category, intent.subcategory)) {
          return `Invalid subcategory "${intent.subcategory}" for ${intent.category}`;
        }
      }
      return null;
    },
  },

  // Size validation
  {
    id: 'size-valid',
    field: 'size',
    validate: (intent) => {
      if (intent.size < 1 || intent.size > 100) {
        return 'Size must be between 1 and 100';
      }
      return null;
    },
  },

  // Time period validation
  {
    id: 'time-period-required',
    field: 'timePeriod',
    validate: (intent) => {
      if (!intent.timePeriod) {
        return 'Time period is required';
      }
      if (!['all-time', 'decade', 'year'].includes(intent.timePeriod)) {
        return 'Invalid time period';
      }
      return null;
    },
  },
  {
    id: 'decade-required-when-needed',
    field: 'selectedDecade',
    validate: (intent) => {
      if (intent.timePeriod === 'decade' && !intent.selectedDecade) {
        return 'Please select a decade';
      }
      return null;
    },
  },
  {
    id: 'year-required-when-needed',
    field: 'selectedYear',
    validate: (intent) => {
      if (intent.timePeriod === 'year' && !intent.selectedYear) {
        return 'Please select a year';
      }
      return null;
    },
  },

  // Color validation
  {
    id: 'color-complete',
    field: 'color',
    validate: (intent) => {
      if (!intent.color?.primary || !intent.color?.secondary || !intent.color?.accent) {
        return 'Complete color scheme is required';
      }
      return null;
    },
  },
];

/**
 * Custom list validation rules (non-predefined)
 */
export const CUSTOM_LIST_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'title-required-for-custom',
    field: 'title',
    validate: (intent) => {
      if (!intent.isPredefined && (!intent.title || !intent.title.trim())) {
        return 'Please provide a title for your custom list';
      }
      return null;
    },
  },
  {
    id: 'title-length',
    field: 'title',
    validate: (intent) => {
      if (intent.title && intent.title.trim().length < TITLE_MIN_LENGTH) {
        return `Title must be at least ${TITLE_MIN_LENGTH} characters`;
      }
      if (intent.title && intent.title.length > TITLE_MAX_LENGTH) {
        return `Title must not exceed ${TITLE_MAX_LENGTH} characters`;
      }
      return null;
    },
  },
  {
    id: 'description-length',
    field: 'description',
    validate: (intent) => {
      if (intent.description && intent.description.length > DESCRIPTION_MAX_LENGTH) {
        return `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`;
      }
      return null;
    },
    isWarning: true,
  },
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Apply a set of validation rules to an intent
 */
function applyRules(
  intent: ListIntent,
  rules: ValidationRule[]
): { errors: string[]; warnings: string[]; fieldErrors: Record<string, string[]> } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fieldErrors: Record<string, string[]> = {};

  for (const rule of rules) {
    const result = rule.validate(intent);
    if (result) {
      if (rule.isWarning) {
        warnings.push(result);
      } else {
        errors.push(result);

        // Track field-specific errors
        const field = rule.field as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(result);
      }
    }
  }

  return { errors, warnings, fieldErrors };
}

/**
 * Comprehensive ListIntent validation
 *
 * Combines basic validation with extended rules for a complete validation result.
 *
 * @param intent - The ListIntent to validate
 * @param context - Optional validation context for conditional rules
 * @returns Detailed validation result with field errors and warnings
 */
export function validateListIntentComplete(
  intent: ListIntent,
  context: ValidationContext = {}
): ListIntentValidationResult {
  // Start with the built-in basic validation
  const basicResult = basicValidateListIntent(intent);

  // Collect all applicable rules
  const rules = [...STANDARD_VALIDATION_RULES];

  // Add custom list rules if not predefined
  if (!context.isPredefined && !intent.isPredefined) {
    rules.push(...CUSTOM_LIST_VALIDATION_RULES);
  }

  // Add any custom rules from context
  if (context.customRules) {
    rules.push(...context.customRules);
  }

  // Apply all rules
  const { errors, warnings, fieldErrors } = applyRules(intent, rules);

  // Merge with basic validation errors (deduplicate)
  const allErrors = Array.from(new Set([...basicResult.errors, ...errors]));

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings,
    fieldErrors,
  };
}

/**
 * Quick validation check (returns boolean only)
 *
 * Use this for UI states where you just need to know if the intent is valid.
 */
export function isListIntentValid(intent: ListIntent): boolean {
  return validateListIntentComplete(intent).isValid;
}

/**
 * Validate a single field of the intent
 *
 * Useful for real-time field validation in forms.
 */
export function validateListIntentField(
  intent: ListIntent,
  field: keyof ListIntent
): string[] {
  const rules = [...STANDARD_VALIDATION_RULES, ...CUSTOM_LIST_VALIDATION_RULES].filter(
    (rule) => rule.field === field
  );

  const errors: string[] = [];
  for (const rule of rules) {
    const result = rule.validate(intent);
    if (result && !rule.isWarning) {
      errors.push(result);
    }
  }

  return errors;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { validateListIntent as basicValidateListIntent } from '@/types/list-intent';
export type { ListIntentValidation } from '@/types/list-intent';
