/**
 * Calculate similarity between two strings using word overlap.
 * Returns a value between 0 (no match) and 1 (exact match).
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Simple word overlap
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  let overlap = 0;
  words1.forEach((word) => {
    if (words2.has(word)) overlap++;
  });

  return overlap / Math.max(words1.size, words2.size);
}
