/**
 * Calculate similarity between two strings using word overlap.
 * Returns a value between 0 (no match) and 1 (exact match).
 *
 * Containment is scaled by the length ratio of the two strings. Unscaled, it
 * scored "Her" against "Hercules" at 0.9 -- above every fetcher's accept
 * threshold and above the pipeline's minConfidence -- so any short title was
 * matched to the first longer title that happened to contain its letters.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  let containmentScore = 0;
  if (s1.length > 0 && s2.length > 0 && (s1.includes(s2) || s2.includes(s1))) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    containmentScore = 0.9 * (shorter / longer);
  }

  // Simple word overlap
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  let overlap = 0;
  words1.forEach((word) => {
    if (words2.has(word)) overlap++;
  });

  const overlapScore = overlap / Math.max(words1.size, words2.size);

  return Math.max(containmentScore, overlapScore);
}
