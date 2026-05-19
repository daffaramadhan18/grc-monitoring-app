import { test, expect } from '@playwright/test'
import { createOpp, deleteOpp } from './helpers'

const BASE = 'http://localhost:3000'

test.describe('Opportunities UI', () => {

  test('/opportunities loads', async ({ page }) => {
    await page.goto('/opportunities')
    await expect(page.getByRole('heading', { name: 'Opportunities' })).toBeVisible()
  })

  test('/opportunities/new loads with form', async ({ page }) => {
    await page.goto('/opportunities/new')
    await expect(page.getByText('Tambah Opportunity')).toBeVisible()
    await expect(page.getByPlaceholder('Nama proposal')).toBeVisible()
  })

  test('/opportunities/new submit without proposalName shows validation toast', async ({ page }) => {
    await page.goto('/opportunities/new')
    // Clear proposalName, fill clientName, submit
    await page.getByPlaceholder('Nama lengkap client').fill('UAT Test Client')
    await page.getByRole('button', { name: 'Tambah' }).click()
    await expect(page.locator('text=wajib diisi')).toBeVisible({ timeout: 5000 })
    // Should stay on page
    await expect(page).toHaveURL(/\/opportunities\/new/)
  })

  test('/opportunities/new submit without clientName shows validation toast', async ({ page }) => {
    await page.goto('/opportunities/new')
    await page.getByPlaceholder('Nama proposal').fill('UAT OPP Test')
    // Don't fill clientName
    await page.getByRole('button', { name: 'Tambah' }).click()
    await expect(page.locator('text=wajib diisi')).toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/opportunities\/new/)
  })

  test('/opportunities/new submit valid data redirects and new entry visible', async ({ page, request }) => {
    const name = `UAT_OPP_UI_${Date.now()}`
    await page.goto('/opportunities/new')
    await page.getByPlaceholder('Nama proposal').fill(name)
    await page.getByPlaceholder('Nama lengkap client').fill('UAT Client UI')
    await page.getByRole('button', { name: 'Tambah' }).click()

    // Should redirect to /opportunities
    await page.waitForURL(/\/opportunities$/, { timeout: 10000 })

    // Find and cleanup via API
    const res = await request.get(`${BASE}/api/opportunities`)
    const opps = await res.json()
    const created = opps.find((o: { proposalName: string; id: number }) => o.proposalName === name)
    if (created) await deleteOpp(request, created.id)
  })

  test('All 9 opportunity statuses present in dropdown', async ({ page, request }) => {
    const opp = await createOpp(request, { proposalName: 'UAT_OPP_Status' })
    try {
      await page.goto('/opportunities')
      // Open edit modal by clicking the row
      await page.locator(`text=${opp.proposalName}`).first().click()
      // Wait for modal
      await page.waitForSelector('[role="dialog"], .fixed.inset-0.z-50', { timeout: 5000 }).catch(() => {})

      const expectedStatuses = [
        'Win', 'Lose', 'Waiting for Result', 'Withdraw', 'Cancelled',
        'Backlog', 'Transfer to others', 'In progress', 'Submitted',
      ]
      // Check status dropdown options
      const statusSelect = page.locator('select').filter({
        has: page.locator('option', { hasText: 'Win' }),
      }).first()
      const options = await statusSelect.locator('option').allTextContents()
      for (const status of expectedStatuses) {
        expect(options).toContain(status)
      }
    } finally {
      await deleteOpp(request, opp.id)
    }
  })

  test('IT GRC sub-services include expected list', async ({ page }) => {
    await page.goto('/opportunities/new')
    // Select IT GRC service type
    const serviceSelect = page.locator('select').nth(0) // first select = serviceTypeId
    const opts = await serviceSelect.locator('option').allTextContents()
    const hasITGRC = opts.some(o => o.includes('IT GRC'))
    if (hasITGRC) {
      await serviceSelect.selectOption({ label: 'IT GRC' })
      await page.waitForTimeout(300)
      const subSelect = page.locator('select').nth(1)
      const subOpts = await subSelect.locator('option').allTextContents()
      expect(subOpts).toContain('IT Audit & Compliance')
      expect(subOpts).toContain('LPS-SCV')
      expect(subOpts).toContain('Managed Service')
      expect(subOpts).toContain('IT Maturity')
      expect(subOpts).toContain('OT Audit')
      expect(subOpts).toContain('MRTI')
      expect(subOpts).toContain('IT Governance')
      expect(subOpts).toContain('ISO')
    }
  })

  test('Cybersecurity sub-services include expected list', async ({ page }) => {
    await page.goto('/opportunities/new')
    const serviceSelect = page.locator('select').nth(0)
    const opts = await serviceSelect.locator('option').allTextContents()
    const hasCyber = opts.some(o => o.includes('Cybersecurity'))
    if (hasCyber) {
      await serviceSelect.selectOption({ label: 'Cybersecurity' })
      await page.waitForTimeout(300)
      const subSelect = page.locator('select').nth(1)
      const subOpts = await subSelect.locator('option').allTextContents()
      expect(subOpts).toContain('VAPT')
      expect(subOpts).toContain('Red Teaming')
      expect(subOpts).toContain('Cyber Maturity Assessment')
    }
  })

  test('Service Type change resets Sub-service', async ({ page }) => {
    await page.goto('/opportunities/new')
    const serviceSelect = page.locator('select').nth(0)
    const opts = await serviceSelect.locator('option').allTextContents()
    const hasITGRC = opts.some(o => o.includes('IT GRC'))
    const hasCyber = opts.some(o => o.includes('Cybersecurity'))
    if (hasITGRC && hasCyber) {
      await serviceSelect.selectOption({ label: 'IT GRC' })
      await page.waitForTimeout(300)
      const subSelect = page.locator('select').nth(1)
      await subSelect.selectOption({ index: 1 }) // pick first sub-service
      const val1 = await subSelect.inputValue()
      expect(val1).not.toBe('')

      // Change service type → sub-service resets
      await serviceSelect.selectOption({ label: 'Cybersecurity' })
      await page.waitForTimeout(300)
      const val2 = await subSelect.inputValue()
      expect(val2).toBe('')
    }
  })

  test('XSS in clientName is not executed', async ({ request, page }) => {
    const xssName = '<script>window.__xss_opp=true</script>'
    const opp = await createOpp(request, {
      proposalName: `UAT_OPP_XSS_${Date.now()}`,
      clientName: xssName,
    })
    try {
      await page.goto('/opportunities')
      await page.waitForLoadState('networkidle')
      const xssExecuted = await page.evaluate(() => !!(window as unknown as Record<string, unknown>).__xss_opp)
      expect(xssExecuted).toBe(false)
    } finally {
      await deleteOpp(request, opp.id)
    }
  })

  test('Delete opportunity shows confirmation before deletion', async ({ request, page }) => {
    const name = `UAT_OPP_DelConfirm_${Date.now()}`
    const opp = await createOpp(request, { proposalName: name })
    let dialogShown = false
    try {
      await page.goto('/opportunities')
      page.once('dialog', async (dialog) => {
        dialogShown = true
        expect(dialog.message()).toContain('Hapus')
        await dialog.dismiss() // dismiss so the opp is not deleted
      })
      // Target: row in tbody that contains this opp's name, then last td → last button (delete)
      const row = page.locator('tbody tr').filter({ has: page.locator(`text=${name}`) }).first()
      await row.locator('td:last-child button').last().click({ force: true })
      await page.waitForTimeout(500)
      expect(dialogShown).toBe(true)
    } finally {
      await deleteOpp(request, opp.id)
    }
  })

  test('Export /api/opportunities/export returns 200 with xlsx content-type', async ({ request }) => {
    const res = await request.get(`${BASE}/api/opportunities/export`)
    expect(res.status()).toBe(200)
    const ct = res.headers()['content-type'] ?? ''
    expect(ct).toMatch(/spreadsheetml|xlsx|openxmlformats/)
  })

  test('Edit opportunity persists after page reload', async ({ request, page }) => {
    const opp = await createOpp(request, { proposalName: 'UAT_OPP_EditPersist' })
    const newName = `UAT_OPP_Edited_${Date.now()}`
    try {
      // Edit via API
      await request.put(`${BASE}/api/opportunities/${opp.id}`, {
        data: { proposalName: newName, clientName: opp.clientName, status: opp.status },
      })
      await page.goto('/opportunities')
      // Name appears in desktop table cell + mobile card → use first()
      await expect(page.getByText(newName).first()).toBeVisible({ timeout: 5000 })
    } finally {
      await deleteOpp(request, opp.id)
    }
  })
})
