import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * M2 exit: rank in every mode. Runs against /v2/l/demo, which needs no
 * database; a fresh browser context starts from the bundled demo list
 * (12 of 25 ranked, Elden Ring #1).
 */

async function drag(page: Page, from: Locator, to: Locator, offset = { x: 0.5, y: 0.5 }) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 4 });
  await page.mouse.move(b.x + b.width * offset.x, b.y + b.height * offset.y, { steps: 14 });
  await page.waitForTimeout(120);
  await page.mouse.up();
}

const rankLabel = (page: Page, rank: number) => page.locator(`[aria-label^="#${rank} "]`).first();

/** Switch mode by key and let the covers finish travelling before touching them. */
async function mode(page: Page, key: string, selector: string) {
  await page.keyboard.press(key);
  await expect(page.locator(selector)).toBeVisible();
  await page.waitForTimeout(900);
}

test('ranks the demo list in all four modes, then survives a reload with undo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/v2/l/demo');
  await expect(page.locator('.mo')).toBeVisible();
  await expect(rankLabel(page, 1)).toHaveAttribute('aria-label', '#1 Elden Ring');

  // Mosaic: drag a pool cover onto #3.
  await drag(page, page.getByLabel('Skyrim, unranked'), rankLabel(page, 3));
  await expect(rankLabel(page, 3)).toHaveAttribute('aria-label', '#3 Skyrim');

  // Canvas: drop Hollow Knight at the very top of the board, so it becomes #1.
  await mode(page, '2', '.cv');
  await drag(page, page.locator('[aria-label$=" Hollow Knight"]').first(), page.locator('.cv'), { x: 0.6, y: 0.02 });
  await expect(rankLabel(page, 1)).toHaveAttribute('aria-label', '#1 Hollow Knight');

  // Canvas: move the GOAT tier line down one rank with the keyboard.
  await page.getByRole('button', { name: /Tier line after rank 3/ }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: /Tier line after rank 4/ })).toBeVisible();

  // Spread: Alt+Up on #2 swaps it with #1.
  await mode(page, '3', '.sp');
  const second = (await rankLabel(page, 2).getAttribute('aria-label'))!.replace('#2 ', '');
  await rankLabel(page, 2).focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(rankLabel(page, 1)).toHaveAttribute('aria-label', `#1 ${second}`);

  // Stage: drop a pool cover on the #1 spot, win the face-off with ←.
  await mode(page, '4', '.st');
  await drag(page, page.getByLabel('Undertale, unranked'), page.locator('.st-spot[data-rank="1"]'));
  await expect(page.getByRole('dialog', { name: 'Face-off for #1' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(rankLabel(page, 1)).toHaveAttribute('aria-label', '#1 Undertale');

  // Stage: run the tournament and let the underdog win every match.
  const before = await page.locator('.st-wing .ed-card').first().getAttribute('aria-label');
  await page.getByRole('button', { name: 'Run tournament' }).click();
  for (let i = 0; i < 7; i++) {
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(rankLabel(page, 1)).not.toHaveAttribute('aria-label', '#1 Undertale');
  expect(await page.locator('.st-wing .ed-card').first().getAttribute('aria-label')).not.toBe(before);

  // Every mode still shows the same #1.
  const top = await rankLabel(page, 1).getAttribute('aria-label');
  for (const [key, sel] of [['1', '.mo'], ['2', '.cv'], ['3', '.sp']] as const) {
    await mode(page, key, sel);
    await expect(rankLabel(page, 1)).toHaveAttribute('aria-label', top!);
  }

  // Reload: the order is kept, and undo still steps back through the tournament.
  await page.waitForTimeout(800);
  await page.reload();
  await expect(page.locator('.mo')).toBeVisible();
  await expect(rankLabel(page, 1)).toHaveAttribute('aria-label', top!);
  await page.keyboard.press('Control+z');
  await expect(rankLabel(page, 1)).toHaveAttribute('aria-label', '#1 Undertale');

  expect(errors).toEqual([]);
});

test('lays out without sideways scrolling on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 860 });
  for (const [key, sel] of [['1', '.mo'], ['2', '.cv'], ['3', '.sp'], ['4', '.st']] as const) {
    if (key === '1') await page.goto('/v2/l/demo');
    await mode(page, key, sel);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
  }
});

test('builds a pool from a topic and opens it in the editor', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/v2/new?topic=pizza%20toppings');
  await page.getByRole('button', { name: 'Build the pool' }).click();
  // 25 asked for, with a 20% margin: the fixture provider yields 30.
  await expect(page.getByRole('status')).toContainText('30 of 30 kept');

  await page.getByRole('button', { name: 'Drop' }).first().click();
  await expect(page.getByRole('status')).toContainText('29 of 30 kept');

  await page.getByRole('button', { name: 'Start ranking 29' }).click();
  await expect(page).toHaveURL(/\/v2\/l\/[0-9a-f-]{36}$/);
  await expect(page.locator('.mo')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the critic answers and sees later edits, and Find gaps adds to the pool', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const bodies: { turns: { kind: string; text: string }[] }[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/api/v2/critic')) bodies.push(r.postDataJSON());
  });

  await page.goto('/v2/l/demo');
  await expect(page.locator('.mo')).toBeVisible();

  await page.getByRole('button', { name: 'Challenge me' }).click();
  const box = page.getByLabel('Message the critic');
  await box.fill('Defend my number one.');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('.critic-log [data-role="critic"]').first()).toContainText('Fixture critic, round 1');

  // An edit between questions reaches the critic as a change turn, not a new snapshot.
  await page.keyboard.press('Escape');
  await drag(page, page.getByLabel('Skyrim, unranked'), rankLabel(page, 2));
  await box.fill('And now?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.locator('.critic-log [data-role="critic"]').nth(1)).toContainText('I saw your edits');
  expect(bodies).toHaveLength(2);
  expect(bodies[1].turns.map((t) => t.kind)).toEqual(['user', 'assistant', 'change', 'user']);
  expect(JSON.stringify(bodies[1])).toContain('Skyrim was ranked at #2');

  // Gaps join the front of the pool.
  const before = await page.locator('.pool h2 b').innerText();
  await page.getByRole('button', { name: 'Find gaps' }).click();
  await expect(page.getByText('Added 3 to the front of the pool.')).toBeVisible();
  expect(Number(await page.locator('.pool h2 b').innerText())).toBe(Number(before) + 3);
  expect(errors).toEqual([]);
});
