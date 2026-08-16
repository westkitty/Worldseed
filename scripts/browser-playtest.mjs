import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.WORLDSEED_URL || 'http://127.0.0.1:5173';
const outDir = process.env.WORLDSEED_E2E_OUT || 'artifacts/browser-playtest';
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const runtimeErrors = [];

page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
page.on('console', msg => {
  if (msg.type() === 'error') runtimeErrors.push(`console: ${msg.text()}`);
});

const fail = message => {
  throw new Error(message);
};

try {
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.getByText('WORLDSEED', { exact: true }).first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.screenshot({ path: `${outDir}/01-flat-atlas.png`, fullPage: true });

  const viewSelectIndex = await page.locator('select').evaluateAll(selects =>
    selects.findIndex(select => Array.from(select.options).some(option => option.value === 'GLOBE'))
  );
  if (viewSelectIndex < 0) fail('World view selector with GLOBE option was not found.');
  const viewSelect = page.locator('select').nth(viewSelectIndex);

  const root = page.locator('#root');
  const rootBox = await root.boundingBox();
  if (!rootBox) fail('Application root has no visible bounding box.');

  const heroViews = ['GLOBE', 'SNOW_GLOBE', 'RELIEF_DIORAMA', 'ORBITAL_VIEW'];
  for (const mode of heroViews) {
    await viewSelect.selectOption(mode);
    const threeCanvas = page.locator('canvas[data-worldseed-renderer="three"]');
    await threeCanvas.waitFor({ state: 'visible', timeout: 10_000 });
    const box = await threeCanvas.boundingBox();
    if (!box || box.width < 400 || box.height < 300) fail(`${mode} WebGL canvas is unexpectedly small or missing.`);

    // Exercise camera input rather than merely checking that a canvas exists.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 90, cy + 35, { steps: 10 });
    await page.mouse.up();
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(250);

    // Click the visible world surface. A functioning 3D picker should select something
    // and reveal an inspector with one of the supported entity-type badges.
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(250);
    const inspectorText = await page.locator('body').innerText();
    if (!/(TILE|SPECIES|SETTLEMENT|RUIN)/.test(inspectorText)) {
      fail(`${mode} center click did not expose any selectable world entity.`);
    }

    await page.screenshot({ path: `${outDir}/${mode.toLowerCase()}.png`, fullPage: true });
  }

  // Repeated switching is deliberately hostile to renderer ownership/disposal.
  const cycle = ['FLAT_ATLAS', 'GLOBE', 'SNOW_GLOBE', 'RELIEF_DIORAMA', 'ORBITAL_VIEW', 'SQUARE_TILE'];
  for (let round = 0; round < 4; round++) {
    for (const mode of cycle) {
      await viewSelect.selectOption(mode);
      await page.waitForTimeout(100);
    }
  }

  // Keyboard controls: view cycling and immersion toggle must not break the app.
  await page.keyboard.press('v');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${outDir}/immersion.png`, fullPage: true });
  await page.keyboard.press('Tab');

  // Basic simulation control smoke path.
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  await page.keyboard.press('Space');

  if (runtimeErrors.length) {
    fail(`Browser runtime emitted errors:\n${runtimeErrors.join('\n')}`);
  }

  const report = {
    baseURL,
    checkedAt: new Date().toISOString(),
    heroViews,
    repeatedViewSwitches: cycle.length * 4,
    runtimeErrors,
    verdict: 'PASS'
  };
  await fs.writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: `${outDir}/failure.png`, fullPage: true }).catch(() => {});
  const report = {
    baseURL,
    checkedAt: new Date().toISOString(),
    runtimeErrors,
    verdict: 'FAIL',
    error: error instanceof Error ? error.message : String(error)
  };
  await fs.writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
