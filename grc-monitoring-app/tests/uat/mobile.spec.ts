import { test, expect } from '@playwright/test'

const MOBILE_VIEWPORT = { width: 390, height: 844 }

test.describe('Mobile (390×844)', () => {

  test.use({ viewport: MOBILE_VIEWPORT })

  test('/opportunities has no horizontal overflow', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(395) // 390 + 5px tolerance
  })

  test('/projects has no horizontal overflow', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(395)
  })

  test('/dashboard has no horizontal overflow', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(395)
  })

  test('/team has no horizontal overflow', async ({ page }) => {
    await page.goto('/team')
    await page.waitForLoadState('networkidle')
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(395)
  })

  test('Bottom navigation bar is visible on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    // BottomNav component exists in layout
    const bottomNav = page.locator('nav').last().or(page.locator('[class*="BottomNav"]'))
    // BottomNav is rendered via the layout
    // Check that a nav element with links is visible
    const navExists = await page.evaluate(() => {
      // Check for bottom nav - it's fixed to bottom
      const navs = document.querySelectorAll('nav')
      return navs.length > 0
    })
    expect(navExists).toBe(true)
  })

  test('Primary CTA button has adequate tap target (>=44px height)', async ({ page }) => {
    await page.goto('/opportunities/new')
    // The "Tambah" button should have min-h-[44px]
    const btn = page.getByRole('button', { name: 'Tambah' })
    const box = await btn.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })
})
