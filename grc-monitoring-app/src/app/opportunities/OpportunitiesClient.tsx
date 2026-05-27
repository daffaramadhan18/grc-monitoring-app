'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Download, Upload, ChevronUp, ChevronDown, ChevronsUpDown, Crown, Search, Filter, Pencil, Loader2, Check, Copy } from 'lucide-react'
import MobileOppCard from './MobileOppCard'
import useSWR, { mutate } from 'swr'
import MonthFilter from '@/components/MonthFilter'
import { formatRupiah, formatDate, OPP_STATUSES, OPP_STATUS_COLORS, toInputDate } from '@/lib/utils'
import EditOpportunityModal, { type OppFull } from '@/components/EditOpportunityModal'
import { haptic } from '@/lib/haptic'
import { fetcher } from '@/lib/fetcher'

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
  phase: string | null; status: string; probability: string | null; riskLevel: string | null
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

// Column order: checkbox | Client Initial | Sub-service | Proposal Name | Status | Phase |
//               Expected Date | Probability | %RR | Harga | Team | delete
const DEFAULT_WIDTHS = [
  40,  // 0: checkbox
  45,  // 1: No
  90,  // 2: Client Initial  [FROZEN]
  120, // 3: Sub-service     [FROZEN]
  200, // 4: Proposal Name   [FROZEN]
  130, // 5: Status
  90,  // 6: Phase
  110, // 7: Expected Date
  80,  // 8: Probability
  70,  // 9: %RR
  130, // 10: Harga
  180, // 11: Team
  80,  // 12: actions
]

const OPP_PHASES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed']
const RISK_LEVELS = ['Low', 'Medium', 'High']
const PROBABILITIES = ['Low', 'Medium', 'High']

