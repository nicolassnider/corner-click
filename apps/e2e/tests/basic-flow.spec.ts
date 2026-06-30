import { expect, test } from '@playwright/test'

test('apps should be running and accessible', async ({ page }) => {
  // Test Admin
  await page.goto('http://localhost:4322/')
  await expect(page).toHaveTitle(/Admin|Corner Click|Vite|Astro/i)

  // Test Judges
  const judgePage = await page.context().newPage()
  await judgePage.goto('http://localhost:4321/')
  await expect(judgePage).toHaveTitle(/Judge|Corner Click|Vite|Astro/i)

  // Test Analytics
  const analyticsPage = await page.context().newPage()
  await analyticsPage.goto('http://localhost:4323/')
  await expect(analyticsPage).toHaveTitle(/Analytics|Corner Click|Vite|Astro/i)
})
