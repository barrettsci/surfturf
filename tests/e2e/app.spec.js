import { expect, test } from '@playwright/test';

// Playwright gives each test a fresh browser context (clean IndexedDB + localStorage).
// We set lastExportDate so the backup-nudge banner doesn't cover toolbar buttons.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lastExportDate', Date.now().toString());
  });
  await page.goto('/');
  await page.waitForSelector('#fab');
});

test('app loads with map and toolbar', async ({ page }) => {
  await expect(page.locator('#map')).toBeVisible();
  await expect(page.locator('#fab')).toBeVisible();
  await expect(page.locator('#satellite-btn')).toBeVisible();
  await expect(page.locator('#hunting-btn')).toBeVisible();
  await expect(page.locator('#locate-btn')).toBeVisible();
  await expect(page.locator('#export-btn')).toBeVisible();
});

test('drop a pin: shows hint then category sheet then places marker', async ({ page }) => {
  await page.locator('#fab').click();

  // Pin-drop hint should appear, FAB should hide
  await expect(page.locator('#pin-drop-hint')).toBeVisible();
  await expect(page.locator('#fab')).not.toBeVisible();

  // Click somewhere on the map to place the pin
  await page.locator('#map').click({ position: { x: 400, y: 300 } });

  // Category sheet should open
  await expect(page.locator('#category-sheet')).toBeVisible();

  // Choose the first category
  await page.locator('.cat-btn').first().click();

  // A marker icon should appear on the map
  await expect(page.locator('.leaflet-marker-icon')).toBeVisible();
});

test('cancel pin-drop mode restores FAB', async ({ page }) => {
  await page.locator('#fab').click();
  await expect(page.locator('#pin-drop-hint')).toBeVisible();

  await page.locator('#cancel-pin-btn').click();

  await expect(page.locator('#pin-drop-hint')).not.toBeVisible();
  await expect(page.locator('#fab')).toBeVisible();
});

test('edit a pin description', async ({ page }) => {
  // Drop a pin first
  await page.locator('#fab').click();
  await page.locator('#map').click({ position: { x: 400, y: 300 } });
  await page.locator('.cat-btn').first().click();

  // Open the marker popup
  await page.locator('.leaflet-marker-icon').click();
  await expect(page.locator('.poi-popup-content')).toBeVisible();

  // Click Edit
  await page.locator('.poi-edit-btn').click();
  await expect(page.locator('#poi-sheet')).toBeVisible();

  // Enter a description and save
  await page.locator('#edit-desc').fill('Great spot near the ridge');
  await page.locator('#edit-save-btn').click();

  // Sheet should close
  await expect(page.locator('#poi-sheet')).not.toBeVisible();

  // Reopen popup to verify description was saved
  await page.locator('.leaflet-marker-icon').click();
  await expect(page.locator('.poi-desc')).toContainText('Great spot near the ridge');
});

test('delete a pin removes the marker', async ({ page }) => {
  // Drop a pin
  await page.locator('#fab').click();
  await page.locator('#map').click({ position: { x: 400, y: 300 } });
  await page.locator('.cat-btn').first().click();
  await expect(page.locator('.leaflet-marker-icon')).toBeVisible();

  // Open popup and delete
  await page.locator('.leaflet-marker-icon').click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.poi-delete-btn').click();

  // Marker should be gone
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(0);
});

test('dismiss delete confirmation leaves the pin in place', async ({ page }) => {
  await page.locator('#fab').click();
  await page.locator('#map').click({ position: { x: 400, y: 300 } });
  await page.locator('.cat-btn').first().click();

  await page.locator('.leaflet-marker-icon').click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('.poi-delete-btn').click();

  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(1);
});

test('switch active profile updates the profile label', async ({ page }) => {
  await page.locator('#profile-btn').click();
  await expect(page.locator('#profile-sheet')).toBeVisible();

  // Click the Fishing profile (second button)
  await page.locator('.profile-select-btn').nth(1).click();

  await expect(page.locator('#profile-label')).toHaveText('Fishing');
});

test('satellite toggle button label cycles correctly', async ({ page }) => {
  const btn = page.locator('#satellite-btn');
  await expect(btn).toHaveText('Satellite');
  await btn.click();
  await expect(btn).toHaveText('Topo');
  await btn.click();
  await expect(btn).toHaveText('Satellite');
});

test('closing a sheet via backdrop hides it', async ({ page }) => {
  await page.locator('#profile-btn').click();
  await expect(page.locator('#profile-sheet')).toBeVisible();

  // Click a corner of the backdrop that isn't covered by the sheet
  await page.locator('#sheet-backdrop').click({ position: { x: 10, y: 10 } });
  await expect(page.locator('#profile-sheet')).not.toBeVisible();
});
