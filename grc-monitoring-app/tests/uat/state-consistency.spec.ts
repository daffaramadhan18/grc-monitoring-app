import { test, expect } from '@playwright/test'
import { createOpp, deleteOpp, createProject, deleteProject } from './helpers'

const BASE = 'http://localhost:3000'

test.describe('State Consistency', () => {

  test('Create opportunity with status=Win → /projects shows auto-created project', async ({ request, page }) => {
    const opp = await createOpp(request, { proposalName: 'UAT_STATE_Win', status: 'Win' })

    const projRes = await request.get(`${BASE}/api/projects`)
    const projects = await projRes.json()
    const linked = projects.find((p: { opportunityId: number }) => p.opportunityId === opp.id)

    try {
      expect(linked).toBeDefined()
      await page.goto('/projects')
      await page.waitForLoadState('networkidle')
      // Project name appears in both desktop table cell and mobile card — use first()
      await expect(page.getByText('UAT_STATE_Win').first()).toBeVisible({ timeout: 8000 })
    } finally {
      if (linked) await deleteProject(request, linked.id)
      await deleteOpp(request, opp.id)
    }
  })

  test('Edit opportunity proposalName → /opportunities list reflects updated name', async ({ request, page }) => {
    const opp = await createOpp(request, { proposalName: 'UAT_STATE_EditBefore' })
    const newName = `UAT_STATE_EditAfter_${Date.now()}`

    try {
      await request.put(`${BASE}/api/opportunities/${opp.id}`, {
        data: { proposalName: newName, clientName: opp.clientName as string, status: opp.status as string },
      })
      await page.goto('/opportunities')
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(newName).first()).toBeVisible({ timeout: 8000 })
    } finally {
      await deleteOpp(request, opp.id)
    }
  })

  test('Delete project → project no longer visible in /projects', async ({ request, page }) => {
    // Use a unique name with timestamp to avoid collisions with leftover test data
    const uniqueName = `UAT_STATE_DelProj_${Date.now()}`
    const proj = await createProject(request, { proposalName: uniqueName, status: 'Planning' })

    // Verify it's visible first
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 8000 })

    // Delete via API
    await deleteProject(request, proj.id)

    // Reload and verify it's gone
    await page.reload()
    await page.waitForLoadState('networkidle')
    // All elements with this unique name should now be gone
    await expect(page.getByText(uniqueName).first()).not.toBeVisible({ timeout: 5000 })
  })

  test('Add Paid termin → project detail shows paid count', async ({ request, page }) => {
    const proj = await createProject(request, {
      proposalName: 'UAT_STATE_Termin',
      confirmedFee: 10000000,
    })

    try {
      // Add termin with Paid status
      await request.put(`${BASE}/api/projects/${proj.id}/termins`, {
        data: [{ terminNumber: 1, fee: 5000000, status: 'Paid' }],
      })

      // Navigate to projects page — it shows paid count
      await page.goto('/projects')
      await page.waitForLoadState('networkidle')
      // The project row shows "{paid}/{total} paid"
      await expect(page.getByText(/1\/1 paid/).first()).toBeVisible({ timeout: 8000 })
    } finally {
      await deleteProject(request, proj.id)
    }
  })

  test('Change project status Fieldwork → Finish → appears in Finished section', async ({ request, page }) => {
    const proj = await createProject(request, {
      proposalName: 'UAT_STATE_StatusChange',
      status: 'Fieldwork',
    })

    try {
      // Change to Finish via API
      await request.put(`${BASE}/api/projects/${proj.id}`, {
        data: { proposalName: proj.proposalName as string, status: 'Finish' },
      })

      await page.goto('/projects')
      await page.waitForLoadState('networkidle')

      // Should appear in "Finished Projects" collapsible section
      await expect(page.getByRole('button', { name: /Finished Projects/ }).first()).toBeVisible({ timeout: 8000 })

      // Open the collapsible
      await page.getByRole('button', { name: /Finished Projects/ }).first().click()
      await page.waitForTimeout(500)
      await expect(page.getByText('UAT_STATE_StatusChange').first()).toBeVisible({ timeout: 5000 })
    } finally {
      await deleteProject(request, proj.id)
    }
  })

  test('Dashboard ongoing count decreases after deleting Fieldwork project', async ({ request, page }) => {
    const proj = await createProject(request, {
      proposalName: 'UAT_STATE_DashCount',
      status: 'Fieldwork',
    })

    try {
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1200) // wait for animations

      const ongoingCard = page.locator('div.relative').filter({ has: page.getByText('Ongoing Projects') }).first()
      const before = parseInt(await ongoingCard.locator('.text-2xl').textContent() ?? '0', 10)

      // Delete the project
      await deleteProject(request, proj.id)

      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1200)

      const after = parseInt(await ongoingCard.locator('.text-2xl').textContent() ?? '0', 10)
      expect(after).toBeLessThan(before)
    } catch {
      await deleteProject(request, proj.id).catch(() => {})
      throw new Error('Dashboard count test failed')
    }
  })
})
