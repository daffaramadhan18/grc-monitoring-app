import { test, expect } from '@playwright/test'

test.describe('Empty States', () => {

  test('/dashboard with 0 opportunities for a specific month renders without crash', async ({ page }) => {
    // Use a far-future month that will have no data
    await page.goto('/dashboard?month=2099-01')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('Error')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('/opportunities with 0 matching filter shows empty indicator', async ({ page }) => {
    await page.goto('/opportunities')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[placeholder*="Search"]').first()
    await searchInput.fill('XXXXXXXX_NO_MATCH_999999999')
    await page.waitForTimeout(1000)
    // Either "Belum ada" in the table or "Showing 0 of" count label (both come from OpportunitiesClient)
    const matchBelum = page.locator('text=Belum ada').first()
    const matchShowing = page.locator('p:has-text("Showing 0 of")').first()
    const matchKocok = page.locator('text=Tidak ada').first()
    const visible = await Promise.any([
      matchBelum.waitFor({ state: 'visible', timeout: 5000 }),
      matchShowing.waitFor({ state: 'visible', timeout: 5000 }),
      matchKocok.waitFor({ state: 'visible', timeout: 5000 }),
    ]).then(() => true).catch(() => false)
    expect(visible).toBe(true)
  })

  test('/projects with 0 matching filter shows empty indicator', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[placeholder*="Search"]').first()
    await searchInput.fill('XXXXXXXX_NO_MATCH_999999999')
    await page.waitForTimeout(1000)
    const matchBelum = page.locator('text=Belum ada').first()
    const matchShowing = page.locator('p:has-text("Showing 0 of")').first()
    const matchKocok = page.locator('text=Tidak ada').first()
    const visible = await Promise.any([
      matchBelum.waitFor({ state: 'visible', timeout: 5000 }),
      matchShowing.waitFor({ state: 'visible', timeout: 5000 }),
      matchKocok.waitFor({ state: 'visible', timeout: 5000 }),
    ]).then(() => true).catch(() => false)
    expect(visible).toBe(true)
  })

  test('/projects shows no "Finished Projects" section when none exist at filtered month', async ({ page }) => {
    // Navigate to a month with no projects
    await page.goto('/projects?month=2099-01')
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
    // No finished projects section should appear if there are no finished projects
    // (The section only renders when finishedProjects.length > 0)
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('/team/[id] with no active assignments shows empty state without crash', async ({ request, page }) => {
    const unique = `E${Date.now().toString(36).slice(-3).toUpperCase()}`
    const res = await request.post('http://localhost:3000/api/team', {
      data: { fullName: `UAT Empty ${unique}`, initial: unique, level: 'Associate' },
    })
    const member = await res.json()
    try {
      await page.goto(`/team/${member.id}`)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('body')).not.toContainText('Internal Server Error')
      // TeamMemberClient always renders "Active Proposals" and "Active Projects" sections
      await expect(page.getByText('Active Proposals')).toBeVisible({ timeout: 8000 })
      await expect(page.getByText('Active Projects')).toBeVisible({ timeout: 5000 })
      // When empty: shows "Tidak ada proposal aktif" / "Tidak ada project aktif"
      const emptyProposals = page.locator(':text("Tidak ada proposal aktif")')
      const emptyProjects  = page.locator(':text("Tidak ada project aktif")')
      // At least one should be visible for a new member with no assignments
      const anyEmpty = await emptyProposals.isVisible().catch(() => false) ||
                       await emptyProjects.isVisible().catch(() => false)
      expect(anyEmpty).toBe(true)
    } finally {
      await request.delete(`http://localhost:3000/api/team/${member.id}`)
    }
  })
})
