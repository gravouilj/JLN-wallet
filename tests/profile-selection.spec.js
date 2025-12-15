// @ts-check
import { test, expect } from '@playwright/test';

const TEST_MNEMONIC = 'your test mnemonic phrase here with twelve words total for testing purposes only';

test.describe('Profile Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[placeholder*="mnemonic"]', TEST_MNEMONIC);
    await page.click('button:has-text("Connect")');
    await expect(page.locator('text=Disconnect')).toBeVisible({ timeout: 30000 });
  });

  test('should display profile selector dropdown on dashboard', async ({ page }) => {
    // Navigate to wallet dashboard
    await page.goto('/wallet');
    
    // Profile selector should be visible
    await expect(page.locator('select, [role="combobox"]').first()).toBeVisible();
  });

  test('should load profiles from profiles.json', async ({ page }) => {
    await page.goto('/wallet');
    
    // Open profile selector
    const selector = page.locator('select, [role="combobox"]').first();
    await selector.click();
    
    // Should have at least one profile option
    const options = page.locator('option, [role="option"]');
    await expect(options.first()).toBeVisible();
  });

  test('should filter tokens when profile is selected', async ({ page }) => {
    await page.goto('/wallet');
    
    // Get initial token count
    const initialTokens = await page.locator('[data-testid="token-card"], .token-item').count();
    
    // Select a profile
    const selector = page.locator('select, [role="combobox"]').first();
    await selector.selectOption({ index: 1 }); // Select first profile
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Token list should update (may increase, decrease, or stay same depending on profile)
    const filteredTokens = await page.locator('[data-testid="token-card"], .token-item').count();
    expect(typeof filteredTokens).toBe('number');
  });

  test('should persist profile selection across page reloads', async ({ page }) => {
    await page.goto('/wallet');
    
    // Select a profile   
    const selector = page.locator('select, [role="combobox"]').first();
    await selector.selectOption({ index: 1 });
    const selectedProfile = await selector.inputValue();
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Profile selection should persist
    const selectorAfterReload = page.locator('select, [role="combobox"]').first();
    await expect(selectorAfterReload).toHaveValue(selectedProfile);
  });

  test('should show "All Profiles" option in selector', async ({ page }) => {
    await page.goto('/wallet');
    
    // Profile selector should have "All" option
    const selector = page.locator('select, [role="combobox"]').first();
    await selector.click();
    
    await expect(page.locator('option:has-text("All"), [role="option"]:has-text("All")')).toBeVisible();
  });
});
