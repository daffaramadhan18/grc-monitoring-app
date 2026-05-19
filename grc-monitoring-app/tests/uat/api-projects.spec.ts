import { test, expect } from '@playwright/test'
import { createProject, deleteProject } from './helpers'

const BASE = 'http://localhost:3000'

test.describe('API: Projects', () => {

  test('GET /api/projects returns 200 with array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/projects`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('POST without proposalName returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/projects`, {
      data: { clientName: 'UAT Client', status: 'Planning' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST with valid data returns 201', async ({ request }) => {
    const proj = await createProject(request, { proposalName: 'UAT_PROJ_Valid' })
    expect(proj.id).toBeDefined()
    expect(proj.proposalName).toBe('UAT_PROJ_Valid')
    await deleteProject(request, proj.id)
  })

  test('POST with negative confirmedFee returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/projects`, {
      data: { proposalName: 'UAT_PROJ_NegFee', clientName: 'UAT', confirmedFee: -500 },
    })
    expect(res.status()).toBe(400)
  })

  test('POST with startedDate > endDate returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/projects`, {
      data: {
        proposalName: 'UAT_PROJ_BadDate',
        clientName: 'UAT',
        startedDate: '2026-06-01',
        endDate: '2026-01-01',
      },
    })
    expect(res.status()).toBe(400)
  })

  test('GET /api/projects/99999999 returns 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/projects/99999999`)
    expect(res.status()).toBe(404)
  })

  test('DELETE /api/projects/99999999 returns 404 not 500', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/projects/99999999`)
    expect(res.status()).toBe(404)
  })

  test('PUT /api/projects/99999999 returns 404 not 500', async ({ request }) => {
    const res = await request.put(`${BASE}/api/projects/99999999`, {
      data: { proposalName: 'Ghost', status: 'Planning' },
    })
    expect(res.status()).toBe(404)
  })

  test('PATCH /api/projects/batch with invalid id collects failures not 500', async ({ request }) => {
    const proj = await createProject(request, { proposalName: 'UAT_PROJ_Batch' })

    try {
      const res = await request.patch(`${BASE}/api/projects/batch`, {
        data: {
          updates: [
            { id: proj.id, status: 'Fieldwork' },
            { id: 99999999, status: 'Planning' },
          ],
        },
      })
      expect(res.status()).not.toBe(500)
      const body = await res.json()
      expect(body.updated).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(body.failed)).toBe(true)
    } finally {
      await deleteProject(request, proj.id)
    }
  })

  test('DELETE project cascades to termins', async ({ request }) => {
    const proj = await createProject(request, {
      proposalName: 'UAT_PROJ_Cascade',
      confirmedFee: 10000000,
    })

    // Add a termin
    await request.put(`${BASE}/api/projects/${proj.id}/termins`, {
      data: [{ terminNumber: 1, percentage: 50, fee: 5000000, status: 'Deliverables in Progress' }],
    })

    // Delete project
    await request.delete(`${BASE}/api/projects/${proj.id}`)

    // Verify project is gone
    const getRes = await request.get(`${BASE}/api/projects/${proj.id}`)
    expect(getRes.status()).toBe(404)
  })

  test('PUT termins with total fee > confirmedFee returns 400', async ({ request }) => {
    const proj = await createProject(request, {
      proposalName: 'UAT_PROJ_TerminCap',
      confirmedFee: 1000000,
    })

    try {
      const res = await request.put(`${BASE}/api/projects/${proj.id}/termins`, {
        data: [{ terminNumber: 1, fee: 2000000, status: 'Deliverables in Progress' }],
      })
      expect(res.status()).toBe(400)
    } finally {
      await deleteProject(request, proj.id)
    }
  })
})
