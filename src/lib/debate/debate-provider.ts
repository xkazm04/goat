/**
 * AI Debate Provider
 *
 * Server-side Gemini integration for generating debate challenges
 * when users place items in tiers. The AI acts as a contrarian ranking
 * advisor with real-world knowledge.
 */

import { GoogleGenAI } from '@google/genai';
import type { DebateChallengeRequest, DebateChallengeResponse } from './types';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Build the debate prompt for Gemini
 */
function buildDebatePrompt(request: DebateChallengeRequest): string {
  const {
    itemName,
    category,
    subcategory,
    userTier,
    userPosition,
    listSize,
    tiermates,
    rankedAbove,
    rankedBelow,
    history,
    consensusData,
  } = request;

  const context = subcategory ? `${category} > ${subcategory}` : category;

  let prompt = `You are a passionate, knowledgeable ranking debate advisor for a "${context}" tier list.

The user placed "${itemName}" in Tier ${userTier} (position #${userPosition} out of ${listSize}).`;

  if (tiermates && tiermates.length > 0) {
    prompt += `\nOther items in the same tier: ${tiermates.join(', ')}`;
  }
  if (rankedAbove && rankedAbove.length > 0) {
    prompt += `\nItems ranked above: ${rankedAbove.slice(0, 5).join(', ')}`;
  }
  if (rankedBelow && rankedBelow.length > 0) {
    prompt += `\nItems ranked below: ${rankedBelow.slice(0, 5).join(', ')}`;
  }

  if (consensusData && consensusData.sampleSize > 0) {
    prompt += `\n\nCommunity data (${consensusData.sampleSize} rankings):`;
    prompt += `\n- Average position: #${Math.round(consensusData.averagePosition)}`;
    prompt += `\n- Controversy score: ${consensusData.controversyScore}/100`;
  }

  if (history && history.length > 0) {
    prompt += `\n\nPrevious debate messages:`;
    for (const msg of history.slice(-4)) {
      const role = msg.role === 'ai' ? 'You' : 'User';
      prompt += `\n${role}: ${msg.content}`;
    }
    prompt += `\n\nContinue the debate. Respond to the user's latest point.`;
  } else {
    prompt += `\n\nChallenge or validate this placement. Be opinionated but fair. Use specific facts, statistics, achievements, or cultural impact to make your case.`;
  }

  prompt += `

Respond in JSON format:
{
  "argument": "<your debate argument, 2-4 sentences, conversational and passionate>",
  "challengeStrength": <0-100, how much you disagree with this placement. 0 = fully agree, 100 = completely wrong>,
  "suggestedTier": "<which tier you think this item belongs in, e.g. 'S', 'A', 'B', etc., or null if you agree>",
  "keyFacts": ["<fact 1>", "<fact 2>", "<fact 3>"],
  "controversyScore": <0-100, how controversial this ranking decision is across the community>,
  "isHotTake": <true if this placement would be considered a hot take by most people>
}

Rules:
1. Be engaging and passionate, like a sports commentator debating rankings
2. Use real facts, stats, awards, and achievements when available
3. If the placement is reasonable, acknowledge it but suggest alternatives
4. Reference other items in the tier for comparison when available
5. Keep arguments concise but impactful (2-4 sentences for the argument)
6. Return ONLY valid JSON, no markdown formatting, no code blocks`;

  return prompt;
}

/**
 * Parse the Gemini response into a structured debate response
 */
function parseDebateResponse(text: string): DebateChallengeResponse {
  try {
    let jsonText = text.trim();
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    const result: DebateChallengeResponse = {
      argument: typeof parsed.argument === 'string'
        ? parsed.argument.substring(0, 500)
        : 'Interesting placement! I\'d love to debate this one.',
      challengeStrength: Math.min(100, Math.max(0, Number(parsed.challengeStrength) || 50)),
      controversyScore: Math.min(100, Math.max(0, Number(parsed.controversyScore) || 50)),
      isHotTake: Boolean(parsed.isHotTake),
    };

    if (parsed.suggestedTier && typeof parsed.suggestedTier === 'string' && parsed.suggestedTier !== 'null') {
      result.suggestedTier = parsed.suggestedTier;
    }

    if (Array.isArray(parsed.keyFacts)) {
      result.keyFacts = parsed.keyFacts
        .filter((f: unknown) => typeof f === 'string')
        .slice(0, 5)
        .map((f: string) => f.substring(0, 200));
    }

    return result;
  } catch (error) {
    console.error('Error parsing debate response:', error);
    console.error('Response text:', text);
    return {
      argument: 'Hmm, I have thoughts on this placement but let me gather my arguments...',
      challengeStrength: 50,
      controversyScore: 50,
      isHotTake: false,
      error: 'Failed to parse AI response',
    };
  }
}

/**
 * Generate a debate challenge for an item placement
 */
export async function generateDebateChallenge(
  request: DebateChallengeRequest
): Promise<DebateChallengeResponse> {
  const client = getGeminiClient();
  const prompt = buildDebatePrompt(request);

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text ?? '';
    return parseDebateResponse(text);
  } catch (error) {
    console.error('Error generating debate challenge:', error);
    return {
      argument: 'I wanted to challenge this placement, but I\'m having trouble formulating my argument right now.',
      challengeStrength: 0,
      controversyScore: 0,
      isHotTake: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const debateProvider = {
  generateDebateChallenge,
};
