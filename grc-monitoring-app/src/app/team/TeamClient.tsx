'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member { id: number; fullName: string; initial: string; level: string }
interface Alloc  { projects: number; proposals: number }

interface Props {
  members: Member[]
  allocation: Record<string, Alloc>
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

// Deterministic color from initial string — RSM brand palette
const AVATAR_COLORS = [
  'bg-[#009CDE]', 'bg-[#43B02A]', 'bg-[#58595B]', 'bg-[#F59E0B]', 'bg-[#8B5CF6]', 'bg-[#EC4899]',
]

function avatarColor(initial: string) {
  const hash = initial.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function Avatar({ initial, size = 'md' }: { initial: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm'
    ? 'w-8 h-8 text-xs'
    : 'w-10 h-10 text-sm'
  return (
    <div className={`${cls} ${avatarColor(initial)} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
      {initial.slice(0, 2)}
    </div>
  )
}

// ─── Capacity badge ───────────────────────────────────────────────────────────

function capacityBadge(projects: number, proposals: number) {
  if (projects > 2 || proposals > 2)
    return { label: 'Overloaded',  cls: 'bg-red-100 text-red-700',         order: 0 }
  if (projects === 2 && proposals === 2)
    return { label: 'At Capacity', cls: 'bg-amber-100 text-amber-700',     order: 1 }
  return   { label: 'Available',   cls: 'bg-[#43B02A]/15 text-[#2d7a1a]', order: 2 }
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamClient({ members: initial, allocation }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(initial)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Member | null>(null)
  const [form, setForm] = useState({ fullName: '', initial: '', level: '' })
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)

  function openNew() {
    setEditing(null)
    setForm({ fullName: '', initial: '', level: '' })
    setModalOpen(true)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setForm({ fullName: m.fullName, initial: m.initial, level: m.level })
    setModalOpen(true)
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
      setModalOpen(false)
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

  // ── Resource allocation rows (sorted: overloaded → at capacity → available, then by total desc)
  const allocRows = members.map((m) => {
    const a      = allocation[m.initial] ?? { projects: 0, proposals: 0 }
    const total  = a.projects + a.proposals
    const badge  = capacityBadge(a.projects, a.proposals)
    return { member: m, ...a, total, badge }
  }).sort((a, b) => {
    if (a.badge.order !== b.badge.order) return a.badge.order - b.badge.order
    return b.total - a.total
  })

  return (
    <div className="space-y-8">
      {/* ── Team Members Table ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Team Members</h1>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#009CDE] text-white text-sm font-medium rounded-lg hover:bg-[#007BB5] transition-colors"
          >
            <Plus size={16} /> Add Member
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Member</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Initial</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Level</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    Belum ada team member.
                  </td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/team/${m.id}`)}
                      className="flex items-center gap-3 text-left hover:underline"
                    >
                      <Avatar initial={m.initial} />
                      <span className="font-medium text-gray-900">{m.fullName}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded font-mono text-xs font-semibold bg-slate-100 text-slate-700">
                      {m.initial}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{m.level}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(m)}
                        className="p-1.5 text-gray-400 hover:text-[#009CDE] hover:bg-[#009CDE]/10 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        disabled={deleting === m.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Delete"
                      >
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

      {/* ── Resource Allocation Breakdown ────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Resource Allocation Breakdown</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Visual split between billable projects and business development (proposals)
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#009CDE] inline-block" />Active Projects</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#43B02A] inline-block" />Active Proposals</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {allocRows.length === 0 && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              Belum ada data alokasi.
            </div>
          )}
          {allocRows.map(({ member, projects, proposals, total, badge }) => {
            const projPct    = total > 0 ? Math.round((projects  / total) * 100) : 0
            const propPct    = total > 0 ? Math.round((proposals / total) * 100) : 0
            return (
              <div key={member.id} className="px-5 py-4 flex items-center gap-4">
                {/* Avatar */}
                <Avatar initial={member.initial} size="sm" />

                {/* Name + level */}
                <div className="w-44 shrink-0">
                  <div className="font-medium text-sm text-gray-900">{member.fullName}</div>
                  <div className="text-xs text-gray-400">{member.level}</div>
                </div>

                {/* Counts */}
                <div className="flex items-center gap-3 shrink-0 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#009CDE] inline-block" />
                    {projects} project{projects !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#43B02A] inline-block" />
                    {proposals} proposal{proposals !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 min-w-0">
                  {total > 0 ? (
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                      {projects > 0 && (
                        <div
                          className="bg-[#009CDE] transition-all"
                          style={{ width: `${projPct}%` }}
                          title={`${projects} projects`}
                        />
                      )}
                      {proposals > 0 && (
                        <div
                          className="bg-[#43B02A] transition-all"
                          style={{ width: `${propPct}%` }}
                          title={`${proposals} proposals`}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="h-2.5 rounded-full bg-gray-100" />
                  )}
                </div>

                {/* Total count */}
                <div className="text-sm font-semibold text-gray-700 w-6 text-right shrink-0">
                  {total}
                </div>

                {/* Capacity badge */}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                {editing ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <Field label="Full Name" required>
                <input
                  className={inputCls}
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  required
                  autoFocus
                />
              </Field>

              <Field label="Initial" required>
                <input
                  className={inputCls}
                  value={form.initial}
                  onChange={(e) => set('initial', e.target.value.toUpperCase().slice(0, 4))}
                  required
                  maxLength={4}
                  placeholder="e.g. DR"
                />
                <p className="text-xs text-gray-400 mt-1">Max 4 karakter, huruf kapital</p>
              </Field>

              <Field label="Level" required>
                <select
                  className={selectCls}
                  value={form.level}
                  onChange={(e) => set('level', e.target.value)}
                  required
                >
                  <option value="">Pilih level...</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>

              {/* Preview avatar */}
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
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Menyimpan...' : (editing ? 'Update' : 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
