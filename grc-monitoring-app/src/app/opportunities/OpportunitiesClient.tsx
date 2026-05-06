'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'
import CurrencyInput from '@/components/ui/CurrencyInput'
import QuarterlySection from './QuarterlySection'
import { formatRupiah, formatDate, toInputDate, OPP_STATUSES, OPP_STATUS_COLORS } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client      { id: number; initial: string; fullName: string }
interface ServiceType { id: number; name: string }
interface SubService  { id: number; name: string; serviceTypeId: number }
interface TeamMember  { id: number; initial: string; fullName: string; level: string }
interface Opp {
  id: number; proposalName: string; clientId: number; client: Client
  serviceTypeId: number; serviceType: ServiceType
  subServiceId: number | null; subService: SubService | null
  fase: string | null; status: string; probability: string | null
  harga: number | null; revenueCf: number | null; rrPercentage: number | null
  expectedDate: string | null; submittedDate: string | null; notes: string | null
  micInitial: string | null
  tm1Initial: string | null; tm2Initial: string | null; tm3Initial: string | null
  tm4Initial: string | null; tm5Initial: string | null; tm6Initial: string | null
}

interface Props {
  opportunities: Opp[]
  serviceTypes: ServiceType[]
  teamMembers: TeamMember[]
}

// ─── Sub-service map (hardcoded per spec) ─────────────────────────────────────

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

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm = () => ({
  proposalName: '', clientName: '', serviceTypeId: '', subServiceId: '',
  fase: '', status: 'Submitted', probability: '',
  revenueCf: '', harga: '', rrPercentage: '',
  expectedDate: '', submittedDate: '', notes: '',
  micInitial: '',
  tm1Initial: '', tm2Initial: '', tm3Initial: '',
  tm4Initial: '', tm5Initial: '', tm6Initial: '',
})

// ─── Small components ─────────────────────────────────────────────────────────

