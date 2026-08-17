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

await page.addInitScript(() => {
  window.__worldseedOscillatorCount = 0;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  const originalCreateOscillator = AudioCtor.prototype.createOscillator;
  AudioCtor.prototype.createOscillator = function (...args) {
    window.__worldseedOscillatorCount += 1;
    return originalCreateOscillator.apply(this, args);
  };
});

const readYear = async () => {
  const timeline = page.getByTestId('timeline-controls');
  const text = await timeline.innerText();
  const match = text.match(/YEAR\s+([\d,]+)/i);
  if (!match) fail(`Could not parse current year from timeline: ${text}`);
  return Number(match[1].replaceAll(',', ''));
};

const waitForYear = async (expectedYear, timeoutMs = 15_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastYear = await readYear();
  while (lastYear !== expectedYear && Date.now() < deadline) {
    await page.waitForTimeout(100);
    lastYear = await readYear();
  }
  return lastYear;
};

try {
  await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 45_000 });
  await page.getByText('WORLDSEED', { exact: true }).first().waitFor({ state: 'visible', timeout: 15_000 });

  const rootBox = await page.locator('#root').boundingBox();
  if (!rootBox) fail('Application root has no visible bounding box.');

  const viewSelect = page.getByTestId('view-select');
  const layerSelect = page.getByTestId('layer-select');
  if ((await viewSelect.inputValue()) !== 'GLOBE') fail('WORLDSEED must open world-first in the Globe view.');

  const threeCanvas = page.locator('canvas[data-worldseed-renderer="three"]');
  await threeCanvas.waitFor({ state: 'visible', timeout: 10_000 });
  const defaultCanvasBox = await threeCanvas.boundingBox();
  if (!defaultCanvasBox) fail('Default WebGL world canvas is missing.');
  if (defaultCanvasBox.width / rootBox.width < 0.9 || defaultCanvasBox.height / rootBox.height < 0.85) {
    fail(`World surface does not dominate the viewport: ${defaultCanvasBox.width}x${defaultCanvasBox.height} inside ${rootBox.width}x${rootBox.height}.`);
  }

  const timelineBox = await page.getByTestId('timeline-controls').boundingBox();
  if (!timelineBox || timelineBox.height > 90 || timelineBox.width > rootBox.width * 0.72) {
    fail('Timeline controls are too invasive for the world-first interface.');
  }

  if (await page.getByText('Tree of Life', { exact: true }).count()) {
    fail('Secondary dashboard tools are visible before the user asks for them.');
  }

  await page.screenshot({ path: `${outDir}/01-world-first-globe.png`, fullPage: true });

  const centerX = defaultCanvasBox.x + defaultCanvasBox.width / 2;
  const centerY = defaultCanvasBox.y + defaultCanvasBox.height / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 90, centerY + 35, { steps: 10 });
  await page.mouse.up();
  await page.mouse.wheel(0, -450);
  await page.waitForTimeout(180);
  await page.mouse.click(centerX, centerY);

  const inspector = page.getByTestId('inspector-panel');
  await inspector.waitFor({ state: 'visible', timeout: 5_000 });
  await inspector.getByRole('button', { name: /follow|following/i }).waitFor({ state: 'visible' });
  await inspector.getByRole('button', { name: 'Why?' }).waitFor({ state: 'visible' });
  await inspector.getByRole('button', { name: 'What if?' }).waitFor({ state: 'visible' });

  await inspector.getByRole('button', { name: 'What if?' }).click();
  await page.getByText('Planetary & Divine Interventions', { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  await page.getByRole('button', { name: 'Close World Lab' }).click();

  const heroViews = ['GLOBE', 'SNOW_GLOBE', 'RELIEF_DIORAMA', 'ORBITAL_VIEW'];
  for (const mode of heroViews) {
    await viewSelect.selectOption(mode);
    const canvas = page.locator('canvas[data-worldseed-renderer="three"]');
    await canvas.waitFor({ state: 'visible', timeout: 10_000 });
    const box = await canvas.boundingBox();
    if (!box || box.width < 1000 || box.height < 700) fail(`${mode} no longer owns enough of the viewport.`);

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 30, { steps: 8 });
    await page.mouse.up();
    await page.mouse.wheel(0, -250);
    await page.waitForTimeout(120);

    await layerSelect.selectOption('TEMPERATURE');
    if ((await layerSelect.inputValue()) !== 'TEMPERATURE') fail(`${mode} did not retain the selected observation layer.`);
    await layerSelect.selectOption('PHYSICAL');
    await page.screenshot({ path: `${outDir}/${mode.toLowerCase()}.png`, fullPage: true });
  }

  await viewSelect.selectOption('GLOBE');
  await page.keyboard.press('w');
  await page.keyboard.press('d');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('+');
  await page.waitForTimeout(120);
  if (await page.getByText('Planetary & Divine Interventions', { exact: true }).count()) fail('Camera navigation incorrectly opened World Lab.');

  const oscillatorCountBeforePlayback = await page.evaluate(() => window.__worldseedOscillatorCount || 0);
  if (oscillatorCountBeforePlayback !== 0) fail(`Audio oscillator created before explicit audio enable: ${oscillatorCountBeforePlayback}.`);

  const beforeYear = await readYear();
  await page.getByRole('button', { name: '20×' }).click();
  await page.getByRole('button', { name: 'Resume Time' }).click();
  await page.waitForTimeout(650);
  const afterYear = await readYear();
  if (afterYear - beforeYear < 3) fail(`Continuous simulation stalled: expected multiple years at 20×, advanced only ${afterYear - beforeYear}.`);
  const oscillatorCountAfterPlayback = await page.evaluate(() => window.__worldseedOscillatorCount || 0);
  if (oscillatorCountAfterPlayback !== 0) fail('Starting time unexpectedly created continuous audio oscillators.');
  await page.getByRole('button', { name: 'Pause Time' }).click();

  await page.getByTestId('world-tools-button').click();
  const toolsPanel = page.getByTestId('world-tools-panel');
  await toolsPanel.waitFor({ state: 'visible' });
  await toolsPanel.getByText('Audio off', { exact: true }).waitFor({ state: 'visible' });
  await toolsPanel.getByTitle('Local Saves & World Export/Import').click();

  const savedYear = await readYear();
  await page.getByPlaceholder('Enter save slot name...').fill('Browser E2E Checkpoint');
  await page.getByRole('button', { name: 'Save to Browser DB' }).click();
  await page.getByText('Browser E2E Checkpoint', { exact: true }).waitFor({ state: 'visible', timeout: 5_000 });
  await page.getByLabel('Close Saves').click();

  await page.getByText('+10y', { exact: true }).click();
  const mutatedYear = await readYear();
  if (mutatedYear <= savedYear) fail('World did not advance after creating the persistence checkpoint.');

  await page.getByTestId('world-tools-button').click();
  await page.getByTestId('world-tools-panel').getByTitle('Local Saves & World Export/Import').click();
  await page.getByRole('button', { name: 'Load' }).first().click();
  await page.getByLabel('Close Saves').waitFor({ state: 'hidden', timeout: 15_000 });
  const restoredYear = await waitForYear(savedYear, 15_000);
  if (restoredYear !== savedYear) fail(`Save/load round trip restored year ${restoredYear}, expected ${savedYear}.`);

  const cycle = ['GLOBE', 'RELIEF_DIORAMA', 'ORBITAL_VIEW', 'SNOW_GLOBE', 'FLAT_ATLAS', 'SQUARE_TILE'];
  for (let round = 0; round < 3; round++) {
    for (const mode of cycle) {
      await viewSelect.selectOption(mode);
      await page.waitForTimeout(80);
    }
  }

  await page.keyboard.press('Tab');
  await page.waitForTimeout(160);
  await page.screenshot({ path: `${outDir}/immersion.png`, fullPage: true });
  await page.keyboard.press('Tab');

  if (runtimeErrors.length) fail(`Browser runtime emitted errors:\n${runtimeErrors.join('\n')}`);

  const report = {
    baseURL,
    checkedAt: new Date().toISOString(),
    defaultView: 'GLOBE',
    worldViewportCoverage: {
      widthRatio: defaultCanvasBox.width / rootBox.width,
      heightRatio: defaultCanvasBox.height / rootBox.height
    },
    curiosityTriad: 'PASS',
    audioSilentUntilEnabled: 'PASS',
    heroViews,
    repeatedViewSwitches: cycle.length * 3,
    keyboardCameraControls: 'PASS',
    continuousSimulationYearsAdvanced: afterYear - beforeYear,
    persistenceRoundTrip: { savedYear, mutatedYear, restoredYear, verdict: 'PASS' },
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
