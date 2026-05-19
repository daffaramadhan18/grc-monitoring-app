import { test, expect } from '@playwright/test'
import { createOpp, deleteOpp, createProject, deleteProject, createTeamMember, deleteTeamMember } from './helpers'

const BASE = 'http://localhost:3000'

test.describe('Security Basic', () => {

  test('XSS in opportunity clientName is not executed', async ({ request, page }) => {
    const opp = await createOpp(request, {
      proposalName: `UAT_SEC_XSS_OPP_${Date.now()}`,
      clientName: '<script>window.__xss_sec1=true</script>',
    })
    try {
      await page.goto('/opportunities')
      await page.waitForLoadState('networkidle')
      const xss = await page.evaluate(() =>
        !!(window as unknown as Record<string, unknown>).__xss_sec1
      )
      expect(xss).toBe(false)
    } finally {
      await deleteOpp(request, opp.id)
    }
  })

  test('XSS in project proposalName is not executed', async ({ request, page }) => {
    const proj = await createProject(request, {
      proposalName: '<script>window.__xss_sec2=true</script>',
      clientName: 'UAT',
    })
    try {
      await page.goto('/projects')
      await page.waitForLoadState('networkidle')
      const xss = await page.evaluate(() =>
        !!(window as unknown as Record<string, unknown>).__xss_sec2
      )
      expect(xss).toBe(false)
    } finally {
      await deleteProject(request, proj.id)
    }
  })

  test('XSS in team fullName is not executed', async ({ request, page }) => {
    const unique = `S${Date.now().toString(36).slice(-3).toUpperCase()}`
    const res = await request.post(`${BASE}/api/team`, {
      data: {
        fullName: '<script>window.__xss_sec3=true</script>',
        initial: unique,
        level: 'Associate',
      },
    })
    const member = await res.json()
    try {
      await page.goto('/team')
      await page.waitForLoadState('networkidle')
      const xss = await page.evaluate(() =>
        !!(window as unknown as Record<string, unknown>).__xss_sec3
      )
      expect(xss).toBe(false)
    } finally {
      await deleteTeamMember(request, member.id)
    }
  })

  test('SQL injection in ?month param does not crash /dashboard', async ({ page }) => {
    // monthRange() validates with regex — invalid input returns null (no filter applied)
    // URL-encode the injection string so Playwright navigates correctly
    const injection = encodeURIComponent("2026-01' OR '1'='1;--")
    await page.goto(`/dashboard?month=${injection}`)
    // Page should still load with Dashboard heading
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('Massive payload (10000 char proposalName) is not a 500', async ({ request }) => {
    const bigName = 'A'.repeat(10000)
    const res = await request.post(`${BASE}/api/opportunities`, {
      data: { proposalName: bigName, clientName: 'UAT', status: 'In progress' },
    })
    // Should be 201 (accepted) or 4xx (rejected) — NOT 500
    expect(res.status()).not.toBe(500)

    if (res.status() === 201) {
      const data = await res.json()
      await request.delete(`${BASE}/api/opportunities/${data.id}`)
    }
  })

  test('Security headers present on API response', async ({ request }) => {
    const res = await request.get(`${BASE}/api/opportunities`)
    const headers = res.headers()
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  })
})
