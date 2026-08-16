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

const fail = message => { throw new Error(message); };

const readYear = async () => {
  const yearLabel = page.getByText('YEAR', { exact: true }).first();
  const parentText = await yearLabel.locator('..').innerText();
  const match = parentText.match(/YEAR\s+([\d,]+)/);
  if (!match) fail(`Could not parse current year from: ${parentText}`);
  return Number(match[1].replaceAll(',', ''));
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

  const layerSelectIndex = await page.locator('select').evaluateAll(selects =>
    selects.findIndex(select => Array.from(select.options).some(option => option.value === 'TEMPERATURE'))
  );
  if (layerSelectIndex < 0) fail('Map layer selector with TEMPERATURE option was not found.');
  const layerSelect = page.locator('select').nth(layerSelectIndex);

  const rootBox = await page.locator('#root').boundingBox();
  if (!rootBox) fail('Application root has no visible bounding box.');

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
    const inspectorText = await page.locator('body').innerText();
    if (!/(TILE|SPECIES|SETTLEMENT|RUIN)/.test(inspectorText)) fail(`${mode} center click did not expose any selectable world entity.`);

    await layerSelect.selectOption('TEMPERATURE');
    await page.waitForTimeout(150);
    if ((await layerSelect.inputValue()) !== 'TEMPERATURE') fail(`${mode} did not retain the selected map layer.`);
    await layerSelect.selectOption('PHYSICAL');

    await page.screenshot({ path: `${outDir}/${mode.toLowerCase()}.png`, fullPage: true });
  }

  // Keyboard navigation owns WASD/arrows. These keys must move/orbit the world and must
  // not trigger the old conflicting World Lab / Discoveries shortcuts.
  await viewSelect.selectOption('GLOBE');
  await page.keyboard.press('w');
  await page.keyboard.press('d');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('+');
  await page.waitForTimeout(150);
  if (await page.getByText('Planetary & Divine Interventions', { exact: true }).count()) {
    fail('WASD camera navigation incorrectly opened World Lab.');
  }
  if (await page.getByText('Emergent Discoveries', { exact: false }).count()) {
    const visible = await page.getByText('Emergent Discoveries', { exact: false }).first().isVisible().catch(() => false);
    if (visible) fail('WASD camera navigation incorrectly opened Discoveries.');
  }

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
  const speedButton = page.getByRole('button', { name: '20×' });
  if (!(await speedButton.getAttribute('class'))?.includes('bg-sky-600')) fail('20× speed selection did not remain active after simulation ticks.');
  await page.getByRole('button', { name: 'Pause Time' }).click();

  if (runtimeErrors.length) fail(`Browser runtime emitted errors:\n${runtimeErrors.join('\n')}`);

  const report = {
    baseURL,
    checkedAt: new Date().toISOString(),
    heroViews,
    repeatedViewSwitches: cycle.length * 4,
    keyboardCameraControls: 'PASS',
    continuousSimulationYearsAdvanced: afterYear - beforeYear,
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
