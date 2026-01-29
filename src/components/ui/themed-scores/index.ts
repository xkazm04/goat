export { ScoreBar, type ScoreBarProps } from "./ScoreBar";
export {
  ThemedScoreDisplay,
  type ThemedScoreDisplayProps,
} from "./ThemedScoreDisplay";

// Re-export individual renderers for direct usage
export type { ScoreRendererProps } from "./renderers";
export {
  SportsScoreRenderer,
  MoviesScoreRenderer,
  MusicScoreRenderer,
  GamesScoreRenderer,
  DefaultScoreRenderer,
} from "./renderers";
