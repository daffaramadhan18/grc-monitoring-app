import { test, expect } from '@playwright/test'
import { createTeamMember, deleteTeamMember, createProject, deleteProject, createOpp, deleteOpp } from './helpers'

const BASE = 'http://localhost:3000'

test.describe('API: Team', () => {

  test('GET /api/team returns 200 with array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/team`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('POST without required fields returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/team`, {
      data: { fullName: 'Incomplete' },
    })
    expect(res.status()).toBe(400)
  })

  test('POST with duplicate initial returns 409', async ({ request }) => {
    const member = await createTeamMember(request)
    try {
      const res = await request.post(`${BASE}/api/team`, {
        data: { fullName: 'Duplicate', initial: member.initial, level: 'Associate' },
      })
      expect(res.status()).toBe(409)
    } finally {
      await deleteTeamMember(request, member.id)
    }
  })

  test('POST with lowercase initial stores as uppercase', async ({ request }) => {
    const unique = `z${Date.now().toString(36).slice(-2)}`
    const res = await request.post(`${BASE}/api/team`, {
      data: { fullName: `UAT Lower ${unique}`, initial: unique.toLowerCase(), level: 'Associate' },
    })
    expect(res.status()).toBe(201)
    const member = await res.json()
    try {
      expect(member.initial).toBe(unique.toUpperCase())
    } finally {
      await deleteTeamMember(request, member.id)
    }
  })

  test('GET /api/team/[id] for existing member returns 200 with data', async ({ request }) => {
    const member = await createTeamMember(request)
    try {
      const res = await request.get(`${BASE}/api/team/${member.id}`)
      expect(res.status()).toBe(200)
      const data = await res.json()
      expect(data.id).toBe(member.id)
      expect(data.initial).toBe(member.initial)
    } finally {
      await deleteTeamMember(request, member.id)
    }
  })

  test('GET /api/team/99999999 returns 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/team/99999999`)
    expect(res.status()).toBe(404)
  })

  test('PUT /api/team/[id] with duplicate initial returns 409', async ({ request }) => {
    const m1 = await createTeamMember(request)
    const m2 = await createTeamMember(request)
    try {
      const res = await request.put(`${BASE}/api/team/${m2.id}`, {
        data: { fullName: m2.fullName, initial: m1.initial, level: 'Associate' },
      })
      expect(res.status()).toBe(409)
    } finally {
      await deleteTeamMember(request, m1.id)
      await deleteTeamMember(request, m2.id)
    }
  })

  test('DELETE team member assigned to active project returns 409', async ({ request }) => {
    const member = await createTeamMember(request)
    const proj = await createProject(request, {
      proposalName: 'UAT_PROJ_AssignedDel',
      status: 'Fieldwork',
      micInitial: member.initial,
    })
    try {
      const res = await request.delete(`${BASE}/api/team/${member.id}`)
      expect(res.status()).toBe(409)
    } finally {
      // Must set project to a non-active status first for cleanup
      await request.put(`${BASE}/api/projects/${proj.id}`, {
        data: { proposalName: proj.proposalName, status: 'Finish' },
      })
      await deleteProject(request, proj.id)
      await deleteTeamMember(request, member.id)
    }
  })

  test('DELETE team member assigned to active opportunity returns 409', async ({ request }) => {
    const member = await createTeamMember(request)
    const opp = await createOpp(request, {
      proposalName: 'UAT_OPP_AssignedDel',
      status: 'In progress',
      micInitial: member.initial,
    })
    try {
      const res = await request.delete(`${BASE}/api/team/${member.id}`)
      expect(res.status()).toBe(409)
    } finally {
      // Set opportunity to non-active status for cleanup
      await request.put(`${BASE}/api/opportunities/${opp.id}`, {
        data: { proposalName: opp.proposalName, clientName: opp.clientName, status: 'Cancelled' },
      })
      await deleteOpp(request, opp.id)
      await deleteTeamMember(request, member.id)
    }
  })

  test('DELETE unassigned team member returns 204', async ({ request }) => {
    const member = await createTeamMember(request)
    const res = await request.delete(`${BASE}/api/team/${member.id}`)
    expect(res.status()).toBe(204)
  })
})
