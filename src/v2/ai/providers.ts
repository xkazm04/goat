import { cliCritic, cliGaps, cliPool } from './cli-providers';
import { claudeCritic, claudeGaps, fixtureCritic, fixtureGaps, type CriticProvider, type GapProvider } from './converse';
import { claudeProvider, fixtureProvider, type PoolProvider } from './pool';
import { claudeTaste, cliTaste, fixtureTaste, type TasteProvider } from './taste';

/**
 * One switch for every AI route:
 *   V2_AI_PROVIDER=fixture  canned data, no model
 *   V2_AI_PROVIDER=cli      the local Claude Code CLI (haiku, low effort); development only
 *   V2_AI_PROVIDER=claude   the Anthropic API
 * Unset: the API when ANTHROPIC_API_KEY is set, otherwise fixtures.
 */
type Engine = 'fixture' | 'cli' | 'claude';

function engine(): Engine {
  const wanted = process.env.V2_AI_PROVIDER?.trim();
  if (wanted === 'cli' && process.env.NODE_ENV === 'production') return 'fixture';
  if (wanted === 'fixture' || wanted === 'cli' || wanted === 'claude') return wanted;
  return process.env.ANTHROPIC_API_KEY ? 'claude' : 'fixture';
}

export function pickPool(): PoolProvider {
  const e = engine();
  return e === 'cli' ? cliPool() : e === 'claude' ? claudeProvider() : fixtureProvider();
}

export function pickCritic(): CriticProvider {
  const e = engine();
  return e === 'cli' ? cliCritic() : e === 'claude' ? claudeCritic() : fixtureCritic();
}

export function pickGaps(): GapProvider {
  const e = engine();
  return e === 'cli' ? cliGaps() : e === 'claude' ? claudeGaps() : fixtureGaps();
}

export function pickTaste(): TasteProvider {
  const e = engine();
  return e === 'cli' ? cliTaste() : e === 'claude' ? claudeTaste() : fixtureTaste();
}
