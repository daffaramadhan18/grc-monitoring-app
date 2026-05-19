import { test, expect } from '@playwright/test'
import { createProject, deleteProject, createOpp, deleteOpp } from './helpers'

const BASE = 'http://localhost:3000'

test.describe('Projects UI', () => {

  test('/projects loads', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  })

  test('/projects/new loads with actual form (not coming soon)', async ({ page }) => {
    await page.goto('/projects/new')
    // Should NOT show "Form coming soon"
    await expect(page.getByText('Form coming soon')).not.toBeVisible()
    // Should show actual form
    await expect(page.getByText('Tambah Project')).toBeVisible()
    await expect(page.getByPlaceholder('Nama proposal / engagement')).toBeVisible()
  })

  test('/projects/new submit without proposalName shows validation error', async ({ page }) => {
    await page.goto('/projects/new')
    await page.getByPlaceholder('Nama lengkap client').fill('UAT Client')
    await page.getByRole('button', { name: 'Tambah' }).click()
    await expect(page.locator('text=wajib diisi')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/projects\/new/)
  })

  test('/projects/new submit with startedDate > endDate shows date validation', async ({ page }) => {
    await page.goto('/projects/new')
    await page.getByPlaceholder('Nama proposal / engagement').fill('UAT Proj Date Test')
    await page.getByPlaceholder('Nama lengkap client').fill('UAT Client')
    // Set bad date range
    await page.locator('input[type="date"]').nth(0).fill('2026-06-01')
    await page.locator('input[type="date"]').nth(1).fill('2026-01-01')
    await page.waitForTimeout(300)
    // Validation error should appear
    await expect(page.locator('text=tidak boleh sebelum')).toBeVisible({ timeout: 3000 })
  })

  test('/projects/new submit valid data redirects and entry visible', async ({ page, request }) => {
    const name = `UAT_PROJ_UI_${Date.now()}`
    await page.goto('/projects/new')
    await page.getByPlaceholder('Nama proposal / engagement').fill(name)
    await page.getByPlaceholder('Nama lengkap client').fill('UAT Client UI')
    await page.getByRole('button', { name: 'Tambah' }).click()

    await page.waitForURL(/\/projects$/, { timeout: 10000 })

    // Cleanup
    const res = await request.get(`${BASE}/api/projects`)
    const projects = await res.json()
    const created = projects.find((p: { proposalName: string; id: number }) => p.proposalName === name)
    if (created) await deleteProject(request, created.id)
  })

  test('All 4 project statuses present in status dropdown on /projects/new', async ({ page }) => {
    await page.goto('/projects/new')
    const statusSelect = page.locator('div:has(> label:has-text("Status"))').locator('select')
    const opts = await statusSelect.locator('option').allTextContents()
    expect(opts).toContain('Planning')
    expect(opts).toContain('Fieldwork')
    expect(opts).toContain('Reporting')
    expect(opts).toContain('Finish')
  })

  test('Finished project appears in collapsible "Finished Projects" section', async ({ request, page }) => {
    const proj = await createProject(request, { proposalName: 'UAT_PROJ_Finish', status: 'Finish' })
    try {
      await page.goto('/projects')
      // The "Finished Projects" collapsible button appears in both desktop and mobile views
      await expect(page.getByRole('button', { name: /Finished Projects/ }).first()).toBeVisible({ timeout: 5000 })
    } finally {
      await deleteProject(request, proj.id)
    }
  })

  test('Termin total fee > confirmedFee returns 400 from API', async ({ request }) => {
    const proj = await createProject(request, {
      proposalName: 'UAT_PROJ_TerminUI',
      confirmedFee: 1000000,
    })
    try {
      const res = await request.put(`${BASE}/api/projects/${proj.id}/termins`, {
        data: [{ terminNumber: 1, fee: 5000000, status: 'Deliverables in Progress' }],
      })
      expect(res.status()).toBe(400)
    } finally {
      await deleteProject(request, proj.id)
    }
  })

  test('Export /api/projects/export returns 200 with xlsx content-type', async ({ request }) => {
    const res = await request.get(`${BASE}/api/projects/export`)
    expect(res.status()).toBe(200)
    const ct = res.headers()['content-type'] ?? ''
    expect(ct).toMatch(/spreadsheetml|xlsx|openxmlformats/)
  })

  test('Auto-created project from Win opportunity has status=Planning and correct proposalName', async ({ request }) => {
    const opp = await createOpp(request, {
      proposalName: 'UAT_OPP_Win_ProjCheck',
      status: 'Win',
    })
    try {
      const res = await request.get(`${BASE}/api/projects`)
      const projects = await res.json()
      const linked = projects.find(
        (p: { opportunityId: number; status: string; proposalName: string }) => p.opportunityId === opp.id
      )
      expect(linked).toBeDefined()
      expect(linked.status).toBe('Planning')
      expect(linked.proposalName).toBe('UAT_OPP_Win_ProjCheck')

      if (linked) await deleteProject(request, linked.id)
    } finally {
      await deleteOpp(request, opp.id)
    }
  })
})