function TeamBadge({ initial }: { initial: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
      {initial}
    </span>
  )
}

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OpportunitiesClient({
  opportunities: initial, serviceTypes, teamMembers,
}: Props) {
  const router = useRouter()
  const [opps, setOpps]       = useState<Opp[]>(initial)
  const [modalOpen, setModal] = useState(false)
  const [editing, setEditing] = useState<Opp | null>(null)
  const [form, setForm]       = useState(emptyForm())
  const [saving, setSaving]   = useState(false)
  const [deleting, setDel]    = useState<number | null>(null)

  // Sub-services for currently selected service type name
  const selectedTypeName = serviceTypes.find((s) => String(s.id) === form.serviceTypeId)?.name ?? ''
  const availableSubs    = SUB_SERVICES[selectedTypeName] ?? []

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'serviceTypeId') next.subServiceId = ''
      return next
    })
  }

  function openNew() {
    setEditing(null)
    setForm(emptyForm())
    setModal(true)
  }

  function openEdit(opp: Opp) {
    setEditing(opp)
    setForm({
      proposalName:  opp.proposalName,
      clientName:    opp.client.fullName,
      serviceTypeId: String(opp.serviceTypeId),
      subServiceId:  opp.subService?.name ?? '',
      fase:          opp.fase          ?? '',
      status:        opp.status,
      probability:   opp.probability   ?? '',
      revenueCf:     opp.revenueCf     != null ? String(opp.revenueCf)    : '',
      harga:         opp.harga         != null ? String(opp.harga)        : '',
      rrPercentage:  opp.rrPercentage  != null ? String(opp.rrPercentage) : '',
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
    setModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.proposalName || !form.clientId || !form.serviceTypeId) return
    setSaving(true)
    try {
      const url    = editing ? `/api/opportunities/${editing.id}` : '/api/opportunities'
      const method = editing ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const saved: Opp = await res.json()
      setOpps((prev) => editing
        ? prev.map((o) => o.id === saved.id ? saved : o)
        : [saved, ...prev])
      setModal(false)
      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Hapus opportunity ini?')) return
    setDel(id)
    try {
      const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setOpps((prev) => prev.filter((o) => o.id !== id))
      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setDel(null)
    }
  }

  const tmOptions = [{ initial: '', fullName: '—' }, ...teamMembers]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Opportunities</h1>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#009CDE] text-white text-sm font-medium rounded-lg hover:bg-[#007BB5] transition-colors"
        >
          <Plus size={16} /> Add Opportunity
        </button>
      </div>

      <QuarterlySection opps={opps} />

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {(['Win','In progress','Waiting for Result','Submitted'] as const).map((s) => (
          <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${OPP_STATUS_COLORS[s]}`}>
            {s}: {opps.filter((o) => o.status === s).length}
          </span>
        ))}
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Total: {opps.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium min-w-[180px]">Proposal Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Service</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Sub-service</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Fase</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Harga</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Prob.</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Expected</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">MIC</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Team</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {opps.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-gray-400">
                    Belum ada opportunity. Klik &ldquo;Add Opportunity&rdquo; untuk mulai.
                  </td>
                </tr>
              )}
              {opps.map((opp) => {
                const team = [opp.tm1Initial, opp.tm2Initial, opp.tm3Initial,
                              opp.tm4Initial, opp.tm5Initial, opp.tm6Initial].filter(Boolean) as string[]
                return (
                  <tr
                    key={opp.id}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => openEdit(opp)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                      {opp.proposalName}
                    </td>
                    <td className="px-4 py-3 text-gray-600" title={opp.client.fullName}>
                      {opp.client.initial}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{opp.serviceType.name}</td>
                    <td className="px-4 py-3 text-gray-600">{opp.subService?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{opp.fase ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${OPP_STATUS_COLORS[opp.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {opp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {formatRupiah(opp.harga)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{opp.probability ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(opp.expectedDate)}</td>
                    <td className="px-4 py-3 text-gray-600">{opp.micInitial ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {team.map((t) => <TeamBadge key={t} initial={t} />)}
                        {team.length === 0 && <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[120px] truncate text-xs">
                      {opp.notes ?? ''}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(opp.id)}
                        disabled={deleting === opp.id}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">
                {editing ? 'Edit Opportunity' : 'New Opportunity'}
              </h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* 1. Proposal Name */}
              <Field label="Proposal Name" required>
                <input className={inputCls} value={form.proposalName}
                  onChange={(e) => set('proposalName', e.target.value)} required autoFocus />
              </Field>

              {/* 2. Client Name */}
              <Field label="Client Name" required>
                <input className={inputCls} value={form.clientName}
                  onChange={(e) => set('clientName', e.target.value)}
                  required placeholder="Nama lengkap client" />
              </Field>

              {/* 3-4. Service Type + Sub-service */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Service Type" required>
                  <select className={selectCls} value={form.serviceTypeId}
                    onChange={(e) => set('serviceTypeId', e.target.value)} required>
                    <option value="">Pilih service type...</option>
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
                        ? 'Pilih service type dulu'
                        : availableSubs.length === 0
                          ? 'Tidak ada sub-service'
                          : '— (opsional)'}
                    </option>
                    {availableSubs.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              {/* 5-6-7. Fase + Status + Probability */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Fase">
                  <select className={selectCls} value={form.fase}
                    onChange={(e) => set('fase', e.target.value)}>
                    <option value="">— (opsional)</option>
                    {['RFP','RFI','Diskusi Awal'].map((f) => <option key={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Opportunity Status" required>
                  <select className={selectCls} value={form.status}
                    onChange={(e) => set('status', e.target.value)} required>
                    {OPP_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Probability">
                  <select className={selectCls} value={form.probability}
                    onChange={(e) => set('probability', e.target.value)}>
                    <option value="">— (opsional)</option>
                    {['High','Medium','Low'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
              </div>

              {/* 8-9-10. Revenue CF + Harga + %RR */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Revenue CF (IDR)">
                  <CurrencyInput value={form.revenueCf} onChange={(v) => set('revenueCf', v)} />
                </Field>
                <Field label="Harga (IDR)">
                  <CurrencyInput value={form.harga} onChange={(v) => set('harga', v)} />
                </Field>
                <Field label="%RR">
                  <input type="number" step="0.01" className={inputCls} value={form.rrPercentage}
                    onChange={(e) => set('rrPercentage', e.target.value)} placeholder="0" />
                </Field>
              </div>

              {/* 11-12. Dates */}
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

              {/* 13. MIC + TM1–TM3 */}
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

              {/* TM4–TM6 */}
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

              {/* 16. Notes */}
              <Field label="Notes">
                <textarea className={inputCls} rows={3} value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="(opsional)" />
              </Field>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-medium bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors">
                  {saving ? 'Menyimpan...' : (editing ? 'Update' : 'Simpan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
