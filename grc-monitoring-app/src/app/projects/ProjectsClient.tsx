'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, UploadCloud, FileText } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { formatRupiah, formatDate, PROJ_STATUSES, PROJ_STATUS_COLORS } from '@/lib/utils'

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

interface Props { projects: Project[]; clients: Client[]; teamMembers: TeamMember[] }

const emptyForm = () => ({
  engagementName: '',
  clientName:     '',
  projectOwner:   '',
  status:         'Planning',
  confirmedFee:   '',
  startedDate:    '',
  endDate:        '',
  spk:            '',   // stored file path
  pks:            '',
  spkFilename:    '',   // display only
  pksFilename:    '',
  micInitial:     '',
  tm1Initial: '', tm2Initial: '', tm3Initial: '',
  tm4Initial: '', tm5Initial: '', tm6Initial: '',
})

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

// ─── File upload button ───────────────────────────────────────────────────────

function FileUploadField({
  label, filename, onUpload, uploading,
}: {
  label: string
  filename: string
  onUpload: (path: string, name: string) => void
  uploading: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res  = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? 'Upload gagal'); return }
    onUpload(data.path, data.filename)
    e.target.value = ''
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div
        className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
        onClick={() => ref.current?.click()}
      >
        {filename ? (
          <>
            <FileText size={14} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 truncate flex-1">{filename}</span>
            <span className="text-xs text-green-600 font-medium shrink-0">Uploaded</span>
          </>
        ) : (
          <>
            <UploadCloud size={14} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-400">{uploading ? 'Uploading…' : 'Pilih file PDF…'}</span>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleChange} />
      <p className="text-xs text-gray-400 mt-1">PDF only</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectsClient({ projects: initial, clients, teamMembers }: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>(initial)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [dateError, setDateError] = useState('')

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      // Validate dates on change
      const start = field === 'startedDate' ? value : next.startedDate
      const end   = field === 'endDate'     ? value : next.endDate
      if (start && end && end < start) {
        setDateError('End date tidak boleh sebelum start date')
      } else {
        setDateError('')
      }
      return next
    })
  }

  function setFile(field: 'spk' | 'pks', path: string, name: string) {
    setForm((f) => ({
      ...f,
      [field]:               path,
      [`${field}Filename`]:  name,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.engagementName || !form.clientName) return
    if (dateError) return
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
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
          onClick={() => { setForm(emptyForm()); setDateError(''); setModalOpen(true) }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#009CDE] text-white text-sm font-medium rounded-lg hover:bg-[#007BB5] transition-colors"
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
                <th className="text-left px-4 py-3 text-gray-500 font-medium min-w-[180px]">Engagement Name</th>
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
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">Belum ada project.</td>
                </tr>
              )}
              {projects.map((proj) => {
                const team = [proj.tm1Initial, proj.tm2Initial, proj.tm3Initial,
                              proj.tm4Initial, proj.tm5Initial, proj.tm6Initial].filter(Boolean) as string[]
                const paidCount = proj.termins.filter((t) => t.status === 'Paid').length
                const hoursUsed = Math.round(((proj.currentHours ?? 0) / Math.max(proj.alokasiHours ?? 1, 1)) * 100)
                return (
                  <tr key={proj.id} className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/projects/${proj.id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{proj.proposalName}</td>
                    <td className="px-4 py-3 text-gray-600" title={proj.client.fullName}>{proj.client.initial}</td>
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
                            <div className={`h-full rounded-full ${hoursUsed > 90 ? 'bg-red-400' : 'bg-[#009CDE]'}`}
                              style={{ width: `${Math.min(hoursUsed, 100)}%` }} />
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

      {/* ── Add Project Modal ─────────────────────────────────────────────── */}
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

              {/* Engagement Name */}
              <Field label="Engagement Name" required>
                <input className={inputCls} value={form.engagementName}
                  onChange={(e) => set('engagementName', e.target.value)} required autoFocus />
              </Field>

              {/* Client Name (free text) */}
              <Field label="Client Name" required>
                <input className={inputCls} value={form.clientName}
                  onChange={(e) => set('clientName', e.target.value)}
                  required placeholder="Nama client" />
              </Field>

              {/* Project Owner dropdown + Status */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Project Owner">
                  <select className={selectCls} value={form.projectOwner}
                    onChange={(e) => set('projectOwner', e.target.value)}>
                    <option value="">— (opsional)</option>
                    <option value="ITGRC-S">ITGRC-S</option>
                    <option value="Non ITGRC-S">Non ITGRC-S</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select className={selectCls} value={form.status}
                    onChange={(e) => set('status', e.target.value)}>
                    {PROJ_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              {/* Confirmed Fee */}
              <Field label="Confirmed Fee (IDR)">
                <CurrencyInput value={form.confirmedFee}
                  onChange={(v) => set('confirmedFee', v)} />
              </Field>

              {/* Start + End Date */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Date">
                  <input type="date" className={inputCls} value={form.startedDate}
                    onChange={(e) => set('startedDate', e.target.value)} />
                </Field>
                <Field label="End Date">
                  <input type="date" className={inputCls} value={form.endDate}
                    min={form.startedDate || undefined}
                    onChange={(e) => set('endDate', e.target.value)} />
                </Field>
              </div>
              {dateError && (
                <p className="text-xs text-red-500 -mt-2">{dateError}</p>
              )}

              {/* SPK + PKS file upload */}
              <div className="grid grid-cols-2 gap-4">
                <FileUploadField
                  label="SPK (PDF)"
                  filename={form.spkFilename}
                  uploading={false}
                  onUpload={(path, name) => setFile('spk', path, name)}
                />
                <FileUploadField
                  label="PKS (PDF)"
                  filename={form.pksFilename}
                  uploading={false}
                  onUpload={(path, name) => setFile('pks', path, name)}
                />
              </div>

              {/* MIC + TM1–TM3 */}
              <div className="grid grid-cols-4 gap-4">
                <Field label="MIC">
                  <select className={selectCls} value={form.micInitial}
                    onChange={(e) => set('micInitial', e.target.value)}>
                    {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                  </select>
                </Field>
                {(['tm1Initial','tm2Initial','tm3Initial'] as const).map((k, i) => (
                  <Field key={k} label={`TM${i+1}`}>
                    <select className={selectCls} value={form[k]}
                      onChange={(e) => set(k, e.target.value)}>
                      {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                    </select>
                  </Field>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(['tm4Initial','tm5Initial','tm6Initial'] as const).map((k, i) => (
                  <Field key={k} label={`TM${i+4}`}>
                    <select className={selectCls} value={form[k]}
                      onChange={(e) => set(k, e.target.value)}>
                      {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                    </select>
                  </Field>
                ))}
              </div>

              <p className="text-xs text-gray-400">
                Alokasi Hours bisa diisi di halaman detail project setelah disimpan.
              </p>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={saving || !!dateError}
                  className="px-5 py-2 text-sm font-medium bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors">
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
