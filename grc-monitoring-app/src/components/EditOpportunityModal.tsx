'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'
import { OPP_STATUSES, toInputDate } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OppFull {
  id: number
  proposalName: string
  clientName: string | null
  clientInitial: string | null
  serviceTypeId: number | null
  serviceType: { id: number; name: string } | null
  subServiceId: number | null
  subService: { id: number; name: string; serviceTypeId: number } | null
  phase: string | null
  status: string
  probability: number | null
  riskLevel: string | null
  harga: number | null
  revenueCf: number | null
  rrPercentage: number | null
  expectedDate: string | null
  submittedDate: string | null
  notes: string | null
  micInitial: string | null
  tm1Initial: string | null
  tm2Initial: string | null
  tm3Initial: string | null
  tm4Initial: string | null
  tm5Initial: string | null
  tm6Initial: string | null
}

interface ServiceType { id: number; name: string }
interface TeamMember  { id: number; initial: string; fullName: string; level: string }

interface Props {
  open: boolean
  onClose: () => void
  opp: OppFull | null   // null = new opportunity
  serviceTypes: ServiceType[]
  teamMembers: TeamMember[]
  onSaved: (saved: OppFull) => void
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

const emptyForm = () => ({
  proposalName: '', clientName: '', clientInitial: '', serviceTypeId: '', subServiceId: '',
  phase: '', status: 'In progress', probability: '', riskLevel: '',
  harga: '', revenueCf: '', rrPercentage: '',
  expectedDate: '', submittedDate: '', notes: '',
  micInitial: '',
  tm1Initial: '', tm2Initial: '', tm3Initial: '',
  tm4Initial: '', tm5Initial: '', tm6Initial: '',
})

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

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009CDE]'
const selectCls = inputCls

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditOpportunityModal({
  open, onClose, opp, serviceTypes, teamMembers, onSaved,
}: Props) {
  const router = useRouter()
  const [form, setForm]     = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  // Sync form when opp changes
  useEffect(() => {
    if (!open) return
    if (opp) {
      setForm({
        proposalName:  opp.proposalName,
        clientName:    opp.clientName    ?? '',
        clientInitial: opp.clientInitial ?? '',
        serviceTypeId: opp.serviceTypeId != null ? String(opp.serviceTypeId) : '',
        subServiceId:  opp.subService?.name ?? '',
        phase:         opp.phase          ?? '',
        status:        opp.status,
        probability:   opp.probability   != null ? String(opp.probability)   : '',
        riskLevel:     opp.riskLevel     ?? '',
        harga:         opp.harga         != null ? String(opp.harga)         : '',
        revenueCf:     opp.revenueCf     != null ? String(opp.revenueCf)     : '',
        rrPercentage:  opp.rrPercentage  != null ? String(opp.rrPercentage)  : '',
        expectedDate:  toInputDate(opp.expectedDate),
        submittedDate: toInputDate(opp.submittedDate),
        notes:         opp.notes         ?? '',
        micInitial:    opp.micInitial    ?? '',
        tm1Initial:    opp.tm1Initial    ?? '',
        tm2Initial:    opp.tm2Initial    ?? '',
        tm3Initial:    opp.tm3Initial    ?? '',
        tm4Initial:    opp.tm4Initial    ?? '',
        tm5Initial:    opp.tm5Initial    ?? '',
        tm6Initial:    opp.tm6Initial    ?? '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, opp])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.proposalName || !form.clientName) return
    setSaving(true)
    try {
      const url    = opp ? `/api/opportunities/${opp.id}` : '/api/opportunities'
      const method = opp ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? res.statusText)
      onSaved(body as OppFull)
      onClose()
      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            {opp ? 'Edit Opportunity' : 'New Opportunity'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          <Field label="Proposal Name" required>
            <input className={inputCls} value={form.proposalName}
              onChange={(e) => set('proposalName', e.target.value)} required autoFocus />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Client Initial">
              <input className={inputCls} value={form.clientInitial}
                onChange={(e) => set('clientInitial', e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. BRI" maxLength={6} />
            </Field>
            <div className="col-span-2">
              <Field label="Client Name" required>
                <input className={inputCls} value={form.clientName}
                  onChange={(e) => set('clientName', e.target.value)}
                  required placeholder="Nama lengkap client" />
              </Field>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Service Type">
              <select className={selectCls} value={form.serviceTypeId}
                onChange={(e) => set('serviceTypeId', e.target.value)}>
                <option value="">— (opsional)</option>
                {serviceTypes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Sub-service">
              <select className={selectCls} value={form.subServiceId}
                onChange={(e) => set('subServiceId', e.target.value)}
                disabled={!form.serviceTypeId || availableSubs.length === 0}>
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
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Phase">
              <select className={selectCls} value={form.phase}
                onChange={(e) => set('phase', e.target.value)}>
                <option value="">— (opsional)</option>
                {['RFP','RFI','Diskusi Awal','Transferred'].map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Status" required>
              <select className={selectCls} value={form.status}
                onChange={(e) => set('status', e.target.value)} required>
                {OPP_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Risk Level">
              <select className={selectCls} value={form.riskLevel}
                onChange={(e) => set('riskLevel', e.target.value)}>
                <option value="">— (opsional)</option>
                {['Low','Medium','High'].map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Probability (%)">
              <div className="relative">
                <input type="number" min={0} max={100} step={1} className={inputCls}
                  value={form.probability}
                  onChange={(e) => set('probability', e.target.value)}
                  placeholder="e.g. 75" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">%</span>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Harga (IDR)">
              <CurrencyInput value={form.harga} onChange={(v) => set('harga', v)} />
            </Field>
            <Field label="Revenue CF (IDR)">
              <CurrencyInput value={form.revenueCf} onChange={(v) => set('revenueCf', v)} />
            </Field>
            <Field label="%RR">
              <input type="number" step="0.01" className={inputCls} value={form.rrPercentage}
                onChange={(e) => set('rrPercentage', e.target.value)} placeholder="0" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Expected Date">
              <input type="date" className={inputCls} value={form.expectedDate}
                onChange={(e) => set('expectedDate', e.target.value)} />
            </Field>
            <Field label="Submitted Date">
              <input type="date" className={inputCls} value={form.submittedDate}
                onChange={(e) => set('submittedDate', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <Field label="MIC">
              <select className={selectCls} value={form.micInitial}
                onChange={(e) => set('micInitial', e.target.value)}>
                {tmOptions.map((m) => (
                  <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>
                ))}
              </select>
            </Field>
            {(['tm1Initial','tm2Initial','tm3Initial'] as const).map((k, i) => (
              <Field key={k} label={`TM${i+1}`}>
                <select className={selectCls} value={form[k]}
                  onChange={(e) => set(k, e.target.value)}>
                  {tmOptions.map((m) => (
                    <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(['tm4Initial','tm5Initial','tm6Initial'] as const).map((k, i) => (
              <Field key={k} label={`TM${i+4}`}>
                <select className={selectCls} value={form[k]}
                  onChange={(e) => set(k, e.target.value)}>
                  {tmOptions.map((m) => (
                    <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>
                  ))}
                </select>
              </Field>
            ))}
          </div>

          <Field label="Notes">
            <textarea className={inputCls} rows={3} value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="(opsional)" />
          </Field>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors">
              {saving ? 'Menyimpan...' : (opp ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
