'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { formatRupiah, formatDate, toInputDate, PROJ_STATUSES, PROJ_STATUS_COLORS } from '@/lib/utils'

interface Client     { id: number; initial: string; fullName: string }
interface TeamMember { id: number; initial: string; fullName: string; level: string }
interface Termin     { id: number; terminNumber: number; fee: number | null; status: string | null }
interface Project {
  id: number; proposalName: string; clientId: number; client: Client
  projectOwner: string | null; status: string
  micInitial: string | null
  tm1Initial: string | null; tm2Initial: string | null; tm3Initial: string | null
  tm4Initial: string | null; tm5Initial: string | null; tm6Initial: string | null
  startedDate: string | null; endDate: string | null
  confirmedFee: number | null; alokasiHours: number | null; currentHours: number | null
  termins: Termin[]
}

interface Props {
  projects: Project[]
  clients: Client[]
  teamMembers: TeamMember[]
}

const emptyForm = () => ({
  proposalName: '', clientId: '', projectOwner: '', status: 'Planning',
  micInitial: '', tm1Initial: '', tm2Initial: '', tm3Initial: '',
  tm4Initial: '', tm5Initial: '', tm6Initial: '',
  startedDate: '', endDate: '', confirmedFee: '', spk: '', pks: '', alokasiHours: '',
})

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
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

export default function ProjectsClient({ projects: initial, clients, teamMembers }: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>(initial)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState(emptyForm())
  const [saving, setSaving]       = useState(false)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.proposalName || !form.clientId) return
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json()
      setModalOpen(false)
      router.push(`/projects/${saved.id}`)
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const tmOptions = [{ initial: '', fullName: '—' }, ...teamMembers]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Projects</h1>
        <button
          onClick={() => { setForm(emptyForm()); setModalOpen(true) }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000] text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={16} /> Add Project
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {PROJ_STATUSES.map((s) => (
          <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${PROJ_STATUS_COLORS[s]}`}>
            {s}: {projects.filter((p) => p.status === s).length}
          </span>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium min-w-[180px]">Proposal Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Owner</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">MIC</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Team</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Period</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Confirmed Fee</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Termins</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    Belum ada project.
                  </td>
                </tr>
              )}
              {projects.map((proj) => {
                const team = [proj.tm1Initial, proj.tm2Initial, proj.tm3Initial,
                              proj.tm4Initial, proj.tm5Initial, proj.tm6Initial].filter(Boolean) as string[]
                const paidCount = proj.termins.filter((t) => t.status === 'Paid').length
                const hoursUsed = Math.round(((proj.currentHours ?? 0) / Math.max(proj.alokasiHours ?? 1, 1)) * 100)
                return (
                  <tr
                    key={proj.id}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/projects/${proj.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                      {proj.proposalName}
                    </td>
                    <td className="px-4 py-3 text-gray-600" title={proj.client.fullName}>
                      {proj.client.initial}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{proj.projectOwner ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROJ_STATUS_COLORS[proj.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {proj.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{proj.micInitial ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {team.map((t) => (
                          <span key={t} className="inline-flex px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{t}</span>
                        ))}
                        {team.length === 0 && <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(proj.startedDate)} – {formatDate(proj.endDate)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(proj.confirmedFee)}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {proj.termins.length > 0 ? `${paidCount}/${proj.termins.length} paid` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {proj.alokasiHours ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-gray-600">{proj.currentHours ?? 0}/{proj.alokasiHours}h</span>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${hoursUsed > 90 ? 'bg-red-400' : 'bg-blue-400'}`}
                              style={{ width: `${Math.min(hoursUsed, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">New Project</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <Field label="Proposal Name" required>
                <input className={inputCls} value={form.proposalName}
                  onChange={(e) => set('proposalName', e.target.value)} required />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Client" required>
                  <select className={selectCls} value={form.clientId}
                    onChange={(e) => set('clientId', e.target.value)} required>
                    <option value="">Pilih client...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.initial} — {c.fullName}</option>)}
                  </select>
                </Field>
                <Field label="Project Owner">
                  <input className={inputCls} value={form.projectOwner}
                    onChange={(e) => set('projectOwner', e.target.value)} placeholder="ITGRC-S / Non ITGRC-S" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select className={selectCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                    {PROJ_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Confirmed Fee (IDR)">
                  <CurrencyInput value={form.confirmedFee} onChange={(v) => set('confirmedFee', v)} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Date">
                  <input type="date" className={inputCls} value={form.startedDate}
                    onChange={(e) => set('startedDate', e.target.value)} />
                </Field>
                <Field label="End Date">
                  <input type="date" className={inputCls} value={form.endDate}
                    onChange={(e) => set('endDate', e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="SPK">
                  <input className={inputCls} value={form.spk} onChange={(e) => set('spk', e.target.value)} />
                </Field>
                <Field label="PKS">
                  <input className={inputCls} value={form.pks} onChange={(e) => set('pks', e.target.value)} />
                </Field>
              </div>

              <Field label="Alokasi Hours">
                <input type="number" className={inputCls} value={form.alokasiHours}
                  onChange={(e) => set('alokasiHours', e.target.value)} placeholder="0" />
              </Field>

              {/* MIC + TM */}
              <div className="grid grid-cols-4 gap-4">
                <Field label="MIC">
                  <select className={selectCls} value={form.micInitial} onChange={(e) => set('micInitial', e.target.value)}>
                    {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                  </select>
                </Field>
                {(['tm1Initial','tm2Initial','tm3Initial'] as const).map((k, i) => (
                  <Field key={k} label={`TM${i+1}`}>
                    <select className={selectCls} value={form[k]} onChange={(e) => set(k, e.target.value)}>
                      {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                    </select>
                  </Field>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(['tm4Initial','tm5Initial','tm6Initial'] as const).map((k, i) => (
                  <Field key={k} label={`TM${i+4}`}>
                    <select className={selectCls} value={form[k]} onChange={(e) => set(k, e.target.value)}>
                      {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                    </select>
                  </Field>
                ))}
              </div>

              <p className="text-xs text-gray-400">Setelah disimpan, kamu bisa tambah termin di halaman detail project.</p>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-medium bg-[#CC0000] text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
                  {saving ? 'Menyimpan...' : 'Simpan & Buka Detail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
