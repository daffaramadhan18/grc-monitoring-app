'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { ArrowLeft, Trash2, Plus, Save, Download, UploadCloud, FileText, X, Check } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { formatRupiah, toInputDate, PROJ_STATUSES, PROJ_STATUS_COLORS, TERMIN_STATUSES, TERMIN_STATUS_COLORS } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember { id: number; initial: string; fullName: string; level: string }
interface TerminRow  { uid: number; terminNumber: number; percentage: string; fee: string; status: string }
interface Project {
  id: number; proposalName: string
  clientName: string | null
  clientInitial: string | null
  projectOwner: string | null; status: string
  micInitial: string | null
  teamMembers: string[]
  startedDate: string | null; endDate: string | null
  spk: string | null; pks: string | null
  confirmedFee: number | null
  termins: { id: number; terminNumber: number; percentage: number | null; fee: number | null; status: string | null }[]
}

interface Props { project: Project; teamMembers: TeamMember[] }

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

const staggerContainer: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.05, delayChildren: 0.12 } },
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
}

const chipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.75 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.18 } },
  exit:   { opacity: 0, scale: 0.75, transition: { duration: 0.15 } },
}

const terminVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:   { opacity: 0, y: -6, transition: { duration: 0.18, ease: 'easeIn' } },
}

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
    <motion.div variants={sectionVariants} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </motion.div>
  )
}

