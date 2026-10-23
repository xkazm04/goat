import { expect, test } from '@playwright/test';

/**
 * Only /embed/<slug> may be framed (docs/v2/TECHNICAL_PACKAGE.md §6). This is a
 * separate file because Chrome's local-network checks would block a frame from
 * one loopback origin to another before the headers are read, which is the
 * thing under test, so they are switched off here and launch options can only
 * be set per file.
 */
test.use({
  launchOptions: {
    args: ['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks'],
    ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
  },
});

test('only the embed may be framed, and unknown lists answer 404', async ({ page, request, baseURL }) => {
  const embed = await request.get('/embed/not-a-real-list');
  expect(embed.status()).toBe(404);
  expect(embed.headers()['content-security-policy']).toContain('frame-ancestors *');
  expect(embed.headers()['x-frame-options']).toBeUndefined();

  const home = await request.get('/');
  expect(home.headers()['x-frame-options']).toBe('DENY');

  expect((await request.get('/p/not-a-real-list')).status()).toBe(404);
  const oembed = await request.get(`/api/oembed?url=${encodeURIComponent(`${baseURL}/p/not-a-real-list`)}`);
  expect(oembed.status()).toBe(404);
  expect((await request.get('/api/oembed?url=https%3A%2F%2Fevil.test%2Fp%2Fx&format=xml')).status()).toBe(501);

  // A page on another origin can frame the embed but not the app.
  await page.route('http://127.0.0.1:3999/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<iframe id="e" src="${baseURL}/embed/not-a-real-list"></iframe><iframe id="a" src="${baseURL}/v2"></iframe>`,
    }),
  );
  await page.goto('http://127.0.0.1:3999/');
  await expect.poll(() => page.frames().some((f) => f.url() === `${baseURL}/embed/not-a-real-list`)).toBe(true);
  await page.waitForTimeout(1500);
  expect(page.frames().some((f) => f.url() === `${baseURL}/v2`)).toBe(false);
});
