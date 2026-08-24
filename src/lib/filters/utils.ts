/**
 * Shared filter utilities
 */

/**
 * Access a nested field value by dot-separated path.
 * e.g. getFieldValue(item, 'metadata.year') walks item.metadata.year
 */
export function getFieldValue(
  item: Record<string, unknown>,
  field: string
): unknown {
  const parts = field.split('.');
  let value: unknown = item;
  for (const part of parts) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

/**
 * Pre-compile a field accessor for repeated use on many items.
 * Avoids re-splitting the path string on every call.
 */
export function createFieldAccessor(
  fieldPath: string
): (item: Record<string, unknown>) => unknown {
  const parts = fieldPath.split('.');
  return (item) => {
    let value: unknown = item;
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return value;
  };
}
