/**
 * Gemini AI Provider
 * 
 * Extracted provider for future use across the application
 * Uses Google Gemini API with Google Search tool
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  return new GoogleGenerativeAI(apiKey);
}

export interface ItemRecommendationRequest {
  name: string;
  category: string;
  subcategory?: string;
}

export interface ItemRecommendationResponse {
  item_year?: number;
  item_year_to?: number;
  image_url?: string;
  description?: string;
  reference_url?: string;
  confidence?: number;
}

/**
 * Get item recommendations using Gemini with Google Search
 */
export async function getItemRecommendation(
  request: ItemRecommendationRequest
): Promise<ItemRecommendationResponse> {
  const model = getGeminiClient().getGenerativeModel({
    model: 'gemini-flash-latest',
    tools: [
      {
        googleSearchRetrieval: {}
      }
    ]
  });

  const prompt = buildRecommendationPrompt(request);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response into structured output
    return parseRecommendationResponse(text, request);
  } catch (error) {
    console.error('Error getting item recommendation:', error);
    throw new Error(`Failed to get recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build the prompt for Gemini
 */
function buildRecommendationPrompt(request: ItemRecommendationRequest): string {
  const { name, category, subcategory } = request;
  
  return `You are a helpful assistant that provides information about ${category} items.

Please search for information about: "${name}"${subcategory ? ` (${subcategory})` : ''}

Provide the following information in JSON format:
{
  "item_year": <year created/released as integer, or null if unknown>,
  "item_year_to": <end year if applicable, or null>,
  "image_url": <Wikipedia Commons image URL if found, format: https://upload.wikimedia.org/wikipedia/commons/...>,
  "description": <brief description (max 200 characters)>,
  "reference_url": <source URL if found>,
  "confidence": <confidence level 0-1>
}

Rules:
1. Only provide item_year if you can find reliable information about when it was created/released
2. For image_url, prefer Wikipedia Commons URLs (upload.wikimedia.org/wikipedia/commons/)
3. If no Wikipedia image is found, leave image_url as null
4. Keep description concise (max 200 characters)
5. Set confidence based on how certain you are about the information (0.0 to 1.0)
6. Return ONLY valid JSON, no markdown formatting, no code blocks

Item: ${name}
Category: ${category}${subcategory ? `\nSubcategory: ${subcategory}` : ''}

JSON:`;
}

/**
 * Parse Gemini response into structured output
 */
function parseRecommendationResponse(
  text: string,
  request: ItemRecommendationRequest
): ItemRecommendationResponse {
  try {
    // Try to extract JSON from the response
    // Remove markdown code blocks if present
    let jsonText = text.trim();
    
    // Remove markdown code blocks
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Validate and clean the response
    const result: ItemRecommendationResponse = {};

    if (parsed.item_year !== undefined && parsed.item_year !== null) {
      const year = parseInt(String(parsed.item_year));
      if (!isNaN(year) && year > 1000 && year <= new Date().getFullYear() + 10) {
        result.item_year = year;
      }
    }

    if (parsed.item_year_to !== undefined && parsed.item_year_to !== null) {
      const yearTo = parseInt(String(parsed.item_year_to));
      if (!isNaN(yearTo) && yearTo > 1000 && yearTo <= new Date().getFullYear() + 10) {
        result.item_year_to = yearTo;
      }
    }

    // Validate image URL (prefer Wikipedia Commons)
    if (parsed.image_url && typeof parsed.image_url === 'string') {
      const url = parsed.image_url.trim();
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // Prefer Wikipedia Commons URLs
        if (url.includes('upload.wikimedia.org') || url.includes('wikipedia.org')) {
          result.image_url = url;
        } else {
          // Accept other URLs but log for review
          result.image_url = url;
        }
      }
    }

    if (parsed.description && typeof parsed.description === 'string') {
      result.description = parsed.description.trim().substring(0, 500);
    }

    if (parsed.reference_url && typeof parsed.reference_url === 'string') {
      const refUrl = parsed.reference_url.trim();
      if (refUrl.startsWith('http://') || refUrl.startsWith('https://')) {
        result.reference_url = refUrl;
      }
    }

    if (parsed.confidence !== undefined) {
      const confidence = parseFloat(String(parsed.confidence));
      if (!isNaN(confidence) && confidence >= 0 && confidence <= 1) {
        result.confidence = confidence;
      }
    }

    return result;
  } catch (error) {
    console.error('Error parsing recommendation response:', error);
    console.error('Response text:', text);
    
    // Return empty result if parsing fails
    return {};
  }
}

export const geminiProvider = {
  getItemRecommendation
};

