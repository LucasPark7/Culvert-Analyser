import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tests the core upload -> analyse -> graph flow on the Culvert Analyser.
 *
 * Selectors are taken directly from src/components/UploadPanel.tsx,
 * src/pages/Analyse.tsx, and src/components/CulvertChart.tsx:
 *  - hidden file input:      #videoFile
 *  - upload trigger button:  .button.icon.solid.fa-upload (text changes
 *                             from "Upload Video" to the selected filename)
 *  - resolution select:      #resoSelect (defaults to 1920x1080 — left as-is,
 *                             per the test flow)
 *  - analyse button:         button.primary (text toggles "Analyse" <-> "Processing...")
 *  - status text:            #result (Uploading... -> Upload successful,
 *                             processing video... -> Processing complete!)
 *  - result chart:           canvas#resultChart
 *  - completed run row:      table#culvList (renders "Culvert Run #1 (...)")
 *
 * Analysis can take up to ~5 minutes per the page's own copy, so this test
 * uses a generous timeout rather than polling too aggressively.
 */

const VIDEO_PATH = path.join(__dirname, 'testvideos', '154kCulv.mp4');
const PAGE_URL = 'https://jhoonings.github.io/Culvert-Analyser/analyse.html';

test.describe('Culvert video upload and analysis', () => {
  test('uploading a video and clicking Analyse produces a result graph', async ({ page }) => {
    // Analysis can take up to 5 minutes; give this test enough headroom.
    test.setTimeout(6 * 60 * 1000);

    await page.goto(PAGE_URL);
    await expect(page).toHaveTitle(/Culvert Collections/);

    const uploadButton = page.locator('.upload-panel button.button.icon.solid.fa-upload');
    const analyseButton = page.locator('.upload-panel button.primary');
    const status = page.locator('#result');
    const chart = page.locator('#resultChart');

    // Sanity check on initial state.
    await expect(uploadButton).toHaveText('Upload Video');
    await expect(analyseButton).toHaveText('Analyse');
    await expect(analyseButton).toBeEnabled();

    // --- Step 1: upload the video ---
    // The visible button just triggers a click on the hidden <input type="file">,
    // so we set the file directly on that input rather than trying to drive
    // the native OS file picker.
    await page.locator('#videoFile').setInputFiles(VIDEO_PATH);

    // Button label switches from "Upload Video" to the selected filename.
    await expect(uploadButton).toHaveText('154kCulv.mp4');

    // Leaving resolution at its default (1920x1080) per the requested flow.
    await expect(page.locator('#resoSelect')).toHaveValue('1920x1080');

    // --- Step 2: click Analyse ---
    await analyseButton.click();

    // Button disables and shows a processing state while the job runs.
    await expect(analyseButton).toHaveText('Processing...');
    await expect(analyseButton).toBeDisabled();

    // Status text should reflect the upload starting...
    await expect(status).toHaveText(/Uploading|Upload successful/, { timeout: 60_000 });

    // --- Step 3: wait for processing to complete ---
    await expect(status).toHaveText('Processing complete!', { timeout: 5 * 60 * 1000 });

    // Make sure it didn't actually fail silently under a matching prefix.
    await expect(status).not.toContainText('Error');

    // Button re-enables and resets once done.
    await expect(analyseButton).toHaveText('Analyse');
    await expect(analyseButton).toBeEnabled();

    // --- Step 4: verify the graph was returned ---
    await expect(chart).toBeVisible();
    // A rendered chart.js canvas should have real pixel dimensions, not a 0x0 stub.
    const box = await chart.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);

    // The completed run should also show up in the run list below the chart.
    await expect(page.locator('#culvList')).toContainText('Culvert Run #1');
  });
});
