'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Plus, Pencil, Trash2, X, KeyRound } from 'lucide-react'
import { fetcher } from '@/lib/fetcher'

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: number
  username: string
  role: string
  isAdmin: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface Props {
  currentUserId: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = [
  'Partner',
  'Manager',
  'Assistant Manager',
  'Senior Associate 2',
  'Senior Associate 1',
  'Associate 2',
  'Associate 1',
  'Intern',
] as const

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

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UsersClient({ currentUserId }: Props) {
  const { data: users = [], mutate } = useSWR<User[]>('/api/users', fetcher)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ username: '', role: '', isAdmin: false })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit modal
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ role: '', isAdmin: false, isActive: true })
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // General action state
  const [actionError, setActionError] = useState<string | null>(null)

  function openCreate() {
    setCreateForm({ username: '', role: '', isAdmin: false })
    setCreateError(null)
    setCreateOpen(true)
  }

  function openEdit(u: User) {
    setEditTarget(u)
    setEditForm({ role: u.role, isAdmin: u.isAdmin, isActive: u.isActive })
    setEditError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
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
    if (!window.confirm(`Reset password "${u.username}" ke default ITGRC@2026?`)) return
    setActionError(null)
    try {
      const res = await fetch(`/api/users/${u.id}/reset-password`, { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setActionError(data.error ?? 'Gagal reset password'); return }
      mutate()
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
      if (!res.ok) { setActionError(data.error ?? 'Gagal menghapus'); return }
      mutate()
    } catch {
      setActionError('Terjadi kesalahan')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">User Management</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
          style={{ backgroundColor: '#009CDE' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007BB5'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#009CDE'}
        >
          <Plus size={15} /> Tambah User
        </button>
      </div>

      {/* Error banner */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-3 text-red-500 hover:text-red-700"><X size={14} /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Username</th>
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
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    Belum ada user.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isSelf = u.id === currentUserId
                return (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{u.username}</div>
                      {isSelf && <div className="text-xs text-gray-400 mt-0.5">Anda</div>}
                    </td>
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
                        <button
                          onClick={() => openEdit(u)}
                          disabled={isSelf}
                          title="Edit user"
                          className="p-1.5 text-gray-400 hover:text-[#009CDE] hover:bg-[#009CDE]/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          disabled={isSelf}
                          title="Reset password"
                          className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isSelf}
                          title="Hapus user"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
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

      {/* Create User Modal */}
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
              <Field label="Username" required>
                <input
                  className={inputCls}
                  value={createForm.username}
                  onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                  required autoFocus placeholder="e.g. john.doe"
                />
              </Field>
              <Field label="Jabatan" required>
                <select
                  className={selectCls}
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  required
                >
                  <option value="">Pilih jabatan...</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Hak Akses">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.isAdmin}
                    onChange={(e) => setCreateForm((f) => ({ ...f, isAdmin: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#009CDE]"
                  />
                  <span className="text-sm text-gray-700">Admin (dapat mengakses User Management)</span>
                </label>
              </Field>
              <p className="text-xs text-gray-400">Password default: <span className="font-mono">ITGRC@2026</span> (user wajib ganti saat login pertama)</p>
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

      {/* Edit User Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Edit User — {editTarget.username}</h2>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="px-6 py-5 space-y-4">
              <Field label="Jabatan" required>
                <select
                  className={selectCls}
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  required
                >
                  <option value="">Pilih jabatan...</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Hak Akses">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isAdmin}
                    onChange={(e) => setEditForm((f) => ({ ...f, isAdmin: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#009CDE]"
                  />
                  <span className="text-sm text-gray-700">Admin</span>
                </label>
              </Field>
              <Field label="Status">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#009CDE]"
                  />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
              </Field>
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