export default function OpportunitiesClient({
  opportunities: initial, serviceTypes, teamMembers,
}: Props) {
  const router = useRouter()
  const { data: opps = initial, mutate: revalidate } = useSWR<Opp[]>('/api/opportunities', fetcher, { fallbackData: initial })
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
  const [flashedRow, setFlashedRow]   = useState<number | null>(null)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Opp | null>(null)
  const [copyTarget,   setCopyTarget]   = useState<Opp | null>(null)
  const [copying,      setCopying]      = useState(false)
  const [copyToast,    setCopyToast]    = useState<{ type: 'success' | 'warning' | 'error'; msg: string } | null>(null)

  const [filters, setFilters] = useState({
    search: '',
    statuses: new Set<string>(),
    serviceTypeId: '',
    teamMember: '',
  })

  // ─── Bulk Edit Mode ───────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Map<number, Partial<Opp>>>(new Map())
  const [preEditSnapshot, setPreEditSnapshot] = useState<Opp[]>([])
  const [flashGreenRows, setFlashGreenRows] = useState<Set<number>>(new Set())
  type BatchSaveState = 'idle' | 'saving' | 'saved'
  const [batchSaveState, setBatchSaveState] = useState<BatchSaveState>('idle')

  // Navigation guard
  useEffect(() => {
    if (!editMode || editData.size === 0) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [editMode, editData.size])

  // Cmd/Ctrl+S to save
  useEffect(() => {
    if (!editMode) return
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (editData.size > 0) handleBatchSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [editMode, editData])

  function enterEditMode() {
    setPreEditSnapshot([...opps])
    setEditData(new Map())
    setEditMode(true)
  }

  function cancelEditMode() {
    setEditData(new Map())
    setEditMode(false)
  }

  function cellValue<K extends keyof Opp>(opp: Opp, field: K): Opp[K] {
    const changed = editData.get(opp.id)
    if (changed && field in changed) return changed[field] as Opp[K]
    return opp[field]
  }

  function updateCell(id: number, field: keyof Opp, value: Opp[keyof Opp]) {
    setEditData((prev) => {
      const next = new Map(prev)
      const existing = next.get(id) ?? {}
      next.set(id, { ...existing, [field]: value })
      return next
    })
  }

  async function handleBatchSave() {
    if (editData.size === 0) return
    setBatchSaveState('saving')
    try {
      const updates = Array.from(editData.entries()).map(([id, data]) => ({ id, ...data }))
      const res = await fetch('/api/opportunities/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText)
      }
      const { updated } = await res.json()

      // Flash green rows
      const modifiedIds = new Set(editData.keys())
      setFlashGreenRows(modifiedIds)
      setTimeout(() => setFlashGreenRows(new Set()), 600)

      setBatchSaveState('saved')
      setToast(`✓ ${updated} opportunities berhasil diupdate`)
      setTimeout(() => setToast(null), 4000)
      setTimeout(() => setBatchSaveState('idle'), 1500)

      setEditData(new Map())
      setEditMode(false)
      revalidate()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setBatchSaveState('idle')
      setToast(`✗ Gagal menyimpan — ${message}`)
      setTimeout(() => setToast(null), 5000)
    }
  }

  // ─── End Bulk Edit Mode ───────────────────────────────────────────────────

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
    if (editMode) return
    setEditing(opp)
    setModal(true)
  }

  async function handleDelete(id: number) {
    if (!window.confirm('Hapus opportunity ini?')) return
    setDel(id)
    try {
      const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s })
      revalidate()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert('Error: ' + message)
    } finally {
      setDel(null)
    }
  }

  async function handleDeleteDirect(id: number) {
    setDel(id)
    try {
      const res = await fetch(`/api/opportunities/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setSelected((prev) => { const s = new Set(prev); s.delete(id); return s })
      revalidate()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert('Error: ' + message)
    } finally {
      setDel(null)
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Hapus ${selected.size} opportunity yang dipilih?`)) return
    setBulkDeleting(true)
    try {
      await Promise.all(Array.from(selected).map((id) =>
        fetch(`/api/opportunities/${id}`, { method: 'DELETE' })
      ))
      setSelected(new Set())
      revalidate()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert('Error: ' + message)
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

  async function handleCopyConfirm() {
    if (!copyTarget) return
    setCopying(true)
    try {
      const teamMembers = [
        copyTarget.tm1Initial, copyTarget.tm2Initial, copyTarget.tm3Initial,
        copyTarget.tm4Initial, copyTarget.tm5Initial, copyTarget.tm6Initial,
      ].filter((t): t is string => t !== null)

      const res = await fetch('/api/projects/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalName:  copyTarget.proposalName,
          clientInitial: copyTarget.clientInitial,
          clientName:    copyTarget.clientName,
          micInitial:    copyTarget.micInitial,
          teamMembers,
        }),
      })

      setCopyTarget(null)

      if (res.status === 409) {
        setCopyToast({ type: 'warning', msg: 'Already exists in Active Engagements' })
      } else if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setCopyToast({ type: 'error', msg: data.error ?? 'Failed to copy' })
      } else {
        setCopyToast({ type: 'success', msg: 'Successfully copied to Active Engagements' })
      }
      setTimeout(() => setCopyToast(null), 3000)
    } catch (err: unknown) {
      setCopyTarget(null)
      setCopyToast({ type: 'error', msg: err instanceof Error ? err.message : 'Unknown error' })
      setTimeout(() => setCopyToast(null), 3000)
    } finally {
      setCopying(false)
    }
  }

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

      revalidate()

      // Close modal and show toast
      setImport(false)
      setImportFile(null)
      setImportSkipped(data.skipped ?? [])
      const msg = data.skipped?.length
        ? `${data.imported} rows imported · ${data.skipped.length} skipped`
        : `${data.imported} rows imported successfully`
      setToast(msg)
      setTimeout(() => setToast(null), 4000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert('Error: ' + message)
    } finally {
      setImporting(false)
    }
  }

  // ─── Resize handle ────────────────────────────────────────────────────────────

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

  const tmOptions = [{ initial: '', fullName: '—' }, ...teamMembers]

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
          {/* Edit Mode toggle */}
          <button
            onClick={() => editMode ? cancelEditMode() : enterEditMode()}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              editMode
                ? 'bg-[#009CDE] text-white border-[#009CDE] hover:bg-[#007BB5]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Pencil size={16} />
            {editMode ? '✓ Editing' : 'Edit Mode'}
          </button>
          <button onClick={() => { haptic(); openNew() }}
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

      {/* ── Desktop Table (hidden on mobile) ─────────────────────────────── */}
      <div className="hidden md:block">
      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
        {selected.size > 0 && !editMode && (
          <div className="absolute bottom-0 inset-x-0 z-10 flex items-center gap-3 px-5 py-3 bg-[#2D2D2D] text-white text-sm rounded-b-xl">
            <span className="font-medium">{selected.size} item dipilih</span>
            <button
              onClick={() => { haptic(); handleBulkDelete() }}
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

        <div className={`overflow-x-auto${selected.size > 0 && !editMode ? ' pb-12' : ''}`}>
          <table className="text-sm" style={{ tableLayout: 'fixed', width: widths.reduce((s, w) => s + w, 0) }}>
            <colgroup>
              {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {/* Checkbox */}
                <th className={`${thBase} bg-gray-50`} style={{ width: widths[0] }}>
                  <input type="checkbox"
                    checked={sortedOpps.length > 0 && selected.size === sortedOpps.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 accent-[#009CDE] cursor-pointer"
                  />
                </th>
                {/* No */}
                <th className={`${thBase} bg-gray-50 text-center`} style={{ width: widths[1] }}>
                  No
                </th>
                {/* Client Initial */}
                <th className={`${thBase} bg-gray-50`} style={{ width: widths[2] }}>
                  Client Initial<ResizeHandle col={2} />
                </th>
                {/* Sub-service */}
                <th className={`${thBase} bg-gray-50`} style={{ width: widths[3] }}>
                  Sub-service<ResizeHandle col={3} />
                </th>
                {/* Proposal Name */}
                <th className={`${thSort} bg-gray-50`}
                  style={{ width: widths[4] }}
                  onClick={() => handleSort('proposalName')}>
                  Proposal Name<SortIcon field="proposalName" current={sortField} dir={sortDir} />
                  <ResizeHandle col={4} />
                </th>
                {/* Status */}
                <th className={thSort} style={{ width: widths[5] }} onClick={() => handleSort('status')}>
                  Status<SortIcon field="status" current={sortField} dir={sortDir} />
                  <ResizeHandle col={5} />
                </th>
                {/* Phase */}
                <th className={thBase} style={{ width: widths[6] }}>
                  Phase<ResizeHandle col={6} />
                </th>
                {/* Expected Date */}
                <th className={thSort} style={{ width: widths[7] }} onClick={() => handleSort('expectedDate')}>
                  Expected Date<SortIcon field="expectedDate" current={sortField} dir={sortDir} />
                  <ResizeHandle col={7} />
                </th>
                {/* Probability */}
                <th className={thBase} style={{ width: widths[8] }}>
                  Prob<ResizeHandle col={8} />
                </th>
                {/* %RR */}
                <th className={thBase} style={{ width: widths[9] }}>
                  %RR<ResizeHandle col={9} />
                </th>
                {/* Harga */}
                <th className={thSort} style={{ width: widths[10] }} onClick={() => handleSort('harga')}>
                  Harga<SortIcon field="harga" current={sortField} dir={sortDir} />
                  <ResizeHandle col={10} />
                </th>
                {/* Team */}
                <th className={thBase} style={{ width: widths[11] }}>
                  Team<ResizeHandle col={11} />
                </th>
                {/* Delete */}
                <th className={thBase} style={{ width: widths[12] }} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedOpps.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-gray-400">
                    Belum ada opportunity. Klik &ldquo;Add Opportunity&rdquo; untuk mulai.
                  </td>
                </tr>
              )}
              {sortedOpps.map((opp, index) => {
                const isSelected = selected.has(opp.id)
                const isModified = editData.has(opp.id)
                const isFlashGreen = flashGreenRows.has(opp.id)
                const tdEdit = editMode ? 'rsm-edit-cell' : ''

                return (
                  <motion.tr
                    key={opp.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundColor: isFlashGreen
                        ? '#dcfce7'
                        : flashedRow === opp.id
                        ? 'rgba(0,156,222,0.18)'
                        : isModified && editMode
                        ? '#fefce8'
                        : isSelected
                        ? 'rgba(0,156,222,0.08)'
                        : 'rgba(255,255,255,0)',
                    }}
                    transition={
                      isFlashGreen || flashedRow === opp.id
                        ? { duration: 0.05 }
                        : { delay: index * 0.04, duration: 0.25, ease: 'easeOut' }
                    }
                    className={`rsm-row-click group relative h-14 ${editMode ? '' : 'cursor-pointer'} ${isModified && editMode ? 'border-l-2 border-l-blue-400' : ''}`}
                    onClick={() => !editMode && openEdit(opp)}
                  >
                    {/* Checkbox */}
                    <td className="px-3 align-middle overflow-hidden"
                      onClick={(e) => e.stopPropagation()}>
                      {!editMode && (
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(opp.id)}
                          className={`rounded border-gray-300 accent-[#009CDE] cursor-pointer transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        />
                      )}
                    </td>
                    {/* No */}
                    <td className="px-2 align-middle text-center text-xs text-gray-400 tabular-nums select-none">
                      {index + 1}
                    </td>
                    {/* Client Initial */}
                    <td className={`px-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 font-mono text-xs ${tdEdit}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? <input type="text" value={String(cellValue(opp, 'clientInitial') ?? '')}
                            onChange={(e) => updateCell(opp.id, 'clientInitial', e.target.value)} />
                        : (opp.clientInitial ?? '—')}
                    </td>
                    {/* Sub-service */}
                    <td className={`px-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 ${tdEdit}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? <input type="text" value={String(cellValue(opp, 'subService') ?? (opp.subService?.name ?? ''))}
                            onChange={(e) => updateCell(opp.id, 'subService' as any, e.target.value)} />
                        : (opp.subService?.name ?? '—')}
                    </td>
                    {/* Proposal Name */}
                    <td className={`px-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap font-medium text-gray-900 ${tdEdit}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? <input type="text" value={String(cellValue(opp, 'proposalName') ?? '')}
                            onChange={(e) => updateCell(opp.id, 'proposalName', e.target.value)} />
                        : opp.proposalName}
                    </td>
                    {/* Status */}
                    <td className={`px-3 align-middle overflow-hidden whitespace-nowrap ${tdEdit}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? <select value={String(cellValue(opp, 'status') ?? opp.status)}
                            onChange={(e) => updateCell(opp.id, 'status', e.target.value)}>
                            {OPP_STATUSES.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        : <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${OPP_STATUS_COLORS[opp.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {opp.status}
                          </span>}
                    </td>
                    {/* Phase */}
                    <td className={`px-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap text-gray-500 ${tdEdit}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? <select value={String(cellValue(opp, 'phase') ?? '')}
                            onChange={(e) => updateCell(opp.id, 'phase', e.target.value || null)}>
                            <option value="">—</option>
                            {OPP_PHASES.map((p) => <option key={p}>{p}</option>)}
                          </select>
                        : (opp.phase ?? '—')}
                    </td>
                    {/* Expected Date */}
                    <td className={`px-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap text-gray-500 ${tdEdit}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? <input type="date" value={String(cellValue(opp, 'expectedDate') ? toInputDate(String(cellValue(opp, 'expectedDate'))) : '')}
                            onChange={(e) => updateCell(opp.id, 'expectedDate', e.target.value || null)} />
                        : formatDate(opp.expectedDate)}
                    </td>
                    {/* Probability */}
                    <td className={`px-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap text-gray-500 ${tdEdit}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? <select value={String(cellValue(opp, 'probability') ?? '')}
                            onChange={(e) => updateCell(opp.id, 'probability', e.target.value || null)}>
                            <option value="">—</option>
                            {PROBABILITIES.map((p) => <option key={p}>{p}</option>)}
                          </select>
                        : (opp.probability ?? '—')}
                    </td>
                    {/* %RR */}
                    <td className={`px-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap text-gray-600 text-right ${tdEdit}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? <input type="number" style={{ textAlign: 'right' }}
                            value={cellValue(opp, 'rrPercentage') ?? ''}
                            onChange={(e) => updateCell(opp.id, 'rrPercentage', e.target.value ? Number(e.target.value) : null)} />
                        : (opp.rrPercentage != null ? `${opp.rrPercentage}%` : '—')}
                    </td>
                    {/* Harga */}
                    <td className={`px-3 align-middle overflow-hidden text-ellipsis whitespace-nowrap text-gray-700 text-right ${tdEdit}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? <input type="number" style={{ textAlign: 'right' }}
                            value={cellValue(opp, 'harga') ?? ''}
                            onChange={(e) => updateCell(opp.id, 'harga', e.target.value ? Number(e.target.value) : null)} />
                        : formatRupiah(opp.harga)}
                    </td>
                    {/* Team */}
                    <td className={`px-3 align-middle overflow-hidden whitespace-nowrap ${editMode ? '' : ''}`}
                      onClick={(e) => editMode && e.stopPropagation()}>
                      {editMode
                        ? (
                          <div className="flex gap-1 flex-wrap">
                            <select className="rsm-edit-cell" style={{ minWidth: 50 }}
                              value={String(cellValue(opp, 'micInitial') ?? '')}
                              onChange={(e) => updateCell(opp.id, 'micInitial', e.target.value || null)}>
                              {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                            </select>
                          </div>
                        )
                        : (() => {
                          const all = [
                            opp.micInitial ? { initial: opp.micInitial, isMic: true } : null,
                            ...[opp.tm1Initial, opp.tm2Initial, opp.tm3Initial, opp.tm4Initial, opp.tm5Initial, opp.tm6Initial]
                              .filter(Boolean).map((t) => ({ initial: t!, isMic: false })),
                          ].filter(Boolean) as { initial: string; isMic: boolean }[]
                          const shown = all.slice(0, 4)
                          const extra = all.length - shown.length
                          if (all.length === 0) return <span className="text-gray-300 text-xs">—</span>
                          return (
                            <div className="flex items-center whitespace-nowrap overflow-hidden">
                              {shown.map((a, i) => (
                                <span key={a.initial + i} className={i > 0 ? '-ml-2' : ''}>
                                  <AvatarBubble initial={a.initial} isMic={a.isMic} />
                                </span>
                              ))}
                              {extra > 0 && (
                                <span className="-ml-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-[10px] font-semibold shrink-0">
                                  +{extra}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                    </td>
                    {/* Actions */}
                    <td className="px-3 align-middle overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      {!editMode && (
                        <div className="flex items-center gap-0.5">
                          {opp.status === 'Win' && (
                            <button
                              onClick={() => { haptic(); setCopyTarget(opp) }}
                              className="p-1.5 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Copy to Active Engagements"
                            >
                              <Copy size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => { haptic(); handleDelete(opp.id) }}
                            disabled={deleting === opp.id}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
            {sortedOpps.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={10} className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">
                    Total ({sortedOpps.length} opportunities)
                  </td>
                  <td className="px-3 py-2.5 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
                    {formatRupiah(sortedOpps.reduce((s, o) => s + (o.harga ?? 0), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      </div>{/* end hidden md:block desktop table */}

      {/* ── Mobile view (< 768px) ────────────────────────────────────────── */}
      <div className="md:hidden">
        {/* Mobile filter toggle */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">
            {sortedOpps.length} of {opps.length} opportunities
          </p>
          <button
            onClick={() => setMobileFilterOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: mobileFilterOpen || activeFilterCount > 0 ? '#EBF8FF' : 'transparent',
              color: mobileFilterOpen || activeFilterCount > 0 ? '#009CDE' : '#6B7280',
            }}
          >
            <Filter size={16} />
            Filter
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#009CDE] text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible filter panel */}
        {mobileFilterOpen && (
          <div className="rsm-mfilter-panel">
            <div className="rsm-mfilter-row">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009CDE]"
                  placeholder="Search…"
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>
              <select
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009CDE] bg-white"
                value={filters.serviceTypeId}
                onChange={e => setFilters(f => ({ ...f, serviceTypeId: e.target.value }))}
              >
                <option value="">All Service Types</option>
                {serviceTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009CDE] bg-white"
                value={filters.teamMember}
                onChange={e => setFilters(f => ({ ...f, teamMember: e.target.value }))}
              >
                <option value="">All Team Members</option>
                {teamMembers.map(m => <option key={m.initial} value={m.initial}>{m.initial} · {m.fullName}</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                {OPP_STATUSES.map(s => {
                  const on = filters.statuses.has(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${on ? 'border-transparent' : 'border-gray-200 bg-white text-gray-600'}`}
                      style={on ? { backgroundColor: undefined } : {}}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters({ search: '', statuses: new Set(), serviceTypeId: '', teamMember: '' })}
                  className="flex items-center gap-1 text-sm text-gray-500"
                >
                  <X size={14} /> Clear ({activeFilterCount})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Card list */}
        {sortedOpps.length === 0 ? (
          <div className="rsm-mcard">
            <p className="text-sm text-gray-400 text-center">
              {opps.length === 0 ? 'Belum ada opportunity. Tekan + untuk mulai.' : 'Tidak ada opportunity yang cocok.'}
            </p>
          </div>
        ) : (
          <div className="rsm-mlist">
            {sortedOpps.map(opp => (
              <MobileOppCard key={opp.id} opp={opp as any} onTap={(o) => router.push(`/opportunities/${o.id}`)} onDelete={(o) => setDeleteTarget(o as unknown as Opp)} />
            ))}
          </div>
        )}

        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
            <div className="relative bg-white rounded-t-2xl px-5 pt-4 pb-8">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <h3 className="text-base font-semibold text-gray-800 mb-1">Hapus Opportunity?</h3>
              <p className="text-sm text-gray-500 mb-5">{deleteTarget.proposalName}</p>
              <button
                onClick={async () => { await handleDeleteDirect(deleteTarget.id); setDeleteTarget(null); }}
                className="w-full py-3 mb-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
              >
                Ya, Hapus
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="w-full py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          className="rsm-fab md:hidden"
          onClick={() => { haptic(); router.push('/opportunities/new') }}
          aria-label="Add Opportunity"
        >
          <Plus size={26} />
        </button>
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
          setFlashedRow(saved.id)
          revalidate()
          setTimeout(() => setFlashedRow(null), 700)
        }}
        onDelete={handleDelete}
      />

      {/* ── Bulk Edit bottom save bar ─────────────────────────────────────── */}
      <AnimatePresence>
        {editMode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:left-60 z-40 flex items-center gap-3 px-5 py-3 bg-white border-t border-gray-200 shadow-lg"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
          >
            <span className="text-sm text-gray-700 font-medium flex-1">
              {editData.size} baris diubah
            </span>
            <button
              onClick={cancelEditMode}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              onClick={handleBatchSave}
              disabled={editData.size === 0 || batchSaveState === 'saving'}
              animate={batchSaveState === 'saved' ? { backgroundColor: '#22c55e' } : { backgroundColor: '#009CDE' }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 transition-colors"
            >
              {batchSaveState === 'saving' && <Loader2 size={14} className="animate-spin" />}
              {batchSaveState === 'saved' && <Check size={14} />}
              {batchSaveState === 'saving' ? 'Saving...' : batchSaveState === 'saved' ? '✓ Saved' : 'Save All'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Copy confirmation dialog ─────────────────────────────────────── */}
      <AnimatePresence>
        {copyTarget && (
          <>
            <motion.div
              key="copy-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => !copying && setCopyTarget(null)}
            />
            <motion.div
              key="copy-dialog"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 pointer-events-auto">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-xl shrink-0">
                    <Copy size={18} className="text-emerald-600" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-800">Copy to Active Engagements?</h3>
                </div>
                <p className="text-sm text-gray-500">
                  A new project will be created from{' '}
                  <span className="font-medium text-gray-700">{copyTarget.proposalName}</span>{' '}
                  with status <span className="font-medium text-gray-700">Waiting to Start</span>.
                </p>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setCopyTarget(null)}
                    disabled={copying}
                    className="flex-1 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCopyConfirm}
                    disabled={copying}
                    className="flex-1 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    {copying && <Loader2 size={14} className="animate-spin" />}
                    {copying ? 'Copying…' : 'Copy'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Copy toast (top-right, slide from right) ─────────────────────── */}
      <AnimatePresence>
        {copyToast && (
          <motion.div
            key="copy-toast"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-6 right-6 z-[70] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-xs"
            style={{
              backgroundColor:
                copyToast.type === 'success' ? '#059669'
                : copyToast.type === 'warning' ? '#d97706'
                : '#dc2626',
              color: 'white',
            }}
          >
            {copyToast.type === 'success' && <Check size={15} className="shrink-0" />}
            {copyToast.type === 'warning' && <span className="shrink-0 text-base leading-none">⚠</span>}
            {copyToast.type === 'error'   && <X size={15} className="shrink-0" />}
            <span>{copyToast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[60] flex flex-col items-stretch sm:items-center gap-2"
          >
            <div className="flex items-center gap-3 px-5 py-3 bg-[#2D2D2D] text-white text-sm rounded-xl shadow-xl">
              <span className="flex-1">{toast}</span>
              <button onClick={() => setToast(null)} className="text-white/50 hover:text-white shrink-0">
                <X size={14} />
              </button>
            </div>
            {importSkipped.length > 0 && (
              <div className="bg-white border border-amber-200 rounded-xl shadow-xl p-4 text-sm w-full sm:w-80 max-h-48 overflow-y-auto">
                <p className="font-medium text-amber-700 mb-1">{importSkipped.length} row(s) skipped:</p>
                <ul className="list-disc list-inside text-gray-600 text-xs space-y-0.5">
                  {importSkipped.map((s) => (
                    <li key={s.row}>Row {s.row}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
