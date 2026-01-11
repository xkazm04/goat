/**
 * Validation Library
 *
 * Provides centralized validation for all transfer and grid operations.
 * The ValidationAuthority is the single source of truth for all validation rules.
 */

export {
  // ValidationAuthority class
  ValidationAuthority,

  // Singleton accessors
  getValidationAuthority,
  resetValidationAuthority,

  // Notification and logging helpers
  getValidationNotification,
  logValidationFailure,

  // Types
  type ValidationErrorCode,
  type ValidationResult,
  type ItemValidationResult,
  type TransferContext,
  type GridContext,
  type ItemLookupContext,
  type ValidationRules,
} from './validation-authority';
