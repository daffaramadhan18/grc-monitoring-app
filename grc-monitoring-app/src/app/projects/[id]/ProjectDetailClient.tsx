'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Plus, Save } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { formatRupiah, toInputDate, PROJ_STATUSES, PROJ_STATUS_COLORS, TERMIN_STATUSES, TERMIN_STATUS_COLORS } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client     { id: number; initial: string; fullName: string }
interface TeamMember { id: number; initial: string; fullName: string; level: string }
interface TerminRow  { terminNumber: number; percentage: string; fee: string; status: string }
interface Project {
  id: number; proposalName: string; clientId: number; client: Client
  projectOwner: string | null; status: string
  micInitial: string | null
  tm1Initial: string | null; tm2Initial: string | null; tm3Initial: string | null
  tm4Initial: string | null; tm5Initial: string | null; tm6Initial: string | null
  startedDate: string | null; endDate: string | null
  spk: string | null; pks: string | null
  confirmedFee: number | null; alokasiHours: number | null; currentHours: number | null
  termins: { id: number; terminNumber: number; percentage: number | null; fee: number | null; status: string | null }[]
}

interface Props { project: Project; clients: Client[]; teamMembers: TeamMember[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
const selectCls = inputCls

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailClient({ project, clients, teamMembers }: Props) {
  const router = useRouter()

  // Project form state
  const [form, setForm] = useState({
    proposalName:  project.proposalName,
    clientId:      String(project.clientId),
    projectOwner:  project.projectOwner  ?? '',
    status:        project.status,
    micInitial:    project.micInitial    ?? '',
    tm1Initial:    project.tm1Initial    ?? '',
    tm2Initial:    project.tm2Initial    ?? '',
    tm3Initial:    project.tm3Initial    ?? '',
    tm4Initial:    project.tm4Initial    ?? '',
    tm5Initial:    project.tm5Initial    ?? '',
    tm6Initial:    project.tm6Initial    ?? '',
    startedDate:   toInputDate(project.startedDate),
    endDate:       toInputDate(project.endDate),
    spk:           project.spk           ?? '',
    pks:           project.pks           ?? '',
    confirmedFee:  project.confirmedFee  != null ? String(project.confirmedFee) : '',
    alokasiHours:  project.alokasiHours  != null ? String(project.alokasiHours) : '',
    currentHours:  project.currentHours  != null ? String(project.currentHours) : '',
  })

  // Termins state
  const [termins, setTermins] = useState<TerminRow[]>(
    project.termins.map((t) => ({
      terminNumber: t.terminNumber,
      percentage:   t.percentage != null ? String(t.percentage) : '',
      fee:          t.fee        != null ? String(t.fee)        : '',
      status:       t.status     ?? 'Deliverables in Progress',
    }))
  )

  const [savingProject, setSavingProject] = useState(false)
  const [savingTermins, setSavingTermins] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function setTermin(index: number, field: keyof TerminRow, value: string) {
    setTermins((prev) => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  function addTermin() {
    if (termins.length >= 4) return
    const next = termins.length + 1
    setTermins((prev) => [...prev, { terminNumber: next, percentage: '', fee: '', status: 'Deliverables in Progress' }])
  }

  function removeTermin(index: number) {
    setTermins((prev) => prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, terminNumber: i + 1 })))
  }

  async function saveProject(e: React.FormEvent) {
    e.preventDefault()
    setSavingProject(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSavingProject(false)
    }
  }

  async function saveTermins() {
    setSavingTermins(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/termins`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(termins.map((t) => ({
          terminNumber: t.terminNumber,
          percentage:   t.percentage ? Number(t.percentage) : null,
          fee:          t.fee        ? Number(t.fee)        : null,
          status:       t.status,
        }))),
      })
      if (!res.ok) throw new Error(await res.text())
      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSavingTermins(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Hapus project "${project.proposalName}"? Semua termin juga akan dihapus.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      router.push('/projects')
    } catch (err: any) {
      alert('Error: ' + err.message)
      setDeleting(false)
    }
  }

  const tmOptions   = [{ initial: '', fullName: '—' }, ...teamMembers]
  const hoursUsed   = Number(form.currentHours  || 0)
  const hoursAlloc  = Number(form.alokasiHours  || 0)
  const hoursPct    = hoursAlloc > 0 ? Math.min(Math.round((hoursUsed / hoursAlloc) * 100), 100) : 0
  const totalFee    = termins.reduce((s, t) => s + (Number(t.fee) || 0), 0)
  const paidFee     = termins.filter((t) => t.status === 'Paid').reduce((s, t) => s + (Number(t.fee) || 0), 0)

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/projects')} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-800 truncate">{project.proposalName}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{project.client.initial} — {project.client.fullName}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PROJ_STATUS_COLORS[form.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {form.status}
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          <Trash2 size={14} /> {deleting ? 'Menghapus...' : 'Hapus'}
        </button>
      </div>

      <form onSubmit={saveProject} className="space-y-5">
        {/* Project Info */}
        <Section title="Informasi Project">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Proposal Name">
              <input className={inputCls} value={form.proposalName}
                onChange={(e) => setField('proposalName', e.target.value)} />
            </Field>
            <Field label="Client">
              <select className={selectCls} value={form.clientId} onChange={(e) => setField('clientId', e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.initial} — {c.fullName}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Project Owner">
              <input className={inputCls} value={form.projectOwner}
                onChange={(e) => setField('projectOwner', e.target.value)} placeholder="ITGRC-S / Non ITGRC-S" />
            </Field>
            <Field label="Status">
              <select className={selectCls} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                {PROJ_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <input type="date" className={inputCls} value={form.startedDate}
                onChange={(e) => setField('startedDate', e.target.value)} />
            </Field>
            <Field label="End Date">
              <input type="date" className={inputCls} value={form.endDate}
                onChange={(e) => setField('endDate', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="SPK">
              <input className={inputCls} value={form.spk} onChange={(e) => setField('spk', e.target.value)} />
            </Field>
            <Field label="PKS">
              <input className={inputCls} value={form.pks} onChange={(e) => setField('pks', e.target.value)} />
            </Field>
          </div>
          <Field label="Confirmed Fee (IDR)">
            <CurrencyInput value={form.confirmedFee} onChange={(v) => setField('confirmedFee', v)} />
          </Field>
        </Section>

        {/* Team */}
        <Section title="Tim Project">
          <div className="grid grid-cols-4 gap-4">
            <Field label="MIC">
              <select className={selectCls} value={form.micInitial} onChange={(e) => setField('micInitial', e.target.value)}>
                {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
              </select>
            </Field>
            {(['tm1Initial','tm2Initial','tm3Initial'] as const).map((k, i) => (
              <Field key={k} label={`TM${i+1}`}>
                <select className={selectCls} value={form[k]} onChange={(e) => setField(k, e.target.value)}>
                  {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                </select>
              </Field>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {(['tm4Initial','tm5Initial','tm6Initial'] as const).map((k, i) => (
              <Field key={k} label={`TM${i+4}`}>
                <select className={selectCls} value={form[k]} onChange={(e) => setField(k, e.target.value)}>
                  {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                </select>
              </Field>
            ))}
          </div>
        </Section>

        {/* Hours */}
        <Section title="Alokasi Jam">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Alokasi Hours">
              <input type="number" step="0.5" className={inputCls} value={form.alokasiHours}
                onChange={(e) => setField('alokasiHours', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Current Hours">
              <input type="number" step="0.5" className={inputCls} value={form.currentHours}
                onChange={(e) => setField('currentHours', e.target.value)} placeholder="0" />
            </Field>
          </div>
          {hoursAlloc > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{hoursUsed}h used</span>
                <span className={hoursPct > 90 ? 'text-red-500 font-semibold' : ''}>{hoursPct}%</span>
                <span>{hoursAlloc}h allocated</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${hoursPct > 90 ? 'bg-red-400' : 'bg-blue-400'}`}
                  style={{ width: `${hoursPct}%` }}
                />
              </div>
            </div>
          )}
        </Section>