// ─── FileUploadOrDownload ─────────────────────────────────────────────────────

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
    } catch (err: unknown) {
      alert('Upload gagal: ' + (err instanceof Error ? err.message : String(err)))
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

let _uid = 0
function nextUid() { return ++_uid }

export default function ProjectDetailClient({ project, teamMembers }: Props) {
  const router = useRouter()

  const [form, setForm] = useState({
    proposalName:  project.proposalName,
    clientName:    project.clientName    ?? '',
    clientInitial: project.clientInitial ?? '',
    projectOwner:  project.projectOwner  ?? '',
    status:        project.status,
    micInitial:    project.micInitial    ?? '',
    teamMembers:   project.teamMembers,
    startedDate:   toInputDate(project.startedDate),
    endDate:       toInputDate(project.endDate),
    spk:           project.spk           ?? '',
    pks:           project.pks           ?? '',
    confirmedFee:  project.confirmedFee  != null ? String(project.confirmedFee) : '',
  })
  const [tmAddInput, setTmAddInput] = useState('')

  const [termins, setTermins] = useState<TerminRow[]>(
    project.termins.map((t) => ({
      uid:          nextUid(),
      terminNumber: t.terminNumber,
      percentage:   t.percentage != null ? String(t.percentage) : '',
      fee:          t.fee        != null ? String(t.fee)        : '',
      status:       t.status     ?? 'Deliverables in Progress',
    }))
  )

  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast,   setToast]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const pendingStatusRef = useRef<string | null>(null)

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function setField(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleStatusChange(value: string) {
    if (value === 'Finish' && form.status !== 'Finish') {
      pendingStatusRef.current = value
      setConfirmFinish(true)
    } else {
      setField('status', value)
    }
  }

  function setTermin(index: number, field: keyof TerminRow, value: string) {
    setTermins((prev) => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  function addTermin() {
    if (termins.length >= 4) return
    const next = termins.length + 1
    setTermins((prev) => [...prev, { uid: nextUid(), terminNumber: next, percentage: '', fee: '', status: 'Deliverables in Progress' }])
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
      showToast('success', form.status === 'Finish' ? 'Project moved to Finished' : 'Perubahan berhasil disimpan')
      router.refresh()
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan')
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
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : String(err)))
      setDeleting(false)
    }
  }

  const availableTmOptions = useMemo(
    () => teamMembers.filter((m) => m.initial !== form.micInitial && !form.teamMembers.includes(m.initial)),
    [teamMembers, form.micInitial, form.teamMembers],
  )

  function addTeamMember(initial: string) {
    if (!initial || form.teamMembers.includes(initial)) return
    setForm((f) => ({ ...f, teamMembers: [...f.teamMembers, initial] }))
    setTmAddInput('')
  }

  function removeTeamMember(initial: string) {
    setForm((f) => ({ ...f, teamMembers: f.teamMembers.filter((t) => t !== initial) }))
  }

  const tmOptions = [{ initial: '', fullName: '—' }, ...teamMembers]
  const totalFee  = termins.reduce((s, t) => s + (Number(t.fee) || 0), 0)
  const paidFee   = termins.filter((t) => t.status === 'Paid').reduce((s, t) => s + (Number(t.fee) || 0), 0)

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl space-y-5"
    >

      {/* ── Top-right toast ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="detail-toast"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-xs"
            style={{ backgroundColor: toast.type === 'success' ? '#43B02A' : '#ef4444', color: 'white' }}
          >
            {toast.type === 'success'
              ? <Check size={15} className="shrink-0" />
              : <X size={15} className="shrink-0" />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* ── Stagger form sections ─────────────────────────────────────────── */}
      <form onSubmit={handleSaveAll}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >

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
                <select className={selectCls} value={form.status} onChange={(e) => handleStatusChange(e.target.value)}>
                  {PROJ_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Start Date</label>
                <input type="date" className={`${inputCls} min-h-[44px]`} value={form.startedDate}
                  onChange={(e) => setField('startedDate', e.target.value)} />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">End Date</label>
                <input type="date" className={`${inputCls} min-h-[44px]`} value={form.endDate}
                  onChange={(e) => setField('endDate', e.target.value)} />
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <Field label="MIC">
                <select className={selectCls} value={form.micInitial} onChange={(e) => setField('micInitial', e.target.value)}>
                  {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Team Members">
              <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                {form.teamMembers.length === 0 && (
                  <span className="text-xs text-gray-400 py-1">No team members added</span>
                )}
                <AnimatePresence initial={false}>
                  {form.teamMembers.map((t) => (
                    <motion.span
                      key={t}
                      variants={chipVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold"
                    >
                      {t}
                      <button type="button" onClick={() => removeTeamMember(t)}
                        className="text-blue-400 hover:text-blue-700 transition-colors ml-0.5">
                        <X size={10} />
                      </button>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <div className="flex gap-2">
                <select className={`${selectCls} flex-1`} value={tmAddInput} onChange={(e) => setTmAddInput(e.target.value)}>
                  <option value="">Add member…</option>
                  {availableTmOptions.map((m) => (
                    <option key={m.initial} value={m.initial}>{m.initial} – {m.fullName}</option>
                  ))}
                </select>
                <button type="button" onClick={() => addTeamMember(tmAddInput)} disabled={!tmAddInput}
                  className="px-3 py-2 text-sm font-medium bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-40 transition-colors shrink-0">
                  Add
                </button>
              </div>
            </Field>
          </Section>

          {/* Termins */}
          <Section title="Termin Pembayaran">
            <div className="space-y-3">
              {termins.length === 0 && (
                <p className="text-sm text-gray-400">Belum ada termin. Klik &ldquo;+ Tambah Termin&rdquo; di bawah.</p>
              )}
              <AnimatePresence initial={false}>
                {termins.map((t, i) => (
                  <motion.div
                    key={t.uid}
                    variants={terminVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50"
                  >
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
                  </motion.div>
                ))}
              </AnimatePresence>

              {termins.length < 4 && (
                <button
                  type="button"
                  onClick={addTermin}
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-dashed border-gray-300 rounded-xl px-4 py-2.5 w-full justify-center hover:border-gray-400 transition-colors"
                >
                  <Plus size={14} /> Tambah Termin {termins.length + 1}
                </button>
              )}

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

          {/* Save button */}
          <motion.div variants={sectionVariants} className="flex justify-end">
            <motion.button
              type="submit"
              disabled={saving}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors"
            >
              <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan Semua'}
            </motion.button>
          </motion.div>

        </motion.div>
      </form>

      {/* Confirm Finish dialog */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmFinish(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 rsm-modal-pop">
            <h3 className="text-base font-semibold text-gray-800">Move to Finished?</h3>
            <p className="text-sm text-gray-500">Project ini akan dipindahkan ke status <span className="font-medium text-gray-700">Finish</span> dan dihapus dari daftar project aktif.</p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmFinish(false)}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (pendingStatusRef.current) setField('status', pendingStatusRef.current)
                  pendingStatusRef.current = null
                  setConfirmFinish(false)
                }}
                className="flex-1 py-2.5 text-sm font-medium bg-[#009CDE] text-white rounded-xl hover:bg-[#007BB5] transition-colors"
              >
                Move to Finished
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  )
}
