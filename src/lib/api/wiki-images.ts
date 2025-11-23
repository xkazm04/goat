/**
 * Wikipedia Image Fetching Service
 *
 * Fetches images from Wikipedia/Wikidata for items without images.
 * Uses the Wikipedia API to search for and retrieve image URLs.
 */

export interface WikiImageResult {
  /** Image URL */
  url: string;
  /** Image width */
  width?: number;
  /** Image height */
  height?: number;
  /** Source (wikipedia, wikidata, etc.) */
  source: string;
}

export interface WikiSearchResult {
  /** Page title */
  title: string;
  /** Page ID */
  pageId: number;
  /** Thumbnail URL */
  thumbnail?: string;
  /** Full image URL */
  image?: string;
}

/**
 * Fetch image from Wikipedia for a given search term
 */
export async function fetchWikipediaImage(
  searchTerm: string
): Promise<WikiImageResult | null> {
  try {
    // Step 1: Search for the page
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("origin", "*");
    searchUrl.searchParams.set("list", "search");
    searchUrl.searchParams.set("srsearch", searchTerm);
    searchUrl.searchParams.set("srlimit", "1");

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      console.error("❌ Wikipedia search failed:", searchResponse.statusText);
      return null;
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.query?.search;

    if (!searchResults || searchResults.length === 0) {
      console.log("⚠️ No Wikipedia results for:", searchTerm);
      return null;
    }

    const pageTitle = searchResults[0].title;
    const pageId = searchResults[0].pageid;

    // Step 2: Get page info with image
    const pageUrl = new URL("https://en.wikipedia.org/w/api.php");
    pageUrl.searchParams.set("action", "query");
    pageUrl.searchParams.set("format", "json");
    pageUrl.searchParams.set("origin", "*");
    pageUrl.searchParams.set("pageids", pageId.toString());
    pageUrl.searchParams.set("prop", "pageimages|original");
    pageUrl.searchParams.set("pithumbsize", "500");

    const pageResponse = await fetch(pageUrl.toString());
    if (!pageResponse.ok) {
      console.error("❌ Wikipedia page fetch failed:", pageResponse.statusText);
      return null;
    }

    const pageData = await pageResponse.json();
    const page = pageData.query?.pages?.[pageId];

    if (!page) {
      console.log("⚠️ No Wikipedia page found for:", searchTerm);
      return null;
    }

    // Try to get the best quality image
    const imageUrl =
      page.original?.source || page.thumbnail?.source || null;

    if (!imageUrl) {
      console.log("⚠️ No image found on Wikipedia for:", searchTerm);
      return null;
    }

    console.log("✅ Found Wikipedia image for:", searchTerm);

    return {
      url: imageUrl,
      width: page.original?.width || page.thumbnail?.width,
      height: page.original?.height || page.thumbnail?.height,
      source: "wikipedia",
    };
  } catch (error) {
    console.error("❌ Error fetching Wikipedia image:", error);
    return null;
  }
}

/**
 * Search multiple sources for an image (expandable to other sources)
 */
export async function fetchItemImage(
  itemTitle: string
): Promise<string | null> {
  // For now, only Wikipedia - can expand to TMDB, IGDB, etc.
  const result = await fetchWikipediaImage(itemTitle);
  return result?.url || null;
}

/**
 * Batch fetch images for multiple items
 */
export async function batchFetchImages(
  items: Array<{ id: string; title: string }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Fetch sequentially with delay to avoid rate limiting
  for (const item of items) {
    const imageUrl = await fetchItemImage(item.title);
    if (imageUrl) {
      results.set(item.id, imageUrl);
    }
    // Small delay to be polite to Wikipedia API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}