        <div className="flex justify-end">
          <button type="submit" disabled={savingProject}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[#CC0000] text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors">
            <Save size={14} /> {savingProject ? 'Menyimpan...' : 'Simpan Project'}
          </button>
        </div>
      </form>

      {/* Termins */}
      <Section title="Termin Pembayaran">
        <div className="space-y-3">
          {termins.length === 0 && (
            <p className="text-sm text-gray-400">Belum ada termin. Klik &ldquo;+ Tambah Termin&rdquo; di bawah.</p>
          )}
          {termins.map((t, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Termin {t.terminNumber}</span>
                <button
                  type="button"
                  onClick={() => removeTermin(i)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Hapus
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Percentage (%)">
                  <input type="number" step="0.01" className={inputCls} value={t.percentage}
                    onChange={(e) => setTermin(i, 'percentage', e.target.value)} placeholder="0" />
                </Field>
                <Field label="Fee (IDR)">
                  <CurrencyInput value={t.fee} onChange={(v) => setTermin(i, 'fee', v)} />
                </Field>
                <Field label="Status">
                  <select className={selectCls} value={t.status}
                    onChange={(e) => setTermin(i, 'status', e.target.value)}>
                    {TERMIN_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          ))}

          {/* Add termin button */}
          {termins.length < 4 && (
            <button
              type="button"
              onClick={addTermin}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-dashed border-gray-300 rounded-xl px-4 py-2.5 w-full justify-center hover:border-gray-400 transition-colors"
            >
              <Plus size={14} /> Tambah Termin {termins.length + 1}
            </button>
          )}

          {/* Termin summary */}
          {termins.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
              <div className="flex gap-4">
                {termins.map((t) => (
                  <span key={t.terminNumber} className={`px-2 py-0.5 rounded-full text-xs font-medium ${TERMIN_STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    T{t.terminNumber}: {t.status}
                  </span>
                ))}
              </div>
              <div className="text-right text-xs text-gray-500">
                <div>Paid: <span className="font-semibold text-green-600">{formatRupiah(paidFee)}</span></div>
                <div>Total: <span className="font-semibold">{formatRupiah(totalFee)}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={saveTermins}
            disabled={savingTermins}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[#CC0000] text-white rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            <Save size={14} /> {savingTermins ? 'Menyimpan...' : 'Simpan Termins'}
          </button>
        </div>
      </Section>
    </div>
  )
}
