import { test, expect } from '@playwright/test'
import { createOpp, deleteOpp, createProject, deleteProject } from './helpers'

const BASE = 'http://localhost:3000'

test.describe('API: Opportunities', () => {

  test('GET /api/opportunities returns 200 with array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/opportunities`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('POST without proposalName returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/opportunities`, {
      data: { clientName: 'Test Client', status: 'In progress' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST without clientName returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/opportunities`, {
      data: { proposalName: 'UAT_OPP_NoClient', status: 'In progress' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST with valid data returns 201 and persists', async ({ request }) => {
    const res = await request.post(`${BASE}/api/opportunities`, {
      data: { proposalName: 'UAT_OPP_Valid', clientName: 'UAT Client', status: 'In progress' },
    })
    expect(res.status()).toBe(201)
    const opp = await res.json()
    expect(opp.id).toBeDefined()
    expect(opp.proposalName).toBe('UAT_OPP_Valid')

    // Verify it persists
    const getRes = await request.get(`${BASE}/api/opportunities/${opp.id}`)
    expect(getRes.status()).toBe(200)
    const fetched = await getRes.json()
    expect(fetched.proposalName).toBe('UAT_OPP_Valid')

    await deleteOpp(request, opp.id)
  })

  test('POST with negative harga returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/opportunities`, {
      data: { proposalName: 'UAT_OPP_NegFee', clientName: 'UAT Client', harga: -1000 },
    })
    expect(res.status()).toBe(400)
  })

  test('POST with status=Win auto-creates linked project with status=Planning', async ({ request }) => {
    const opp = await createOpp(request, { proposalName: 'UAT_OPP_Win', status: 'Win' })

    try {
      const projRes = await request.get(`${BASE}/api/projects`)
      const projects = await projRes.json()
      const linked = projects.find((p: { opportunityId: number; status: string }) =>
        p.opportunityId === opp.id
      )
      expect(linked).toBeDefined()
      expect(linked.status).toBe('Planning')

      if (linked) await deleteProject(request, linked.id)
    } finally {
      await deleteOpp(request, opp.id)
    }
  })

  test('GET /api/opportunities/99999999 returns 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/opportunities/99999999`)
    expect(res.status()).toBe(404)
  })

  test('DELETE /api/opportunities/99999999 returns 404 not 500', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/opportunities/99999999`)
    expect(res.status()).toBe(404)
  })

  test('PUT /api/opportunities/99999999 returns 404 not 500', async ({ request }) => {
    const res = await request.put(`${BASE}/api/opportunities/99999999`, {
      data: { proposalName: 'Ghost', clientName: 'Ghost', status: 'In progress' },
    })
    expect(res.status()).toBe(404)
  })

  test('PATCH /api/opportunities/batch with invalid id collects failures not 500', async ({ request }) => {
    const opp = await createOpp(request, { proposalName: 'UAT_OPP_Batch' })

    try {
      const res = await request.patch(`${BASE}/api/opportunities/batch`, {
        data: {
          updates: [
            { id: opp.id, status: 'Backlog' },
            { id: 99999999, status: 'Win' }, // invalid id
          ],
        },
      })
      // Should not be 500
      expect(res.status()).not.toBe(500)
      const body = await res.json()
      expect(body.updated).toBeGreaterThanOrEqual(1)
      expect(Array.isArray(body.failed)).toBe(true)
      expect(body.failed.some((f: { id: number }) => f.id === 99999999)).toBe(true)
    } finally {
      await deleteOpp(request, opp.id)
    }
  })
})
