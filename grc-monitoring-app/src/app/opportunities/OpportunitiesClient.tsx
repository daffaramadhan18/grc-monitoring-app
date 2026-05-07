'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, Download, Upload, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
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
  serviceTypeId: number | null; serviceType: ServiceType | null
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

type SortField = 'proposalName' | 'client' | 'status' | 'harga' | 'expectedDate'
type SortDir   = 'asc' | 'desc'

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown size={12} className="inline ml-1 text-gray-300" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="inline ml-1 text-[#009CDE]" />
    : <ChevronDown size={12} className="inline ml-1 text-[#009CDE]" />
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OpportunitiesClient({
  opportunities: initial, serviceTypes, teamMembers,
}: Props) {
  const router = useRouter()
  const [opps, setOpps]           = useState<Opp[]>(initial)
  const [modalOpen, setModal]     = useState(false)
  const [editing, setEditing]     = useState<Opp | null>(null)
  const [form, setForm]           = useState(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [deleting, setDel]        = useState<number | null>(null)
  const [importOpen, setImport]   = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: { row: number; reason: string }[] } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  // Sort state
  const [sortField, setSortField] = useState<SortField>('proposalName')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')

  // Multi-select state
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

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
      serviceTypeId: opp.serviceTypeId != null ? String(opp.serviceTypeId) : '',
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
    if (!form.proposalName || !form.clientName) return
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
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s })
      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setDel(null)
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Hapus ${selected.size} opportunity yang dipilih?`)) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selected].map((id) =>
        fetch(`/api/opportunities/${id}`, { method: 'DELETE' })
      ))
      setOpps((prev) => prev.filter((o) => !selected.has(o.id)))
      setSelected(new Set())
      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleSelectAll() {
    if (selected.size === sortedOpps.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sortedOpps.map((o) => o.id)))
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedOpps = useMemo(() => {
    return [...opps].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortField === 'proposalName') { av = a.proposalName; bv = b.proposalName }
      else if (sortField === 'client')  { av = a.client.initial; bv = b.client.initial }
      else if (sortField === 'status')  { av = a.status; bv = b.status }
      else if (sortField === 'harga')   { av = a.harga ?? 0; bv = b.harga ?? 0 }
      else if (sortField === 'expectedDate') { av = a.expectedDate ?? ''; bv = b.expectedDate ?? '' }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [opps, sortField, sortDir])

  const tmOptions = [{ initial: '', fullName: '—' }, ...teamMembers]

  function triggerDownload(blob: Blob, filename: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function handleExport() {
    const res = await fetch('/api/opportunities/export')
    if (!res.ok) { alert('Export failed'); return }
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') ?? ''
    const match = cd.match(/filename="(.+)"/)
    triggerDownload(blob, match?.[1] ?? 'Opportunities_Export.xlsx')
  }

  async function handleTemplateDownload() {
    const res = await fetch('/api/opportunities/template')
    if (!res.ok) { alert('Download failed'); return }
    const blob = await res.blob()
    triggerDownload(blob, 'Opportunities_Template.xlsx')
  }

  async function handleImport() {
    if (!importFile) { alert('Please select a file'); return }
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const res = await fetch('/api/opportunities/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setImportResult(data)
      router.refresh()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const thCls = 'px-4 py-3 text-gray-500 font-medium select-none'
  const thSortCls = `${thCls} cursor-pointer hover:text-gray-700`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Opportunities</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={16} /> Export
          </button>
          <button onClick={() => { setImport(true); setImportFile(null); setImportResult(null) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Upload size={16} /> Import
          </button>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#009CDE] text-white text-sm font-medium rounded-lg hover:bg-[#007BB5] transition-colors">
            <Plus size={16} /> Add Opportunity
          </button>
        </div>
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

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#009CDE]/10 border border-[#009CDE]/30 rounded-lg text-sm">
          <span className="font-medium text-[#006fa0]">{selected.size} dipilih</span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={13} /> {bulkDeleting ? 'Menghapus...' : 'Hapus yang dipilih'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-600 ml-auto">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={sortedOpps.length > 0 && selected.size === sortedOpps.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-[#009CDE] focus:ring-[#009CDE]"
                  />
                </th>
                <th className={`text-left ${thSortCls} min-w-[180px]`} onClick={() => handleSort('proposalName')}>
                  Proposal Name <SortIcon field="proposalName" current={sortField} dir={sortDir} />
                </th>
                <th className={`text-left ${thSortCls}`} onClick={() => handleSort('client')}>
                  Client <SortIcon field="client" current={sortField} dir={sortDir} />
                </th>
                <th className={`text-left ${thCls}`}>Service</th>
                <th className={`text-left ${thCls}`}>Sub-service</th>
                <th className={`text-left ${thCls}`}>Fase</th>
                <th className={`text-left ${thSortCls}`} onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" current={sortField} dir={sortDir} />
                </th>
                <th className={`text-right ${thSortCls}`} onClick={() => handleSort('harga')}>
                  Harga <SortIcon field="harga" current={sortField} dir={sortDir} />
                </th>
                <th className={`text-left ${thCls}`}>Prob.</th>
                <th className={`text-left ${thSortCls}`} onClick={() => handleSort('expectedDate')}>
                  Expected <SortIcon field="expectedDate" current={sortField} dir={sortDir} />
                </th>
                <th className={`text-left ${thCls}`}>MIC</th>
                <th className={`text-left ${thCls}`}>Team</th>
                <th className={`text-left ${thCls}`}>Notes</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedOpps.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-gray-400">
                    Belum ada opportunity. Klik &ldquo;Add Opportunity&rdquo; untuk mulai.
                  </td>
                </tr>
              )}
              {sortedOpps.map((opp) => {
                const team = [opp.tm1Initial, opp.tm2Initial, opp.tm3Initial,
                              opp.tm4Initial, opp.tm5Initial, opp.tm6Initial].filter(Boolean) as string[]
                const isSelected = selected.has(opp.id)
                return (
                  <tr
                    key={opp.id}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-[#009CDE]/5' : 'hover:bg-blue-50/30'}`}
                    onClick={() => openEdit(opp)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleSelect(opp.id)}
                        className="rounded border-gray-300 text-[#009CDE] focus:ring-[#009CDE]"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                      {opp.proposalName}
                    </td>
                    <td className="px-4 py-3 text-gray-600" title={opp.client.fullName}>
                      {opp.client.initial}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{opp.serviceType?.name ?? '—'}</td>
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

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setImport(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Import Opportunities</h2>
              <button onClick={() => setImport(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <button onClick={handleTemplateDownload}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm text-gray-700 rounded-lg hover:bg-gray-50">
                <Download size={14} /> Download Template
              </button>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select .xlsx file</label>
                <input ref={importFileRef} type="file" accept=".xlsx"
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#009CDE]/10 file:text-[#009CDE] hover:file:bg-[#009CDE]/20"
                  onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null) }}
                />
              </div>
              {importResult && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
                  <p className="font-medium text-[#2d7a1a]">{importResult.imported} row(s) imported successfully.</p>
                  {importResult.skipped.length > 0 && (
                    <div>
                      <p className="font-medium text-amber-700 mt-2">{importResult.skipped.length} row(s) skipped:</p>
                      <ul className="list-disc list-inside text-gray-600 text-xs mt-1 space-y-0.5">
                        {importResult.skipped.map((s) => (
                          <li key={s.row}>Row {s.row}: {s.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setImport(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Tutup
                </button>
                <button onClick={handleImport} disabled={!importFile || importing}
                  className="px-5 py-2 text-sm font-medium bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors">
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              {/* Notes */}
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
