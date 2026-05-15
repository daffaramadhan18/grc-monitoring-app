'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Plus, Save, Download, UploadCloud, FileText, X } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { formatRupiah, toInputDate, PROJ_STATUSES, PROJ_STATUS_COLORS, TERMIN_STATUSES, TERMIN_STATUS_COLORS } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember { id: number; initial: string; fullName: string; level: string }
interface TerminRow  { terminNumber: number; percentage: string; fee: string; status: string }
interface Project {
  id: number; proposalName: string
  clientName: string | null
  clientInitial: string | null
  projectOwner: string | null; status: string
  micInitial: string | null
  tm1Initial: string | null; tm2Initial: string | null; tm3Initial: string | null
  tm4Initial: string | null; tm5Initial: string | null; tm6Initial: string | null
  startedDate: string | null; endDate: string | null
  spk: string | null; pks: string | null
  confirmedFee: number | null
  termins: { id: number; terminNumber: number; percentage: number | null; fee: number | null; status: string | null }[]
}

interface Props { project: Project; teamMembers: TeamMember[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009CDE]'
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

// ─── FileUploadOrDownload ────────────────────────────────────────────────────

function FileUploadOrDownload({ path, onUploaded, onClear }: { path: string; onUploaded: (p: string) => void; onClear: () => void }) {
  const [uploading, setUploading] = useState(false)

  const displayName = path ? path.split('/').pop()?.replace(/^\d+-/, '') ?? path : null

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { alert('Hanya file PDF yang diterima.'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const { path: uploaded } = await res.json()
      onUploaded(uploaded)
    } catch (err: any) {
      alert('Upload gagal: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {displayName ? (
        <>
          <a href={path} target="_blank" rel="noopener noreferrer" download
            className="flex items-center gap-1.5 text-sm text-[#009CDE] hover:underline truncate max-w-[140px]">
            <FileText size={13} className="shrink-0" />
            <span className="truncate">{displayName}</span>
            <Download size={12} className="shrink-0" />
          </a>
          <label className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 underline">
            Ganti
            <input type="file" accept="application/pdf" className="hidden" disabled={uploading} onChange={handleFile} />
          </label>
          <button type="button" onClick={onClear}
            className="p-0.5 text-gray-300 hover:text-red-500 transition-colors" title="Hapus file">
            <X size={13} />
          </button>
        </>
      ) : (
        <label className={`flex items-center gap-1.5 cursor-pointer px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#009CDE] hover:text-[#009CDE] transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <UploadCloud size={14} />
          {uploading ? 'Uploading...' : 'Upload PDF'}
          <input type="file" accept="application/pdf" className="hidden" disabled={uploading} onChange={handleFile} />
        </label>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectDetailClient({ project, teamMembers }: Props) {
  const router = useRouter()

  // Project form state
  const [form, setForm] = useState({
    proposalName:  project.proposalName,
    clientName:    project.clientName    ?? '',
    clientInitial: project.clientInitial ?? '',
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

  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  async function handleSaveAll(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/projects/${project.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }),
        fetch(`/api/projects/${project.id}/termins`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(termins.map((t) => ({
            terminNumber: t.terminNumber,
            percentage:   t.percentage ? Number(t.percentage) : null,
            fee:          t.fee        ? Number(t.fee)        : null,
            status:       t.status,
          }))),
        }),
      ])
      if (!r1.ok) throw new Error(await r1.text())
      if (!r2.ok) throw new Error(await r2.text())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
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
  const totalFee    = termins.reduce((s, t) => s + (Number(t.fee) || 0), 0)
  const paidFee     = termins.filter((t) => t.status === 'Paid').reduce((s, t) => s + (Number(t.fee) || 0), 0)

  return (
    <div className="max-w-4xl space-y-5">

      {/* Toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#43B02A] text-white text-sm font-medium rounded-xl shadow-lg animate-fade-in">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Tersimpan!
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/projects')} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-800 truncate">{project.proposalName}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{project.clientInitial ?? ''}{project.clientInitial && project.clientName ? ' — ' : ''}{project.clientName ?? ''}</p>
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

      <form onSubmit={handleSaveAll} className="space-y-5">
        {/* Project Info */}
        <Section title="Informasi Project">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Engagement Name">
              <input className={inputCls} value={form.proposalName}
                onChange={(e) => setField('proposalName', e.target.value)} />
            </Field>
            <Field label="Client Initial">
              <input className={inputCls} value={form.clientInitial}
                onChange={(e) => setField('clientInitial', e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. BRI" maxLength={6} />
            </Field>
            <Field label="Client Name">
              <input className={inputCls} value={form.clientName}
                onChange={(e) => setField('clientName', e.target.value)}
                placeholder="Nama lengkap client" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Project Owner">
              <select className={selectCls} value={form.projectOwner} onChange={(e) => setField('projectOwner', e.target.value)}>
                <option value="">—</option>
                <option value="ITGRC-S">ITGRC-S</option>
                <option value="Non ITGRC-S">Non ITGRC-S</option>
              </select>
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
              <FileUploadOrDownload
                path={form.spk}
                onUploaded={(p) => setField('spk', p)}
                onClear={() => setField('spk', '')}
              />
            </Field>
            <Field label="PKS">
              <FileUploadOrDownload
                path={form.pks}
                onUploaded={(p) => setField('pks', p)}
                onClear={() => setField('pks', '')}
              />
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

      </Section>

      {/* Single save button */}
      <div className="flex justify-end">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rsm-btn-spring rsm-btn-primary-glow bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors">
          <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan Semua'}
        </button>
      </div>
    </form>

    </div>
  )
}
