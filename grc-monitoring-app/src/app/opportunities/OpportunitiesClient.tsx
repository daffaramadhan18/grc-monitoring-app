'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
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
  clientInitial: string | null
  serviceTypeId: number | null; serviceType: ServiceType | null
  subServiceId: number | null; subService: SubService | null
  phase: string | null; status: string; probability: string | null
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

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm = () => ({
  proposalName: '', clientName: '', clientInitial: '', serviceTypeId: '', subServiceId: '',
  phase: '', status: 'In progress', probability: '',
  harga: '', revenueCf: '', rrPercentage: '',
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

// ─── Resizable column hook ────────────────────────────────────────────────────

const MIN_COL_WIDTH = 80

function useResizableColumns(count: number, defaultWidths: number[]) {
  const [widths, setWidths] = useState<number[]>(defaultWidths)
  const dragging = useRef<{ col: number; startX: number; startW: number } | null>(null)

  const onMouseDown = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = { col, startX: e.clientX, startW: widths[col] }
  }, [widths])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const { col, startX, startW } = dragging.current
      const delta = e.clientX - startX
      setWidths((prev) => {
        const next = [...prev]
        next[col] = Math.max(MIN_COL_WIDTH, startW + delta)
        return next
      })
    }
    function onMouseUp() { dragging.current = null }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return { widths, onMouseDown }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

