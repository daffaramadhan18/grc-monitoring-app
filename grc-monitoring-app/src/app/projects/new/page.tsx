'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, X } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'

interface TeamMember { id: number; initial: string; fullName: string; level: string }

const PROJECT_STATUSES = ['Planning', 'Fieldwork', 'Reporting', 'Finish'] as const

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#009CDE] min-h-[44px] bg-white'
const selectCls = inputCls

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const emptyForm = () => ({
  proposalName:  '',
  clientName:    '',
  clientInitial: '',
  projectOwner:  '',
  micInitial:    '',
  status:        'Planning' as string,
  startedDate:   '',
  endDate:       '',
  confirmedFee:  '',
  spk:           '',
  pks:           '',
  teamMembers:   [] as string[],
})

export default function NewProjectPage() {
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [form, setForm]       = useState(emptyForm())
  const [tmAddInput, setTmAddInput] = useState('')
  const [saving, setSaving]   = useState(false)
  const [dateError, setDateError] = useState('')
  const [toast, setToast]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/team').then((r) => r.json()).then(setTeamMembers).catch(() => {})
  }, [])

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      const start = field === 'startedDate' ? value : next.startedDate
      const end   = field === 'endDate'     ? value : next.endDate
      setDateError(start && end && end < start ? 'End date tidak boleh sebelum start date' : '')
      return next
    })
  }

  function addTeamMember(initial: string) {
    if (!initial || form.teamMembers.includes(initial)) return
    setForm((f) => ({ ...f, teamMembers: [...f.teamMembers, initial] }))
    setTmAddInput('')
  }

  function removeTeamMember(initial: string) {
    setForm((f) => ({ ...f, teamMembers: f.teamMembers.filter((t) => t !== initial) }))
  }

  async function handleSubmit() {
    if (!form.proposalName.trim() || !form.clientName.trim()) {
      setToast('Proposal Name dan Client Name wajib diisi')
      setTimeout(() => setToast(null), 3000)
      return
    }
    if (dateError) return
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? res.statusText)
      }
      router.push('/projects')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setToast('Error: ' + message)
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSaving(false)
    }
  }

  const tmOptions = [{ initial: '', fullName: '—' }, ...teamMembers]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-gray-200 flex items-center px-4 py-3 gap-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 text-gray-500 hover:text-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-gray-800">Tambah Project</h1>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors min-h-[44px]"
          style={{ backgroundColor: '#009CDE' }}
        >
          {saving ? 'Saving...' : 'Tambah'}
        </button>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-4 p-4 pb-32">

        <Field label="Proposal Name" required>
          <input
            className={inputCls}
            value={form.proposalName}
            onChange={(e) => set('proposalName', e.target.value)}
            placeholder="Nama proposal / engagement"
          />
        </Field>

        <Field label="Client Name" required>
          <input
            className={inputCls}
            value={form.clientName}
            onChange={(e) => set('clientName', e.target.value)}
            placeholder="Nama lengkap client"
          />
        </Field>

        <Field label="Client Initial">
          <input
            className={inputCls}
            value={form.clientInitial}
            onChange={(e) => set('clientInitial', e.target.value.toUpperCase().slice(0, 6))}
            placeholder="e.g. BRI"
            maxLength={6}
          />
        </Field>

        <Field label="Project Owner">
          <select
            className={selectCls}
            value={form.projectOwner}
            onChange={(e) => set('projectOwner', e.target.value)}
          >
            <option value="">— (opsional)</option>
            <option value="ITGRC-S">ITGRC-S</option>
            <option value="Non ITGRC-S">Non ITGRC-S</option>
          </select>
        </Field>

        <Field label="MIC">
          <select
            className={selectCls}
            value={form.micInitial}
            onChange={(e) => set('micInitial', e.target.value)}
          >
            {tmOptions.map((m) => (
              <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            className={selectCls}
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Start Date">
          <input
            type="date"
            className={inputCls}
            value={form.startedDate}
            onChange={(e) => set('startedDate', e.target.value)}
          />
        </Field>

        <Field label="End Date">
          <input
            type="date"
            className={inputCls}
            value={form.endDate}
            min={form.startedDate || undefined}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </Field>
        {dateError && <p className="text-xs text-red-500 -mt-2">{dateError}</p>}

        <Field label="Confirmed Fee (Rp)">
          <CurrencyInput value={form.confirmedFee} onChange={(v) => set('confirmedFee', v)} />
        </Field>

        <Field label="SPK (No.)">
          <input
            className={inputCls}
            value={form.spk}
            onChange={(e) => set('spk', e.target.value)}
            placeholder="(opsional)"
          />
        </Field>

        <Field label="PKS (No.)">
          <input
            className={inputCls}
            value={form.pks}
            onChange={(e) => set('pks', e.target.value)}
            placeholder="(opsional)"
          />
        </Field>

        <Field label="Team Members">
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
            {form.teamMembers.length === 0 && (
              <span className="text-xs text-gray-400 py-1">No team members added</span>
            )}
            {form.teamMembers.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                {t}
                <button type="button" onClick={() => removeTeamMember(t)}
                  className="text-blue-400 hover:text-blue-700 transition-colors ml-0.5">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              className={`${selectCls} flex-1`}
              value={tmAddInput}
              onChange={(e) => setTmAddInput(e.target.value)}
            >
              <option value="">Add member…</option>
              {teamMembers
                .filter((m) => m.initial !== form.micInitial && !form.teamMembers.includes(m.initial))
                .map((m) => <option key={m.initial} value={m.initial}>{m.initial} – {m.fullName}</option>)}
            </select>
            <button
              type="button"
              onClick={() => addTeamMember(tmAddInput)}
              disabled={!tmAddInput}
              className="px-3 py-2 text-sm font-medium bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-40 transition-colors shrink-0"
            >
              Add
            </button>
          </div>
        </Field>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-red-600 text-white text-sm rounded-xl shadow-xl">
          <span className="flex-1">{toast}</span>
          <button onClick={() => setToast(null)} className="text-white/70 hover:text-white shrink-0">✕</button>
        </div>
      )}
    </div>
  )
}
