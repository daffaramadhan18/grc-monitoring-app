'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Settings2, Briefcase, FileText } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member { id: number; fullName: string; initial: string; level: string }
interface Alloc  { projects: number; proposals: number }

interface ProjectRow  { id: number; proposalName: string; status: string; endDate: string | null; clientInitial: string | null; clientName: string | null }
interface ProposalRow { id: number; proposalName: string; status: string; clientInitial: string | null }

interface Details {
  projects:  ProjectRow[]
  proposals: ProposalRow[]
}

interface Props {
  members:    Member[]
  allocation: Record<string, Alloc>
  details:    Record<string, Details>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVELS = [
  'Partner',
  'Senior Manager 3', 'Senior Manager 2', 'Senior Manager 1',
  'Manager 3', 'Manager 2', 'Manager 1',
  'Assistant Manager 3', 'Assistant Manager 2', 'Assistant Manager 1',
  'Senior Associate 3', 'Senior Associate 2', 'Senior Associate 1',
  'Associate',
  'Intern',
] as const

const AVATAR_COLORS = [
  'bg-[#009CDE]', 'bg-[#43B02A]', 'bg-[#58595B]', 'bg-[#F59E0B]', 'bg-[#8B5CF6]', 'bg-[#EC4899]',
]

function avatarColor(initial: string) {
  const hash = initial.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function Avatar({ initial, size = 'md' }: { initial: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-12 h-12 text-base'
            : size === 'sm' ? 'w-8 h-8 text-xs'
            : 'w-10 h-10 text-sm'
  return (
    <div className={`${cls} ${avatarColor(initial)} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
      {initial.slice(0, 2)}
    </div>
  )
}

// ─── Capacity ─────────────────────────────────────────────────────────────────

function totalLoadPct(projects: number, proposals: number) {
  return Math.round(((projects + proposals) / 2) * 100)
}

function barColor(pct: number) {
  if (pct > 100) return 'bg-red-500'
  if (pct >= 75)  return 'bg-amber-400'
  return 'bg-[#43B02A]'
}

function capacityBadge(projects: number, proposals: number) {
  const pct = totalLoadPct(projects, proposals)
  if (pct > 100)  return { label: 'Overloaded',  cls: 'bg-red-100 text-red-700',         order: 0 }
  if (pct === 100) return { label: 'At Capacity', cls: 'bg-amber-100 text-amber-700',     order: 1 }
  return              { label: 'Available',   cls: 'bg-[#43B02A]/15 text-[#2d7a1a]', order: 2 }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009CDE]'
const selectCls = inputCls

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PROJ_STATUS_CLS: Record<string, string> = {
  Fieldwork:  'bg-blue-100 text-blue-700',
  Reporting:  'bg-purple-100 text-purple-700',
  Planning:   'bg-gray-100 text-gray-600',
  Completed:  'bg-green-100 text-green-700',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamClient({ members: initial, allocation, details }: Props) {
  const router = useRouter()
  const [members, setMembers]   = useState<Member[]>(initial)

  // Manage Team drawer
  const [manageOpen, setManageOpen] = useState(false)

  // Add/Edit form modal
  const [crudOpen, setCrudOpen]   = useState(false)
  const [editing, setEditing]     = useState<Member | null>(null)
  const [form, setForm] = useState({ fullName: '', initial: '', level: '' })
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState<number | null>(null)

  // Member detail side panel
  const [detailMember, setDetailMember] = useState<Member | null>(null)

  function openNew() {
    setEditing(null)
    setForm({ fullName: '', initial: '', level: '' })
    setCrudOpen(true)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setForm({ fullName: m.fullName, initial: m.initial, level: m.level })
    setCrudOpen(true)
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.fullName || !form.initial || !form.level) return
    setSaving(true)
    try {
      const url    = editing ? `/api/team/${editing.id}` : '/api/team'
      const method = editing ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, initial: form.initial.toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      if (editing) {
        setMembers((prev) => prev.map((m) => m.id === data.id ? data : m))
      } else {
        setMembers((prev) => [...prev, data].sort((a, b) => a.fullName.localeCompare(b.fullName)))
      }
      setCrudOpen(false)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(member: Member) {
    if (!window.confirm(`Hapus ${member.fullName} (${member.initial})?`)) return
    setDeleting(member.id)
    try {
      const res = await fetch(`/api/team/${member.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? res.statusText)
      }
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setDeleting(null)
    }
  }

  const allocRows = members.map((m) => {
    const a     = allocation[m.initial] ?? { projects: 0, proposals: 0 }
    const total = a.projects + a.proposals
    const badge = capacityBadge(a.projects, a.proposals)
    return { member: m, ...a, total, badge }
  }).sort((a, b) => {
    if (a.badge.order !== b.badge.order) return a.badge.order - b.badge.order
    return b.total - a.total
  })

  const detailAlloc   = detailMember ? (allocation[detailMember.initial] ?? { projects: 0, proposals: 0 }) : null
  const detailData    = detailMember ? (details[detailMember.initial] ?? { projects: [], proposals: [] }) : null
  const detailBadge   = detailAlloc  ? capacityBadge(detailAlloc.projects, detailAlloc.proposals) : null

  return (
    <div className="rsm-page-in space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Team</h1>
        <button
          onClick={() => setManageOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings2 size={15} /> Manage Team
        </button>
      </div>

      {/* ── Resource Allocation Breakdown ────────────────────────────────── */}
      <div className="space-y-3">

        {/* Desktop header */}
        <div className="hidden md:block">
          <h2 className="text-base font-semibold text-gray-800">Resource Allocation Breakdown</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Load = (active projects + active proposals) / 2 × 100% · max capacity = 2 engagements
          </p>
        </div>
        {/* Mobile header */}
        <h2 className="md:hidden text-base font-semibold text-gray-800">Team Workload</h2>

        {/* Desktop list */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {allocRows.length === 0 && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              Belum ada data alokasi.
            </div>
          )}
          {allocRows.map(({ member, projects, proposals, badge }) => {
            const pct = totalLoadPct(projects, proposals)
            return (
              <button
                key={member.id}
                onClick={() => setDetailMember(member)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50/70 transition-colors text-left"
              >
                <Avatar initial={member.initial} size="sm" />

                <div className="min-w-0 w-44 shrink-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{member.fullName}</div>
                  <div className="text-xs text-gray-400 truncate">{member.level}</div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-semibold w-10 text-right shrink-0 ${pct > 100 ? 'text-red-500' : 'text-gray-700'}`}>{pct}%</span>
                  </div>
                  <p className="text-[10px] text-gray-400 whitespace-nowrap">{projects} project{projects !== 1 ? 's' : ''} · {proposals} proposal{proposals !== 1 ? 's' : ''}</p>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden px-0 space-y-2">
          {allocRows.length === 0 && (
            <p className="py-8 text-center text-gray-400 text-sm">Belum ada data alokasi.</p>
          )}
          {allocRows.map(({ member, projects, proposals, badge }) => {
            const pct = totalLoadPct(projects, proposals)
            return (
              <button
                key={member.id}
                onClick={() => setDetailMember(member)}
                className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-left active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <Avatar initial={member.initial} size="sm" />

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name + badge row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{member.fullName}</p>
                        <p className="text-xs text-gray-400 truncate">{member.level}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Progress bar + percentage */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColor(pct)}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold w-10 text-right shrink-0 ${pct > 100 ? 'text-red-500' : 'text-gray-700'}`}>
                        {pct}%
                      </span>
                    </div>

                    {/* Count */}
                    <p className="text-xs text-gray-400 whitespace-nowrap">
                      {projects} project{projects !== 1 ? 's' : ''} · {proposals} proposal{proposals !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

      </div>

      {/* ── Manage Team drawer ────────────────────────────────────────────── */}
      {manageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setManageOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-800">Manage Team</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={openNew}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rsm-btn-spring rsm-btn-primary-glow bg-[#009CDE] text-white text-sm font-medium rounded-lg hover:bg-[#007BB5] transition-colors"
                >
                  <Plus size={14} /> Add Member
                </button>
                <button onClick={() => setManageOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Member</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Initial</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Level</th>
                    <th className="px-4 py-3 text-gray-500 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-gray-400">
                        Belum ada team member.
                      </td>
                    </tr>
                  )}
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar initial={m.initial} />
                          <span className="font-medium text-gray-900">{m.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded font-mono text-xs font-semibold bg-slate-100 text-slate-700">
                          {m.initial}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.level}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(m)}
                            className="p-1.5 text-gray-400 hover:text-[#009CDE] hover:bg-[#009CDE]/10 rounded transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(m)} disabled={deleting === m.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit form modal ───────────────────────────────────────────── */}
      {crudOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCrudOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                {editing ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <button onClick={() => setCrudOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <Field label="Full Name" required>
                <input className={inputCls} value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)} required autoFocus />
              </Field>

              <Field label="Initial" required>
                <input className={inputCls} value={form.initial}
                  onChange={(e) => set('initial', e.target.value.toUpperCase().slice(0, 4))}
                  required maxLength={4} placeholder="e.g. DR" />
                <p className="text-xs text-gray-400 mt-1">Max 4 karakter, huruf kapital</p>
              </Field>

              <Field label="Level" required>
                <select className={selectCls} value={form.level}
                  onChange={(e) => set('level', e.target.value)} required>
                  <option value="">Pilih level...</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>

              {form.initial && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar initial={form.initial} />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{form.fullName || '—'}</div>
                    <div className="text-xs text-gray-400">{form.level || '—'}</div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setCrudOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-medium rsm-btn-spring rsm-btn-primary-glow bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors">
                  {saving ? 'Menyimpan...' : (editing ? 'Update' : 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Member detail side panel ──────────────────────────────────────── */}
      {detailMember && detailAlloc && detailData && detailBadge && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailMember(null)} />
          <div className="relative bg-white w-full max-w-sm h-full shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <Avatar initial={detailMember.initial} size="lg" />
                <div>
                  <div className="font-semibold text-gray-900">{detailMember.fullName}</div>
                  <div className="text-xs text-gray-400">{detailMember.level}</div>
                  <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${detailBadge.cls}`}>
                    {detailBadge.label}
                  </span>
                </div>
              </div>
              <button onClick={() => setDetailMember(null)} className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5">
                <X size={18} />
              </button>
            </div>

            {/* Load bar */}
            <div className="px-5 py-4 border-b border-gray-100 shrink-0 space-y-1">
              {(() => {
                const pct = totalLoadPct(detailAlloc.projects, detailAlloc.proposals)
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className={`text-xs font-semibold w-9 text-right shrink-0 ${pct > 100 ? 'text-red-500' : 'text-gray-700'}`}>
                        {pct}%
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {detailAlloc.projects} project{detailAlloc.projects !== 1 ? 's' : ''} · {detailAlloc.proposals} proposal{detailAlloc.proposals !== 1 ? 's' : ''}
                    </p>
                  </>
                )
              })()}
            </div>

            {/* View Details button */}
            <div className="px-5 py-3 border-b border-gray-100 shrink-0">
              <button
                onClick={() => router.push(`/team/${detailMember.id}`)}
                className="w-full px-4 py-2 text-sm font-medium text-[#009CDE] border border-[#009CDE] rounded-lg hover:bg-[#009CDE]/5 transition-colors"
              >
                View Details
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Active Projects */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase size={13} className="text-[#009CDE]" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Active Projects ({detailData.projects.length})
                  </span>
                </div>
                {detailData.projects.length === 0 ? (
                  <p className="text-xs text-gray-400">No active projects.</p>
                ) : (
                  <div className="space-y-2">
                    {detailData.projects.map((p) => (
                      <div key={p.id} className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1">
                        <div className="text-sm font-medium text-gray-900 leading-snug">{p.proposalName}</div>
                        <div className="text-xs text-gray-500">{p.clientName ?? ''}</div>
                        <div className="flex items-center gap-2 flex-wrap pt-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROJ_STATUS_CLS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status}
                          </span>
                          <span className="text-xs text-gray-400">Due {fmtDate(p.endDate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Proposals */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} className="text-[#43B02A]" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Active Proposals ({detailData.proposals.length})
                  </span>
                </div>
                {detailData.proposals.length === 0 ? (
                  <p className="text-xs text-gray-400">No active proposals.</p>
                ) : (
                  <div className="space-y-2">
                    {detailData.proposals.map((o) => (
                      <div key={o.id} className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1">
                        <div className="text-sm font-medium text-gray-900 leading-snug">{o.proposalName}</div>
                        <div className="text-xs text-gray-500">{''}</div>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {o.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
