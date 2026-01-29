/**
 * Shared types for themed score renderers
 */

export interface ScoreRendererProps {
  /** Score value (0-100) */
  score: number;
  /** Display variant */
  variant?: "compact" | "full" | "inline";
  /** Show numeric label */
  showLabel?: boolean;
  /** Enable animations */
  animated?: boolean;
  /** Additional class names */
  className?: string;
}
