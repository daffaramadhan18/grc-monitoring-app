'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { OPP_STATUSES } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceType {
  id: number
  name: string
  subServices: { id: number; name: string; serviceTypeId: number }[]
}

interface TeamMember { id: number; initial: string; fullName: string; level: string }

interface Props {
  serviceTypes: ServiceType[]
  teamMembers: TeamMember[]
}

// ─── Sub-service map ──────────────────────────────────────────────────────────

const SUB_SERVICES: Record<string, string[]> = {
  'IT GRC': [
    'IT Audit & Compliance', 'LPS-SCV', 'Managed Service',
    'IT Maturity', 'OT Audit', 'MRTI', 'IT Governance', 'ISO',
  ],
  'Cybersecurity': [
    'VAPT', 'Red Teaming', 'Cyber Maturity Assessment', 'Managed Service',
  ],
  'Privacy': [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  serviceTypeId: '',
  subServiceId:  '',
  phase:         '',
  status:        'In progress',
  probability:   '',
  riskLevel:     '',
  harga:         '',
  revenueCf:     '',
  rrPercentage:  '',
  expectedDate:  '',
  submittedDate: '',
  notes:         '',
  micInitial:    '',
  tm1Initial:    '',
  tm2Initial:    '',
  tm3Initial:    '',
  tm4Initial:    '',
  tm5Initial:    '',
  tm6Initial:    '',
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function OpportunityNewPage({ serviceTypes, teamMembers }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState<string | null>(null)

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'serviceTypeId') next.subServiceId = ''
      return next
    })
  }

  const selectedTypeName = serviceTypes.find((s) => String(s.id) === form.serviceTypeId)?.name ?? ''
  const availableSubs    = SUB_SERVICES[selectedTypeName] ?? []
  const tmOptions        = [{ initial: '', fullName: '—' }, ...teamMembers]

  async function handleSubmit() {
    if (!form.proposalName || !form.clientName) {
      setToast('Proposal Name dan Client Name wajib diisi')
      setTimeout(() => setToast(null), 3000)
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? res.statusText)
      }
      router.push('/opportunities')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setToast('Error: ' + message)
      setTimeout(() => setToast(null), 4000)
    } finally {
      setSaving(false)
    }
  }

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
        <h1 className="flex-1 text-center text-base font-semibold text-gray-800">Tambah Opportunity</h1>
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
            placeholder="Nama proposal"
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

        <Field label="Service Type">
          <select
            className={selectCls}
            value={form.serviceTypeId}
            onChange={(e) => set('serviceTypeId', e.target.value)}
          >
            <option value="">— (opsional)</option>
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Sub-service">
          <select
            className={selectCls}
            value={form.subServiceId}
            onChange={(e) => set('subServiceId', e.target.value)}
            disabled={!form.serviceTypeId || availableSubs.length === 0}
          >
            <option value="">
              {!form.serviceTypeId
                ? '— (pilih service type dulu)'
                : availableSubs.length === 0
                  ? 'Tidak ada sub-service'
                  : '— (opsional)'}
            </option>
            {availableSubs.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Phase">
          <select
            className={selectCls}
            value={form.phase}
            onChange={(e) => set('phase', e.target.value)}
          >
            <option value="">— (opsional)</option>
            {['RFP', 'RFI', 'Diskusi Awal', 'Transferred'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>

        <Field label="Status" required>
          <select
            className={selectCls}
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
          >
            {OPP_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Probability">
          <select
            className={selectCls}
            value={form.probability}
            onChange={(e) => set('probability', e.target.value)}
          >
            <option value="">— (opsional)</option>
            {['Low', 'Medium', 'High'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>

        <Field label="Risk Level">
          <select
            className={selectCls}
            value={form.riskLevel}
            onChange={(e) => set('riskLevel', e.target.value)}
          >
            <option value="">— (opsional)</option>
            {['Low', 'Medium', 'High'].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>

        <Field label="Harga (Rp)">
          <CurrencyInput value={form.harga} onChange={(v) => set('harga', v)} />
        </Field>

        <Field label="Revenue CF (Rp)">
          <CurrencyInput value={form.revenueCf} onChange={(v) => set('revenueCf', v)} />
        </Field>

        <Field label="%RR">
          <input
            type="number"
            step="0.01"
            className={inputCls}
            value={form.rrPercentage}
            onChange={(e) => set('rrPercentage', e.target.value)}
            placeholder="0"
          />
        </Field>

        <Field label="Submitted Date">
          <input
            type="date"
            className={inputCls}
            value={form.submittedDate}
            onChange={(e) => set('submittedDate', e.target.value)}
          />
        </Field>

        <Field label="Expected Date">
          <input
            type="date"
            className={inputCls}
            value={form.expectedDate}
            onChange={(e) => set('expectedDate', e.target.value)}
          />
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

        {(['tm1Initial', 'tm2Initial', 'tm3Initial', 'tm4Initial', 'tm5Initial', 'tm6Initial'] as const).map((k, i) => (
          <Field key={k} label={`TM${i + 1}`}>
            <select
              className={selectCls}
              value={form[k]}
              onChange={(e) => set(k, e.target.value)}
            >
              {tmOptions.map((m) => (
                <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>
              ))}
            </select>
          </Field>
        ))}

        <Field label="Notes">
          <textarea
            className={inputCls}
            rows={3}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="(opsional)"
            style={{ minHeight: 80 }}
          />
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
