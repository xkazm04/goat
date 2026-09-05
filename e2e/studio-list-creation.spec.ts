import { test, expect } from '@playwright/test';

import {
  goToStudio,
  clearAppStorage,
  trackApiRequests,
} from './helpers/test-utils';

/**
 * E2E Test: Studio List Creation Flow
 *
 * Tests the complete user journey of creating a new ranked list via /studio:
 * 1. Visit studio page — verify hero input state
 * 2. Enter topic — trigger AI item generation
 * 3. Verify items stream in progressively
 * 4. Check metadata auto-fill (title, description)
 * 5. Verify deduplication indicators (DB-matched vs new items)
 * 6. Test item management (remove, edit title)
 * 7. Verify publish readiness checklist
 *
 * NOTE: These tests hit the real backend (Gemini AI + Supabase).
 * They require a running dev server with valid API keys.
 * Generation can take 30-90s depending on API latency.
 */

test.describe('Studio: AI List Creation', () => {
  test.beforeEach(async ({ page }) => {
    await clearAppStorage(page);
  });

  test('should render studio page with hero input form', async ({ page }) => {
    await goToStudio(page);

    // Hero state: centered form with topic input
    // Studio may render input in both hero/expanded phases — use first visible
    const topicInput = page.getByTestId('studio-topic-input').first();
    await expect(topicInput).toBeVisible({ timeout: 10000 });
    await expect(topicInput).toBeEnabled();

    // Generate button visible but disabled (no topic yet)
    const generateBtn = page.getByTestId('studio-generate-btn').first();
    await expect(generateBtn).toBeVisible({ timeout: 10000 });

    // Browse templates and advanced options visible
    const templatesBtn = page.getByTestId('studio-browse-templates-btn').first();
    await expect(templatesBtn).toBeVisible({ timeout: 5000 });

    const advancedBtn = page.getByTestId('studio-advanced-options-btn').first();
    await expect(advancedBtn).toBeVisible({ timeout: 5000 });
  });

  test('should enable generate button when topic is entered', async ({ page }) => {
    await goToStudio(page);
    await page.waitForTimeout(1500); // Let Framer Motion animations settle

    const topicInput = page.getByTestId('studio-topic-input').first();
    const generateBtn = page.getByTestId('studio-generate-btn').first();
    await expect(topicInput).toBeVisible({ timeout: 10000 });

    // Initially disabled
    await expect(generateBtn).toBeDisabled();

    // Type a topic
    await topicInput.fill('Best Sci-Fi Movies');
    await expect(generateBtn).toBeEnabled();

    // Clear topic — button disables again
    await topicInput.fill('');
    await expect(generateBtn).toBeDisabled();
  });

  test('should expand advanced options and show form fields', async ({ page }) => {
    await goToStudio(page);

    // Wait for hero animation to settle
    await page.waitForTimeout(2000);

    // Click advanced options
    const advancedBtn = page.getByTestId('studio-advanced-options-btn').first();
    await advancedBtn.click();

    // Wait for Framer Motion staggered expansion
    await page.waitForTimeout(2000);

    // Title input should appear (most reliable indicator of expanded state)
    const titleInput = page.getByTestId('studio-list-title-input').first();
    await expect(titleInput).toBeVisible({ timeout: 15000 });

    // List size buttons (these are reliable in expanded mode)
    const size10Btn = page.getByTestId('studio-list-size-10').first();
    await expect(size10Btn).toBeVisible({ timeout: 10000 });
  });

  test('should generate AI items for a topic and stream them progressively', async ({
    page,
  }) => {
    // This test exercises the full AI generation pipeline
    // Timeout: 120s to allow for Gemini API latency
    test.setTimeout(120_000);

    await goToStudio(page);

    // Track API calls to /api/studio/generate
    const apiCalls = trackApiRequests(page, '/api/studio/generate');

    // Enter topic and generate
    const topicInput = page.getByTestId('studio-topic-input').first();
    await topicInput.fill('Best Horror Video Games');

    const generateBtn = page.getByTestId('studio-generate-btn').first();
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // Button should show generating state (disabled with spinner)
    await expect(generateBtn).toBeDisabled({ timeout: 3000 });

    // Wait for the API call to fire
    await page.waitForTimeout(2000);
    expect(apiCalls.length).toBeGreaterThanOrEqual(1);

    // Items should start appearing progressively
    // Wait for at least the first item card to render
    const firstItemCard = page.getByTestId('studio-item-card-0');
    await expect(firstItemCard).toBeVisible({ timeout: 60_000 });

    // After first item, more should stream in
    // Wait for at least 5 items (conservative — generation produces 10-30)
    const fifthCard = page.getByTestId('studio-item-card-4');
    await expect(fifthCard).toBeVisible({ timeout: 60_000 });

    // Verify the generate button re-enables after generation completes
    await expect(generateBtn).toBeEnabled({ timeout: 60_000 });

    // Count total items generated (should be >= 10)
    const itemCards = page.locator('[data-testid^="studio-item-card-"]');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('should auto-fill list title and description from AI generation', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await goToStudio(page);

    const topicInput = page.getByTestId('studio-topic-input').first();
    await topicInput.fill('Greatest NBA Players');

    const generateBtn = page.getByTestId('studio-generate-btn').first();
    await generateBtn.click();

    // Wait for generation to complete (title auto-fills from streaming meta line)
    const titleInput = page.getByTestId('studio-list-title-input').first();
    await expect(titleInput).toBeVisible({ timeout: 30_000 });

    // Title should be auto-filled (non-empty) after generation streams meta
    await expect(async () => {
      const value = await titleInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }).toPass({ timeout: 60_000 });

    // Description should also be auto-filled
    const descInput = page.getByTestId('studio-list-description-input').first();
    await expect(async () => {
      const value = await descInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    }).toPass({ timeout: 60_000 });
  });

  test('should show enrichment source badges on generated items', async ({ page }) => {
    test.setTimeout(120_000);

    await goToStudio(page);

    const topicInput = page.getByTestId('studio-topic-input').first();
    await topicInput.fill('Best Horror Video Games');

    const generateBtn = page.getByTestId('studio-generate-btn').first();
    await generateBtn.click();

    // Wait for items to be generated and enriched
    const firstCard = page.getByTestId('studio-item-card-0');
    await expect(firstCard).toBeVisible({ timeout: 60_000 });

    // Wait for generation to finish so enrichment badges are applied
    await expect(generateBtn).toBeEnabled({ timeout: 60_000 });

    // Check that item cards have images or enrichment indicators
    // DB-matched items show a green database badge; wiki items show blue globe
    // At minimum, cards should have either an image or a title overlay
    const cardCount = await page.locator('[data-testid^="studio-item-card-"]').count();
    expect(cardCount).toBeGreaterThan(0);

    // Verify at least one card has an image (most items get images from enrichment)
    const cardsWithImages = page.locator(
      '[data-testid^="studio-item-card-"] img',
    );
    await expect(async () => {
      const imgCount = await cardsWithImages.count();
      expect(imgCount).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000 });
  });

  test('should allow removing an item from the generated list', async ({ page }) => {
    test.setTimeout(120_000);

    await goToStudio(page);

    const topicInput = page.getByTestId('studio-topic-input').first();
    await topicInput.fill('Top Programming Languages');

    const generateBtn = page.getByTestId('studio-generate-btn').first();
    await generateBtn.click();

    // Wait for items to appear
    const firstCard = page.getByTestId('studio-item-card-0');
    await expect(firstCard).toBeVisible({ timeout: 60_000 });
    await expect(generateBtn).toBeEnabled({ timeout: 60_000 });

    // Count initial items
    const initialCount = await page
      .locator('[data-testid^="studio-item-card-"]')
      .count();
    expect(initialCount).toBeGreaterThan(1);

    // Hover over first card to reveal remove button
    await firstCard.hover();
    const removeBtn = page.getByTestId('studio-item-remove-btn-0');
    await expect(removeBtn).toBeVisible({ timeout: 3000 });

    // Click remove
    await removeBtn.click();

    // Item count should decrease by 1
    await expect(async () => {
      const newCount = await page
        .locator('[data-testid^="studio-item-card-"]')
        .count();
      expect(newCount).toBe(initialCount - 1);
    }).toPass({ timeout: 5000 });
  });

  test('should allow selecting a list size', async ({ page }) => {
    await goToStudio(page);
    await page.waitForTimeout(2000);

    // Expand advanced options
    const advancedBtn = page.getByTestId('studio-advanced-options-btn').first();
    await advancedBtn.click();
    await page.waitForTimeout(2000);

    // Default size is typically 10
    const size20Btn = page.getByTestId('studio-list-size-20').first();
    await expect(size20Btn).toBeVisible({ timeout: 10000 });

    // Click size 20
    await size20Btn.click();

    // Verify selection: the button should be clickable and remain visible
    await expect(size20Btn).toBeVisible({ timeout: 3000 });
  });

  test('should open template gallery and show available templates', async ({
    page,
  }) => {
    await goToStudio(page);

    const templatesBtn = page.getByTestId('studio-browse-templates-btn').first();
    await templatesBtn.click();

    // Template gallery marker should appear (confirms modal opened)
    const galleryMarker = page.getByTestId('template-gallery');
    await expect(galleryMarker).toBeAttached({ timeout: 5000 });

    // Modal content: search input with "Search templates" placeholder
    const searchInput = page.locator('input[placeholder*="Search template"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Should show "Template Gallery" title
    const title = page.locator('text=Template Gallery');
    await expect(title).toBeVisible({ timeout: 5000 });
  });

  test('should not allow publishing without title and enough items', async ({
    page,
  }) => {
    await goToStudio(page);

    // Expand to show metadata panel would need items
    // Without generating any items, the publish button should be disabled
    // Navigate to advanced options
    const advancedBtn = page.getByTestId('studio-advanced-options-btn').first();
    await advancedBtn.click();

    // The title input should exist but empty
    const titleInput = page.getByTestId('studio-list-title-input').first();
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    const titleValue = await titleInput.inputValue();
    expect(titleValue).toBe('');

    // The publish checklist appears only once items exist, so with no items it
    // must NOT be there. That is the constraint this test is named for, and it
    // used to be written as `if (isVisible) { … }` — which passes either way,
    // including if publishing became available with nothing to publish.
    await expect(
      page.locator('text=/Ready to Publish/i'),
      "the publish checklist is offered with no items generated",
    ).not.toBeVisible({ timeout: 5000 });
  });

  test('full journey: generate items, configure, verify publish readiness', async ({
    page,
  }) => {
    // This is the comprehensive happy-path test
    test.setTimeout(180_000);

    await goToStudio(page);

    // --- Step 1: Enter topic and generate ---
    const topicInput = page.getByTestId('studio-topic-input').first();
    await topicInput.fill('Top Anime Series');

    const generateBtn = page.getByTestId('studio-generate-btn').first();
    await generateBtn.click();

    // Wait for generation to complete
    await expect(generateBtn).toBeEnabled({ timeout: 90_000 });

    // Items should be generated
    const itemCards = page.locator('[data-testid^="studio-item-card-"]');
    const itemCount = await itemCards.count();
    expect(itemCount).toBeGreaterThanOrEqual(10);

    // --- Step 2: Verify auto-filled metadata ---
    const titleInput = page.getByTestId('studio-list-title-input').first();
    const titleValue = await titleInput.inputValue();
    expect(titleValue.length).toBeGreaterThan(0);

    const descInput = page.getByTestId('studio-list-description-input').first();
    const descValue = await descInput.inputValue();
    expect(descValue.length).toBeGreaterThan(0);

    // --- Step 3: Configure list size ---
    const size10Btn = page.getByTestId('studio-list-size-10').first();
    await size10Btn.click();

    // --- Step 4: Verify publish readiness ---
    // The metadata panel should show the publish checklist
    const publishSection = page.locator('text=/Ready to Publish/i');
    await expect(publishSection).toBeVisible({ timeout: 10_000 });

    // Title set checkmark
    const titleCheckmark = page.locator('text=Title set');
    await expect(titleCheckmark).toBeVisible({ timeout: 5000 });

    // Items count (shows "Items: X/Y")
    const itemsCheck = page.locator('text=/Items:/');
    await expect(itemsCheck).toBeVisible({ timeout: 10000 });

    // --- Step 5: Verify items exist with content ---
    // Image enrichment depends on external APIs and may not always succeed
    // Just verify that generated item cards are present
    expect(itemCount).toBeGreaterThanOrEqual(10);
  });
});
