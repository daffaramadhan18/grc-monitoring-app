'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Pencil, Trash2, X, KeyRound } from 'lucide-react'
import { fetcher } from '@/lib/fetcher'
import { LEVEL_TO_ROLE } from '@/lib/level-to-role'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMemberLink {
  id: number
  fullName: string
  initial: string
  level: string
}

interface User {
  id: number
  username: string
  role: string
  isAdmin: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  teamMember: TeamMemberLink | null
}

interface UnlinkedMember {
  id: number
  fullName: string
  initial: string
  level: string
}

interface Props {
  currentUserId: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MANUAL_ROLES = [
  'Partner',
  'Senior Manager 3', 'Senior Manager 2', 'Senior Manager 1',
  'Manager 3', 'Manager 2', 'Manager 1',
  'Assistant Manager 3', 'Assistant Manager 2', 'Assistant Manager 1',
  'Senior Associate 3', 'Senior Associate 2', 'Senior Associate 1',
  'Associate',
  'Intern',
] as const

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009CDE]'
const selectCls = inputCls

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return (
    d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
}

function suggestUsername(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 0) return ''
  const first = parts[0].toLowerCase().replace(/[^a-z]/g, '')
  if (parts.length === 1) return first
  const last = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '')
  return last ? `${first}.${last}` : first
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UsersClient({ currentUserId }: Props) {
  const { data: users = [], mutate } = useSWR<User[]>('/api/users', fetcher)
  const { data: unlinked = [] } = useSWR<UnlinkedMember[]>('/api/team-members/unlinked', fetcher)

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]     = useState(false)
  const [useLinked, setUseLinked]       = useState(false)
  const [teamMemberId, setTeamMemberId] = useState<number | null>(null)
  const [createUsername, setCreateUsername] = useState('')
  const [createRole, setCreateRole]     = useState('')
  const [createIsAdmin, setCreateIsAdmin] = useState(false)
  const [creating, setCreating]         = useState(false)
  const [createError, setCreateError]   = useState<string | null>(null)

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [editForm, setEditForm]     = useState({ role: '', isAdmin: false, isActive: true })
  const [saving, setSaving]         = useState(false)
  const [editError, setEditError]   = useState<string | null>(null)

  // ── Banner error ──────────────────────────────────────────────────────────
  const [actionError, setActionError] = useState<string | null>(null)

  // Derived role when a team member is selected
  const selectedMember   = unlinked.find((m) => m.id === teamMemberId) ?? null
  const derivedRole      = selectedMember ? (LEVEL_TO_ROLE[selectedMember.level] ?? selectedMember.level) : ''

  // ── Open / reset create modal ─────────────────────────────────────────────
  function openCreate() {
    setUseLinked(false)
    setTeamMemberId(null)
    setCreateUsername('')
    setCreateRole('')
    setCreateIsAdmin(false)
    setCreateError(null)
    setCreateOpen(true)
  }

  function handleCheckbox(checked: boolean) {
    setUseLinked(checked)
    setTeamMemberId(null)
    setCreateUsername('')
    setCreateRole('')
  }

  function handleMemberSelect(value: string) {
    if (!value) { setTeamMemberId(null); setCreateUsername(''); return }
    const id = Number(value)
    const member = unlinked.find((m) => m.id === id)
    setTeamMemberId(id)
    setCreateUsername(member ? suggestUsername(member.fullName) : '')
  }

  function openEdit(u: User) {
    setEditTarget(u)
    setEditForm({ role: u.role, isAdmin: u.isAdmin, isActive: u.isActive })
    setEditError(null)
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      const payload: Record<string, unknown> = {
        username: createUsername,
        isAdmin: createIsAdmin,
      }
      if (useLinked && teamMemberId !== null) {
        payload.teamMemberId = teamMemberId
      } else {
        payload.role = createRole
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setCreateError(data.error ?? 'Gagal membuat user'); return }
      setCreateOpen(false)
      mutate()
    } catch {
      setCreateError('Terjadi kesalahan')
    } finally {
      setCreating(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setEditError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setEditError(data.error ?? 'Gagal menyimpan'); return }
      setEditTarget(null)
      mutate()
    } catch {
      setEditError('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword(u: User) {
    if (!window.confirm(`Reset password "${u.username}" ke default?`)) return
    setActionError(null)
    try {
      const res = await fetch(`/api/users/${u.id}/reset-password`, { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (!res.ok) setActionError(data.error ?? 'Gagal reset password')
    } catch {
      setActionError('Terjadi kesalahan')
    }
  }

  async function handleDelete(u: User) {
    if (!window.confirm(`Hapus user "${u.username}"?`)) return
    setActionError(null)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
      if (res.status === 204) { mutate(); return }
      const data = await res.json() as { error?: string }
      if (!res.ok) setActionError(data.error ?? 'Gagal menghapus')
      else mutate()
    } catch {
      setActionError('Terjadi kesalahan')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">User Management</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
          style={{ backgroundColor: '#009CDE' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#007BB5')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#009CDE')}
        >
          <Plus size={15} /> Tambah User
        </button>
      </div>

      {/* Error banner */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Nama</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Username</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Jabatan</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Admin</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Last Login</th>
                <th className="px-4 py-3 text-gray-500 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                    Belum ada user.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isSelf = u.id === currentUserId
                const displayName = u.teamMember?.fullName ?? u.username
                return (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{displayName}</div>
                      {isSelf && <div className="text-xs text-gray-400 mt-0.5">Anda</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.username}</td>
                    <td className="px-4 py-3 text-gray-600">{u.role}</td>
                    <td className="px-4 py-3">
                      {u.isAdmin && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-[#009CDE]/10 text-[#009CDE]">
                          Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDateTime(u.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} disabled={isSelf} title="Edit user"
                          className="p-1.5 text-gray-400 hover:text-[#009CDE] hover:bg-[#009CDE]/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleResetPassword(u)} disabled={isSelf} title="Reset password"
                          className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <KeyRound size={14} />
                        </button>
                        <button onClick={() => handleDelete(u)} disabled={isSelf} title="Hapus user"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create User Modal ─────────────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCreateOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Tambah User</h2>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">

              {/* Checkbox: use existing team member */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useLinked}
                  onChange={(e) => handleCheckbox(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#009CDE]"
                />
                <span className="text-sm font-medium text-gray-700">Gunakan anggota tim yang ada</span>
              </label>

              {/* Team member dropdown — name only, shown when checkbox is checked */}
              {useLinked && (
                <Field label="Anggota Tim" required>
                  <select
                    className={selectCls}
                    value={teamMemberId ?? ''}
                    onChange={(e) => handleMemberSelect(e.target.value)}
                    required
                  >
                    <option value="">Pilih anggota tim...</option>
                    {unlinked.map((m) => (
                      <option key={m.id} value={m.id}>{m.fullName}</option>
                    ))}
                  </select>
                </Field>
              )}

              {/* Username */}
              <Field
                label="Username"
                required
                hint={useLinked && teamMemberId ? 'Saran berdasarkan nama, bisa diubah.' : undefined}
              >
                <input
                  className={inputCls}
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="e.g. john.doe"
                />
              </Field>

              {/* Jabatan — derived (read-only) or manual dropdown */}
              {useLinked ? (
                <Field label="Jabatan" hint="Otomatis dari level anggota tim.">
                  <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 min-h-[38px]">
                    {derivedRole || <span className="text-gray-400">Pilih anggota tim terlebih dahulu</span>}
                  </div>
                </Field>
              ) : (
                <Field label="Jabatan" required>
                  <select
                    className={selectCls}
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value)}
                    required
                  >
                    <option value="">Pilih jabatan...</option>
                    {MANUAL_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              )}

              {/* Admin toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createIsAdmin}
                  onChange={(e) => setCreateIsAdmin(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#009CDE]"
                />
                <span className="text-sm text-gray-700">Admin (dapat mengakses User Management)</span>
              </label>

              <p className="text-xs text-gray-400">
                Password default: <span className="font-mono">ITGRC@2026</span> — user wajib ganti saat login pertama.
              </p>

              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={creating}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors"
                  style={{ backgroundColor: '#009CDE' }}
                  onMouseEnter={(e) => { if (!creating) e.currentTarget.style.backgroundColor = '#007BB5' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#009CDE' }}
                >
                  {creating ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ───────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                Edit User — {editTarget.teamMember?.fullName ?? editTarget.username}
              </h2>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="px-6 py-5 space-y-4">
              {editTarget.teamMember ? (
                <Field
                  label="Jabatan"
                  hint={`Otomatis dari level ${editTarget.teamMember.initial} (${editTarget.teamMember.level}).`}
                >
                  <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                    {editForm.role}
                  </div>
                </Field>
              ) : (
                <Field label="Jabatan" required>
                  <select className={selectCls} value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} required>
                    <option value="">Pilih jabatan...</option>
                    {MANUAL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={editForm.isAdmin}
                  onChange={(e) => setEditForm((f) => ({ ...f, isAdmin: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#009CDE]" />
                <span className="text-sm text-gray-700">Admin</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={editForm.isActive}
                  onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[#009CDE]" />
                <span className="text-sm text-gray-700">Aktif</span>
              </label>

              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                  {editError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors"
                  style={{ backgroundColor: '#009CDE' }}
                  onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = '#007BB5' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#009CDE' }}
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
