'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X, Download, Upload, ChevronUp, ChevronDown, ChevronsUpDown, Crown, Search } from 'lucide-react'
import MonthFilter from '@/components/MonthFilter'
import { formatRupiah, formatDate, OPP_STATUSES, OPP_STATUS_COLORS } from '@/lib/utils'
import EditOpportunityModal, { type OppFull } from '@/components/EditOpportunityModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceType { id: number; name: string }
interface SubService  { id: number; name: string; serviceTypeId: number }
interface TeamMember  { id: number; initial: string; fullName: string; level: string }
interface Opp {
  id: number; proposalName: string
  clientName: string | null
  clientInitial: string | null
  serviceTypeId: number | null; serviceType: ServiceType | null
  subServiceId: number | null; subService: SubService | null
  phase: string | null; status: string; probability: number | null; riskLevel: string | null
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

// ─── Small components ─────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#009CDE', '#43B02A', '#58595B', '#F59E0B', '#8B5CF6', '#EC4899',
]
function avatarColor(initial: string) {
  const hash = initial.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function AvatarBubble({ initial, isMic }: { initial: string; isMic: boolean }) {
  return (
    <span
      className="relative inline-flex items-center justify-center w-7 h-7 rounded-full text-white font-semibold text-[10px] shrink-0 select-none"
      style={{ backgroundColor: isMic ? '#2D2D2D' : avatarColor(initial) }}
      title={isMic ? `MIC: ${initial}` : initial}
    >
      {initial.slice(0, 2)}
      {isMic && (
        <span className="rsm-crown-float absolute -top-1 -right-1 bg-amber-400 rounded-full p-0.5 flex items-center justify-center">
          <Crown size={7} className="text-white" />
        </span>
      )}
    </span>
  )
}

const RISK_COLORS: Record<string, string> = {
  Low:    'bg-green-100 text-green-700',
  Medium: 'bg-amber-100 text-amber-700',
  High:   'bg-red-100 text-red-700',
}

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-gray-300">—</span>
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${RISK_COLORS[level] ?? 'bg-gray-100 text-gray-600'}`}>
      {level}
    </span>
  )
}

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
//               Phase, Submitted Date, Expected Date, Status, Probability, Risk Level, Notes, %RR,
//               Harga, Revenue CF, Team (MIC+TM1-TM6), delete
const DEFAULT_WIDTHS = [
  40,  // checkbox
  90,  // Client Initial
  140, // Client Name
  110, // Service Type
  120, // Sub-service
  180, // Proposal Name
  90,  // Phase
  110, // Submitted Date
  110, // Expected Date
  130, // Status
  80,  // Probability
  100, // Risk Level
  140, // Notes
  70,  // %RR
  130, // Harga
  130, // Revenue CF
  180, // Team
  44,  // delete
]

export default function OpportunitiesClient({
  opportunities: initial, serviceTypes, teamMembers,
}: Props) {
  const router = useRouter()
  const [opps, setOpps]           = useState<Opp[]>(initial)
  const [modalOpen, setModal]     = useState(false)
  const [editing, setEditing]     = useState<Opp | null>(null)
  const [deleting, setDel]        = useState<number | null>(null)
  const [importOpen, setImport]   = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importSkipped, setImportSkipped] = useState<{ row: number; reason: string }[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  const [sortField, setSortField] = useState<SortField>('proposalName')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')
  const [selected, setSelected]   = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [filterMonth, setFilterMonth] = useState('')

  const [filters, setFilters] = useState({
    search: '',
    statuses: new Set<string>(),
    serviceTypeId: '',
    teamMember: '',
  })

  // Opps visible in the table (month-filtered)
  const monthFilteredOpps = useMemo(() => {
    if (!filterMonth) return opps
    const [y, m] = filterMonth.split('-').map(Number)
    return opps.filter((o) => {
      if (!o.expectedDate) return false
      const d = new Date(o.expectedDate)
      return d.getFullYear() === y && d.getMonth() + 1 === m
    })
  }, [opps, filterMonth])

  function toggleStatusFilter(s: string) {
    setFilters((f) => {
      const next = new Set(f.statuses)
      next.has(s) ? next.delete(s) : next.add(s)
      return { ...f, statuses: next }
    })
  }

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.statuses.size +
    (filters.serviceTypeId ? 1 : 0) +
    (filters.teamMember ? 1 : 0)

  const { widths, onMouseDown } = useResizableColumns(DEFAULT_WIDTHS.length, DEFAULT_WIDTHS)

  function openNew() {
    setEditing(null)
    setModal(true)
  }

  function openEdit(opp: Opp) {
    setEditing(opp)
    setModal(true)
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
    let result = monthFilteredOpps

    if (filters.search)
      result = result.filter((o) =>
        o.proposalName.toLowerCase().includes(filters.search.toLowerCase()) ||
        (o.clientName ?? '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (o.clientInitial ?? '').toLowerCase().includes(filters.search.toLowerCase()))

    if (filters.statuses.size > 0)
      result = result.filter((o) => filters.statuses.has(o.status))

    if (filters.serviceTypeId)
      result = result.filter((o) => String(o.serviceTypeId) === filters.serviceTypeId)

    if (filters.teamMember)
      result = result.filter((o) =>
        [o.micInitial, o.tm1Initial, o.tm2Initial, o.tm3Initial,
         o.tm4Initial, o.tm5Initial, o.tm6Initial].includes(filters.teamMember))

    return [...result].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortField === 'proposalName') { av = a.proposalName; bv = b.proposalName }
      else if (sortField === 'client')  { av = a.clientInitial ?? ''; bv = b.clientInitial ?? '' }
      else if (sortField === 'status')  { av = a.status; bv = b.status }
      else if (sortField === 'harga')   { av = a.harga ?? 0; bv = b.harga ?? 0 }
      else if (sortField === 'expectedDate') { av = a.expectedDate ?? ''; bv = b.expectedDate ?? '' }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [monthFilteredOpps, sortField, sortDir, filters])

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
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const res = await fetch('/api/opportunities/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')

      // Refresh table data from API without full page reload
      const refreshRes = await fetch('/api/opportunities')
      if (refreshRes.ok) {
        const fresh = await refreshRes.json()
        setOpps(fresh)
      }

      // Close modal and show toast
      setImport(false)
      setImportFile(null)
      setImportSkipped(data.skipped ?? [])
      const msg = data.skipped?.length
        ? `${data.imported} rows imported · ${data.skipped.length} skipped`
        : `${data.imported} rows imported successfully`
      setToast(msg)
      setTimeout(() => setToast(null), 4000)
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
    <div className="rsm-page-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Opportunities</h1>
        <div className="flex items-center gap-2">
          <MonthFilter value={filterMonth} onChange={setFilterMonth} />
          <button onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={16} /> Export
          </button>
          <button onClick={() => { setImport(true); setImportFile(null); setImportSkipped([]) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Upload size={16} /> Import
          </button>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 rsm-btn-spring rsm-btn-primary-glow bg-[#009CDE] text-white text-sm font-medium rounded-lg hover:bg-[#007BB5] transition-colors">
            <Plus size={16} /> Add Opportunity
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {(['Win','In progress','Waiting for Result','Backlog'] as const).map((s) => (
          <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${OPP_STATUS_COLORS[s]}`}>
            {s}: {monthFilteredOpps.filter((o) => o.status === s).length}
          </span>
        ))}
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Total: {monthFilteredOpps.length}
        </span>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009CDE]"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </div>
          {/* Service Type */}
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009CDE] min-w-[150px]"
            value={filters.serviceTypeId}
            onChange={(e) => setFilters((f) => ({ ...f, serviceTypeId: e.target.value }))}
          >
            <option value="">All Service Types</option>
            {serviceTypes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {/* Team Member */}
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009CDE] min-w-[150px]"
            value={filters.teamMember}
            onChange={(e) => setFilters((f) => ({ ...f, teamMember: e.target.value }))}
          >
            <option value="">All Team Members</option>
            {teamMembers.map((m) => <option key={m.initial} value={m.initial}>{m.initial} – {m.fullName}</option>)}
          </select>
          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({ search: '', statuses: new Set(), serviceTypeId: '', teamMember: '' })}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <X size={12} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5">
          {OPP_STATUSES.map((s) => {
            const active = filters.statuses.has(s)
            return (
              <button
                key={s}
                onClick={() => toggleStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? `${OPP_STATUS_COLORS[s] ?? 'bg-gray-200 text-gray-700'} border-transparent`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* Result count */}
      {activeFilterCount > 0 && (
        <p className="text-xs text-gray-400 px-1">
          Showing {sortedOpps.length} of {monthFilteredOpps.length} opportunities
        </p>
      )}

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
                {/* Expected Date */}
                <th className={thSort} style={{ width: widths[8] }} onClick={() => handleSort('expectedDate')}>
                  Expected Date<SortIcon field="expectedDate" current={sortField} dir={sortDir} />
                  <ResizeHandle col={8} />
                </th>
                {/* Status */}
                <th className={thSort} style={{ width: widths[9] }} onClick={() => handleSort('status')}>
                  Status<SortIcon field="status" current={sortField} dir={sortDir} />
                  <ResizeHandle col={9} />
                </th>
                {/* Probability */}
                <th className={thBase} style={{ width: widths[10] }}>
                  Prob.<ResizeHandle col={10} />
                </th>
                {/* Risk Level */}
                <th className={thBase} style={{ width: widths[11] }}>
                  Risk<ResizeHandle col={11} />
                </th>
                {/* Notes */}
                <th className={thBase} style={{ width: widths[12] }}>
                  Notes<ResizeHandle col={12} />
                </th>
                {/* %RR */}
                <th className={thBase} style={{ width: widths[13] }}>
                  %RR<ResizeHandle col={13} />
                </th>
                {/* Harga */}
                <th className={thSort} style={{ width: widths[14] }} onClick={() => handleSort('harga')}>
                  Harga<SortIcon field="harga" current={sortField} dir={sortDir} />
                  <ResizeHandle col={14} />
                </th>
                {/* Revenue CF */}
                <th className={thBase} style={{ width: widths[15] }}>
                  Revenue CF<ResizeHandle col={15} />
                </th>
                {/* Team (MIC + TM1–TM6) */}
                <th className={thBase} style={{ width: widths[16] }}>
                  Team<ResizeHandle col={16} />
                </th>
                {/* Delete */}
                <th className={thBase} style={{ width: widths[17] }} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedOpps.length === 0 && (
                <tr>
                  <td colSpan={18} className="px-4 py-10 text-center text-gray-400">
                    Belum ada opportunity. Klik &ldquo;Add Opportunity&rdquo; untuk mulai.
                  </td>
                </tr>
              )}
              {sortedOpps.map((opp) => {
                const isSelected = selected.has(opp.id)
                return (
                  <tr
                    key={opp.id}
                    className={`rsm-row-click group cursor-pointer transition-colors ${isSelected ? 'bg-[#009CDE]/8' : 'hover:bg-gray-50'}`}
                    onClick={() => openEdit(opp)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleSelect(opp.id)}
                        className={`rounded border-gray-300 accent-[#009CDE] cursor-pointer transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 font-mono text-xs truncate">
                      {opp.clientInitial ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 truncate" title={opp.clientName ?? ''}>
                      {opp.clientName ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 truncate">{opp.serviceType?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 truncate">{opp.subService?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 truncate">{opp.proposalName}</td>
                    <td className="px-3 py-2.5 text-gray-500 truncate">{opp.phase ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(opp.submittedDate)}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{formatDate(opp.expectedDate)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${OPP_STATUS_COLORS[opp.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {opp.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 tabular-nums">{opp.probability != null ? `${opp.probability}%` : '—'}</td>
                    <td className="px-3 py-2.5"><RiskBadge level={opp.riskLevel} /></td>
                    <td className="px-3 py-2.5 text-gray-400 truncate text-xs">{opp.notes ?? ''}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-right">{opp.rrPercentage != null ? `${opp.rrPercentage}%` : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700 text-right whitespace-nowrap">{formatRupiah(opp.harga)}</td>
                    <td className="px-3 py-2.5 text-gray-700 text-right whitespace-nowrap">{formatRupiah(opp.revenueCf)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5 flex-wrap">
                        {opp.micInitial && <AvatarBubble initial={opp.micInitial} isMic />}
                        {[opp.tm1Initial, opp.tm2Initial, opp.tm3Initial, opp.tm4Initial, opp.tm5Initial, opp.tm6Initial]
                          .filter(Boolean)
                          .map((t) => <AvatarBubble key={t} initial={t!} isMic={false} />)}
                        {!opp.micInitial && ![opp.tm1Initial, opp.tm2Initial, opp.tm3Initial, opp.tm4Initial, opp.tm5Initial, opp.tm6Initial].some(Boolean) && (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </div>
                    </td>
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
                  onChange={(e) => { setImportFile(e.target.files?.[0] ?? null) }}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setImport(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Tutup
                </button>
                <button onClick={handleImport} disabled={!importFile || importing}
                  className="px-5 py-2 text-sm font-medium rsm-btn-spring rsm-btn-primary-glow bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors">
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ────────────────────────────────────────────────── */}
      <EditOpportunityModal
        open={modalOpen}
        onClose={() => setModal(false)}
        opp={editing as OppFull | null}
        serviceTypes={serviceTypes}
        teamMembers={teamMembers}
        onSaved={(saved) => {
          setOpps((prev) => editing
            ? prev.map((o) => o.id === saved.id ? (saved as Opp) : o)
            : [saved as Opp, ...prev])
        }}
      />

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 px-5 py-3 bg-[#2D2D2D] text-white text-sm rounded-xl shadow-xl">
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-white/50 hover:text-white">
              <X size={14} />
            </button>
          </div>
          {importSkipped.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-xl shadow-xl p-4 text-sm w-80 max-h-48 overflow-y-auto">
              <p className="font-medium text-amber-700 mb-1">{importSkipped.length} row(s) skipped:</p>
              <ul className="list-disc list-inside text-gray-600 text-xs space-y-0.5">
                {importSkipped.map((s) => (
                  <li key={s.row}>Row {s.row}: {s.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