// Column order: Client Initial, Client Name, Service Type, Sub-service, Proposal Name,
//               Phase, Submitted Date, Status, Probability, Notes, %RR,
//               Harga, Revenue CF, MIC, TM1–TM6
const DEFAULT_WIDTHS = [
  40,  // checkbox
  90,  // Client Initial
  140, // Client Name
  110, // Service Type
  120, // Sub-service
  180, // Proposal Name
  90,  // Phase
  110, // Submitted Date
  130, // Status
  90,  // Probability
  140, // Notes
  70,  // %RR
  130, // Harga
  130, // Revenue CF
  70,  // MIC
  60,  // TM1
  60,  // TM2
  60,  // TM3
  60,  // TM4
  60,  // TM5
  60,  // TM6
  44,  // delete
]

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

  const [sortField, setSortField] = useState<SortField>('proposalName')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')
  const [selected, setSelected]   = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const { widths, onMouseDown } = useResizableColumns(DEFAULT_WIDTHS.length, DEFAULT_WIDTHS)

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
      clientInitial: opp.clientInitial  ?? '',
      serviceTypeId: opp.serviceTypeId != null ? String(opp.serviceTypeId) : '',
      subServiceId:  opp.subService?.name ?? '',
      phase:         opp.phase          ?? '',
      status:        opp.status,
      probability:   opp.probability   ?? '',
      harga:         opp.harga         != null ? String(opp.harga)        : '',
      revenueCf:     opp.revenueCf     != null ? String(opp.revenueCf)    : '',
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

  // ─── Resize handle ────────────────────────────────────────────────────────────

  // col index (0-based, skipping checkbox col 0 and delete col last)
  // We give resize handles to cols 1..N-2
  function ResizeHandle({ col }: { col: number }) {
    return (
      <span
        onMouseDown={(e) => onMouseDown(col, e)}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#009CDE]/30 select-none z-10"
        style={{ touchAction: 'none' }}
      />
    )
  }

  const thBase = 'relative px-3 py-3 text-gray-500 font-medium text-left text-xs whitespace-nowrap overflow-hidden'
  const thSort = `${thBase} cursor-pointer hover:text-gray-700 select-none`

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
        {(['Win','In progress','Waiting for Result','Backlog'] as const).map((s) => (
          <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${OPP_STATUS_COLORS[s]}`}>
            {s}: {opps.filter((o) => o.status === s).length}
          </span>
        ))}
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Total: {opps.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
        {selected.size > 0 && (
          <div className="absolute bottom-0 inset-x-0 z-10 flex items-center gap-3 px-5 py-3 bg-[#2D2D2D] text-white text-sm rounded-b-xl">
            <span className="font-medium">{selected.size} item dipilih</span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              <Trash2 size={13} /> {bulkDeleting ? 'Menghapus...' : 'Hapus'}
            </button>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto text-white/50 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        )}

        <div className={`overflow-x-auto${selected.size > 0 ? ' pb-12' : ''}`}>
          <table className="text-sm border-collapse" style={{ tableLayout: 'fixed', width: widths.reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {/* Checkbox */}
                <th className={thBase} style={{ width: widths[0] }}>
                  <input type="checkbox"
                    checked={sortedOpps.length > 0 && selected.size === sortedOpps.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 accent-[#009CDE] cursor-pointer"
                  />
                </th>
                {/* Client Initial */}
                <th className={thBase} style={{ width: widths[1] }}>
                  Client Initial<ResizeHandle col={1} />
                </th>
                {/* Client Name */}
                <th className={`${thSort}`} style={{ width: widths[2] }} onClick={() => handleSort('client')}>
                  Client Name<SortIcon field="client" current={sortField} dir={sortDir} />
                  <ResizeHandle col={2} />
                </th>
                {/* Service Type */}
                <th className={thBase} style={{ width: widths[3] }}>
                  Service Type<ResizeHandle col={3} />
                </th>
                {/* Sub-service */}
                <th className={thBase} style={{ width: widths[4] }}>
                  Sub-service<ResizeHandle col={4} />
                </th>
                {/* Proposal Name */}
                <th className={thSort} style={{ width: widths[5] }} onClick={() => handleSort('proposalName')}>
                  Proposal Name<SortIcon field="proposalName" current={sortField} dir={sortDir} />
                  <ResizeHandle col={5} />
                </th>
                {/* Phase */}
                <th className={thBase} style={{ width: widths[6] }}>
                  Phase<ResizeHandle col={6} />
                </th>
                {/* Submitted Date */}
                <th className={thBase} style={{ width: widths[7] }}>
                  Submitted Date<ResizeHandle col={7} />
                </th>
                {/* Status */}
                <th className={thSort} style={{ width: widths[8] }} onClick={() => handleSort('status')}>
                  Status<SortIcon field="status" current={sortField} dir={sortDir} />
                  <ResizeHandle col={8} />
                </th>
                {/* Probability */}
                <th className={thBase} style={{ width: widths[9] }}>
                  Prob.<ResizeHandle col={9} />
                </th>
                {/* Notes */}
                <th className={thBase} style={{ width: widths[10] }}>
                  Notes<ResizeHandle col={10} />
                </th>
                {/* %RR */}
                <th className={thBase} style={{ width: widths[11] }}>
                  %RR<ResizeHandle col={11} />
                </th>
                {/* Harga */}
                <th className={thSort} style={{ width: widths[12] }} onClick={() => handleSort('harga')}>
                  Harga<SortIcon field="harga" current={sortField} dir={sortDir} />
                  <ResizeHandle col={12} />
                </th>
                {/* Revenue CF */}
                <th className={thBase} style={{ width: widths[13] }}>
                  Revenue CF<ResizeHandle col={13} />
                </th>
                {/* MIC */}
                <th className={thBase} style={{ width: widths[14] }}>
                  MIC<ResizeHandle col={14} />
                </th>
                {/* TM1–TM6 */}
                {[15,16,17,18,19,20].map((ci, i) => (
                  <th key={ci} className={thBase} style={{ width: widths[ci] }}>
                    TM{i+1}<ResizeHandle col={ci} />
                  </th>
                ))}
                {/* Delete */}
                <th className={thBase} style={{ width: widths[21] }} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedOpps.length === 0 && (
                <tr>
                  <td colSpan={22} className="px-4 py-10 text-center text-gray-400">
                    Belum ada opportunity. Klik &ldquo;Add Opportunity&rdquo; untuk mulai.
                  </td>
                </tr>
              )}
              {sortedOpps.map((opp) => {
                const isSelected = selected.has(opp.id)
                return (
                  <tr
                    key={opp.id}
                    className={`group cursor-pointer transition-colors ${isSelected ? 'bg-[#009CDE]/8' : 'hover:bg-gray-50'}`}
                    onClick={() => openEdit(opp)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleSelect(opp.id)}
                        className={`rounded border-gray-300 accent-[#009CDE] cursor-pointer transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 font-mono text-xs truncate">
                      {opp.clientInitial ?? opp.client.initial}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 truncate" title={opp.client.fullName}>
                      {opp.client.fullName}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 truncate">{opp.serviceType?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 truncate">{opp.subService?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 truncate">{opp.proposalName}</td>
                    <td className="px-3 py-2.5 text-gray-500 truncate">{opp.phase ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(opp.submittedDate)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${OPP_STATUS_COLORS[opp.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {opp.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 truncate">{opp.probability ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 truncate text-xs">{opp.notes ?? ''}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-right">{opp.rrPercentage != null ? `${opp.rrPercentage}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 text-right whitespace-nowrap">{formatRupiah(opp.harga)}</td>
                    <td className="px-3 py-2.5 text-gray-700 text-right whitespace-nowrap">{formatRupiah(opp.revenueCf)}</td>
                    <td className="px-3 py-2.5 text-gray-600 truncate">{opp.micInitial ?? '—'}</td>
                    {[opp.tm1Initial, opp.tm2Initial, opp.tm3Initial, opp.tm4Initial, opp.tm5Initial, opp.tm6Initial].map((t, i) => (
                      <td key={i} className="px-3 py-2.5 text-gray-500 truncate">
                        {t ? <TeamBadge initial={t} /> : <span className="text-gray-200">—</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
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

      {/* ── Add/Edit Modal ────────────────────────────────────────────────── */}
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

              {/* 2–3. Client Initial + Client Name */}
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

              {/* 4–5. Service Type + Sub-service */}
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

              {/* 6–7–8. Phase + Status + Probability */}
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
                <Field label="Probability">
                  <select className={selectCls} value={form.probability}
                    onChange={(e) => set('probability', e.target.value)}>
                    <option value="">— (opsional)</option>
                    {['High','Medium','Low'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
              </div>

              {/* 9–10–11. Harga + Revenue CF + %RR */}
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

              {/* 12–13. Dates */}
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

              {/* 14. MIC + TM1–TM3 */}
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
