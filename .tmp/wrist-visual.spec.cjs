const { test, devices } = require('playwright/test');
const phone = devices['Pixel 7'];

test.use({ ...phone });

test('capture screens', async ({ page }) => {
  await page.goto('http://127.0.0.1:4176/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${process.env.TEMP}\\wrist-home.png`, fullPage: true });

  await page.goto('http://127.0.0.1:4176/Tutorial', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${process.env.TEMP}\\wrist-tutorial.png`, fullPage: true });

  await page.goto('http://127.0.0.1:4176/MeasureCircle', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${process.env.TEMP}\\wrist-circle-guide.png`, fullPage: true });

  const start = page.getByRole('button', { name: 'START' });
  await start.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${process.env.TEMP}\\wrist-circle-intro.png`, fullPage: true });
});
