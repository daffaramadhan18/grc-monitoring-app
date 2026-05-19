import type { APIRequestContext } from '@playwright/test'

const BASE = 'http://localhost:3000'

export async function createOpp(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
): Promise<{ id: number } & Record<string, unknown>> {
  const res = await request.post(`${BASE}/api/opportunities`, {
    data: {
      proposalName: 'UAT_OPP_Default',
      clientName:   'UAT Client',
      status:       'In progress',
      ...overrides,
    },
  })
  if (!res.ok()) throw new Error(`createOpp failed: ${res.status()} ${await res.text()}`)
  return res.json()
}

export async function deleteOpp(request: APIRequestContext, id: number) {
  await request.delete(`${BASE}/api/opportunities/${id}`).catch(() => {})
}

export async function createProject(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
): Promise<{ id: number } & Record<string, unknown>> {
  const res = await request.post(`${BASE}/api/projects`, {
    data: {
      proposalName: 'UAT_PROJ_Default',
      clientName:   'UAT Client',
      status:       'Planning',
      ...overrides,
    },
  })
  if (!res.ok()) throw new Error(`createProject failed: ${res.status()} ${await res.text()}`)
  return res.json()
}

export async function deleteProject(request: APIRequestContext, id: number) {
  await request.delete(`${BASE}/api/projects/${id}`).catch(() => {})
}

export async function createTeamMember(
  request: APIRequestContext,
  overrides: Record<string, unknown> = {}
): Promise<{ id: number; initial: string } & Record<string, unknown>> {
  const unique = Date.now().toString(36).toUpperCase().slice(-3)
  const res = await request.post(`${BASE}/api/team`, {
    data: {
      fullName: `UAT Member ${unique}`,
      initial:  `U${unique}`,
      level:    'Associate',
      ...overrides,
    },
  })
  if (!res.ok()) throw new Error(`createTeamMember failed: ${res.status()} ${await res.text()}`)
  return res.json()
}

export async function deleteTeamMember(request: APIRequestContext, id: number) {
  await request.delete(`${BASE}/api/team/${id}`).catch(() => {})
}
