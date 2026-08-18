import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const baseURL = process.env.WORLDSEED_URL || 'http://127.0.0.1:5173';
const outDir = process.env.WORLDSEED_E2E_OUT || 'artifacts/browser-playtest';
await fs.mkdir(outDir, { recursive: true });

// CI installs the default headless shell. WORLDSEED_E2E_CHANNEL lets a local run use an
// already-present full Chromium build instead of downloading a second one.
const browser = await chromium.launch({
  headless: true,
  ...(process.env.WORLDSEED_E2E_CHANNEL ? { channel: process.env.WORLDSEED_E2E_CHANNEL } : {})
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const runtimeErrors = [];

page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
page.on('console', msg => {
  if (msg.type() === 'error') runtimeErrors.push(`console: ${msg.text()}`);
});

const fail = message => { throw new Error(message); };

// The visible clock abbreviates deep time ("1.4M yr"), so the exact value is read from the
// clock's accessible name instead of its rendered text.
const readYear = async () => {
  const label = await page.locator('[aria-label^="Current year"]').first().getAttribute('aria-label');
  const match = label?.match(/Current year (\d+)/);
  if (!match) fail(`Could not parse current year from: ${label}`);
  return Number(match[1]);
};

try {
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.getByText('WORLDSEED', { exact: true }).first().waitFor({ state: 'visible', timeout: 15_000 });

  // The world opens on the Globe hero view with first-use guidance. Capture both, then
  // dismiss the guidance so it cannot intercept later interaction.
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outDir}/00-first-light.png`, fullPage: true });
  const introDismiss = page.getByRole('button', { name: 'Dismiss introduction' });
  if (await introDismiss.count()) await introDismiss.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${outDir}/01-default-globe.png`, fullPage: true });

  const viewSelectIndex = await page.locator('select').evaluateAll(selects =>
    selects.findIndex(select => Array.from(select.options).some(option => option.value === 'GLOBE'))
  );
  if (viewSelectIndex < 0) fail('World view selector with GLOBE option was not found.');
  const viewSelect = page.locator('select').nth(viewSelectIndex);

  const layerSelectIndex = await page.locator('select').evaluateAll(selects =>
    selects.findIndex(select => Array.from(select.options).some(option => option.value === 'TEMPERATURE'))
  );
  if (layerSelectIndex < 0) fail('Map layer selector with TEMPERATURE option was not found.');
  const layerSelect = page.locator('select').nth(layerSelectIndex);

  const rootBox = await page.locator('#root').boundingBox();
  if (!rootBox) fail('Application root has no visible bounding box.');

  await viewSelect.selectOption('FLAT_ATLAS');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/02-flat-atlas.png`, fullPage: true });
  await viewSelect.selectOption('SQUARE_TILE');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/03-square-world.png`, fullPage: true });

  const heroViews = ['GLOBE', 'SNOW_GLOBE', 'RELIEF_DIORAMA', 'ORBITAL_VIEW'];
  for (const mode of heroViews) {
    await viewSelect.selectOption(mode);
    const threeCanvas = page.locator('canvas[data-worldseed-renderer="three"]');
    await threeCanvas.waitFor({ state: 'visible', timeout: 10_000 });
    const box = await threeCanvas.boundingBox();
    if (!box || box.width < 400 || box.height < 300) fail(`${mode} WebGL canvas is unexpectedly small or missing.`);

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 90, cy + 35, { steps: 10 });
    await page.mouse.up();
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(250);

    await page.mouse.click(cx, cy);
    await page.waitForTimeout(250);
    // Assert the inspector itself opened, rather than matching prose that any UI copy change
    // could break. The panel only renders when a world entity actually resolved.
    if (!(await page.locator('aside[aria-label="Inspector"]').count())) {
      fail(`${mode} center click did not expose any selectable world entity.`);
    }
    await page.keyboard.press('Escape');

    await layerSelect.selectOption('TEMPERATURE');
    await page.waitForTimeout(150);
    if ((await layerSelect.inputValue()) !== 'TEMPERATURE') fail(`${mode} did not retain the selected map layer.`);
    await layerSelect.selectOption('PHYSICAL');

    await page.screenshot({ path: `${outDir}/${mode.toLowerCase()}.png`, fullPage: true });
  }

  await viewSelect.selectOption('GLOBE');
  await page.keyboard.press('w');
  await page.keyboard.press('d');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('+');
  await page.waitForTimeout(150);
  if (await page.getByText('Planetary & Divine Interventions', { exact: true }).count()) fail('WASD camera navigation incorrectly opened World Lab.');
  const discoveryHeading = page.getByText('Emergent Discoveries', { exact: false }).first();
  if (await discoveryHeading.count() && await discoveryHeading.isVisible().catch(() => false)) fail('WASD camera navigation incorrectly opened Discoveries.');

  const cycle = ['FLAT_ATLAS', 'GLOBE', 'SNOW_GLOBE', 'RELIEF_DIORAMA', 'ORBITAL_VIEW', 'SQUARE_TILE'];
  for (let round = 0; round < 4; round++) {
    for (const mode of cycle) {
      await viewSelect.selectOption(mode);
      await page.waitForTimeout(100);
    }
  }

  await page.keyboard.press('v');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${outDir}/immersion.png`, fullPage: true });
  await page.keyboard.press('Tab');

  await viewSelect.selectOption('FLAT_ATLAS');
  const beforeYear = await readYear();
  await page.getByRole('button', { name: '20×' }).click();
  await page.getByRole('button', { name: 'Resume Time' }).click();
  await page.waitForTimeout(650);
  const afterYear = await readYear();
  if (afterYear - beforeYear < 3) fail(`Continuous simulation stalled: expected multiple years at 20×, advanced only ${afterYear - beforeYear}.`);
  // Active speed is asserted through the control's own pressed state rather than a styling
  // class, so the check survives visual changes and still proves the control is authoritative.
  const speedButton = page.getByRole('button', { name: '20×' });
  if ((await speedButton.getAttribute('aria-pressed')) !== 'true') fail('20× speed selection did not remain active after simulation ticks.');
  await page.getByRole('button', { name: 'Pause Time' }).click();

  // Real IndexedDB/UI persistence round trip: save, mutate time, load the save, and prove
  // the authoritative engine state returns to the saved year.
  const savedYear = await readYear();
  const openSaves = async () => {
    await page.getByRole('button', { name: 'Instruments' }).click();
    await page.getByRole('menuitem', { name: /Saves/ }).click();
  };

  await openSaves();
  await page.getByPlaceholder('Enter save slot name...').fill('Browser E2E Checkpoint');
  await page.getByRole('button', { name: 'Save to Browser DB' }).click();
  await page.getByText('Browser E2E Checkpoint', { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  await page.getByLabel('Close Saves').click();

  await page.getByText('+100y', { exact: true }).click();
  const mutatedYear = await readYear();
  if (mutatedYear <= savedYear) fail('World did not advance after creating the persistence checkpoint.');

  await openSaves();
  await page.getByRole('button', { name: 'Load' }).first().click();
  await page.waitForTimeout(200);
  const restoredYear = await readYear();
  if (restoredYear !== savedYear) fail(`Save/load round trip restored year ${restoredYear}, expected ${savedYear}.`);

  // Selection must reach the inspector and the world at the same time.
  await viewSelect.selectOption('GLOBE');
  await page.waitForTimeout(400);
  const globeCanvas = await page.locator('canvas[data-worldseed-renderer="three"]').boundingBox();
  if (globeCanvas) {
    await page.mouse.click(globeCanvas.x + globeCanvas.width / 2, globeCanvas.y + globeCanvas.height / 2);
    await page.waitForTimeout(250);
    if (!(await page.locator('aside[aria-label="Inspector"]').count())) fail('Selecting on the globe did not open the inspector.');
    await page.screenshot({ path: `${outDir}/10-globe-selection.png`, fullPage: true });
    await page.getByRole('button', { name: 'Why?' }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${outDir}/11-why-trace.png`, fullPage: true });
    await page.keyboard.press('Escape');
  }

  // Secondary tools must stay reachable but subordinate.
  await page.getByRole('button', { name: 'Instruments' }).click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${outDir}/12-instruments.png`, fullPage: true });
  await page.keyboard.press('Escape');

  // WebGL contexts must not accumulate across repeated view switching.
  const canvasCount = await page.locator('canvas').count();
  if (canvasCount > 3) fail(`Repeated view switching left ${canvasCount} canvases alive.`);

  // Narrow viewport: no critical control may vanish.
  await page.setViewportSize({ width: 430, height: 860 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/13-narrow.png`, fullPage: true });
  for (const name of ['Resume Time', 'Pause Time']) {
    if (await page.getByRole('button', { name }).count()) break;
  }
  if (!(await page.getByRole('button', { name: /Resume Time|Pause Time/ }).count())) fail('Time control disappeared at mobile width.');
  if (!(await page.getByRole('button', { name: 'Instruments' }).count())) fail('Instruments menu disappeared at mobile width.');
  if (!(await page.getByLabel('World view').count())) fail('World view selector disappeared at mobile width.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);

  if (runtimeErrors.length) fail(`Browser runtime emitted errors:\n${runtimeErrors.join('\n')}`);

  const report = {
    baseURL,
    checkedAt: new Date().toISOString(),
    heroViews,
    repeatedViewSwitches: cycle.length * 4,
    keyboardCameraControls: 'PASS',
    continuousSimulationYearsAdvanced: afterYear - beforeYear,
    persistenceRoundTrip: { savedYear, mutatedYear, restoredYear, verdict: 'PASS' },
    liveCanvasesAfterViewTorture: canvasCount,
    narrowViewportControls: 'PASS',
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
