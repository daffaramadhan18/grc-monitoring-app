'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, UploadCloud, FileText, Download, Upload, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react'
import useSWR from 'swr'
import CurrencyInput from '@/components/ui/CurrencyInput'
import MonthFilter from '@/components/MonthFilter'
import { formatRupiah, formatDate, PROJ_STATUSES, PROJ_STATUS_COLORS } from '@/lib/utils'
import { haptic } from '@/lib/haptic'
import { fetcher } from '@/lib/fetcher'

interface TeamMember { id: number; initial: string; fullName: string; level: string }
interface Termin     { id: number; terminNumber: number; fee: number | null; status: string | null }
interface Project {
  id: number; proposalName: string
  clientName: string | null
  clientInitial: string | null
  projectOwner: string | null; status: string
  micInitial: string | null
  tm1Initial: string | null; tm2Initial: string | null; tm3Initial: string | null
  tm4Initial: string | null; tm5Initial: string | null; tm6Initial: string | null
  startedDate: string | null; endDate: string | null
  confirmedFee: number | null
  termins: Termin[]
}

interface Props { projects: Project[]; teamMembers: TeamMember[] }

const emptyForm = () => ({
  engagementName: '',
  clientName:     '',
  clientInitial:  '',
  projectOwner:   '',
  status:         'Planning',
  confirmedFee:   '',
  startedDate:    '',
  endDate:        '',
  spk:            '',
  pks:            '',
  spkFilename:    '',
  pksFilename:    '',
  micInitial:     '',
  tm1Initial: '', tm2Initial: '', tm3Initial: '',
  tm4Initial: '', tm5Initial: '', tm6Initial: '',
})

const inputCls  = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#009CDE]'
const selectCls = inputCls

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

function FileUploadField({
  label, filename, onUpload, uploading,
}: {
  label: string; filename: string
  onUpload: (path: string, name: string) => void; uploading: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    const res  = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? 'Upload gagal'); return }
    onUpload(data.path, data.filename)
    e.target.value = ''
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div
        className="flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
        onClick={() => ref.current?.click()}
      >
        {filename ? (
          <>
            <FileText size={14} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-700 truncate flex-1">{filename}</span>
            <span className="text-xs text-[#2d7a1a] font-medium shrink-0">Uploaded</span>
          </>
        ) : (
          <>
            <UploadCloud size={14} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-400">{uploading ? 'Uploading…' : 'Pilih file PDF…'}</span>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleChange} />
      <p className="text-xs text-gray-400 mt-1">PDF only</p>
    </div>
  )
}

// ─── Resizable columns ───────────────────────────────────────────────────────

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

// Column order: checkbox, Engagement Name, Client, Owner, Status, MIC, Team, Period, Confirmed Fee, Termins
const DEFAULT_WIDTHS = [
  40,  // checkbox
  200, // Engagement Name
  140, // Client
  110, // Owner
  120, // Status
  80,  // MIC
  160, // Team
  180, // Period
  140, // Confirmed Fee
  100, // Termins
]

// ─── Sort ────────────────────────────────────────────────────────────────────

type SortField = 'proposalName' | 'client' | 'status' | 'confirmedFee' | 'startedDate'
type SortDir   = 'asc' | 'desc'

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown size={12} className="inline ml-1 text-gray-300" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="inline ml-1 text-[#009CDE]" />
    : <ChevronDown size={12} className="inline ml-1 text-[#009CDE]" />
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectsClient({ projects: initial, teamMembers }: Props) {
  const router = useRouter()
  const { data: projects = initial, mutate: revalidate } = useSWR<Project[]>('/api/projects', fetcher, { fallbackData: initial })
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm]           = useState(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [dateError, setDateError] = useState('')
  const [importOpen, setImport]   = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: { row: number; reason: string }[] } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  // Sort state
  const [sortField, setSortField] = useState<SortField>('proposalName')
  const [sortDir, setSortDir]     = useState<SortDir>('asc')

  // Multi-select state
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Month filter
  const [filterMonth, setFilterMonth] = useState('')

  const monthFilteredProjects = useMemo(() => {
    if (!filterMonth) return projects
    const [y, m] = filterMonth.split('-').map(Number)
    return projects.filter((p) => {
      if (!p.startedDate) return false
      const d = new Date(p.startedDate)
      return d.getFullYear() === y && d.getMonth() + 1 === m
    })
  }, [projects, filterMonth])

  const [filters, setFilters] = useState({
    search: '',
    statuses: new Set<string>(),
    teamMember: '',
  })

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
    (filters.teamMember ? 1 : 0)

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      const start = field === 'startedDate' ? value : next.startedDate
      const end   = field === 'endDate'     ? value : next.endDate
      setDateError(start && end && end < start ? 'End date tidak boleh sebelum start date' : '')
      return next
    })
  }

  function setFile(field: 'spk' | 'pks', path: string, name: string) {
    setForm((f) => ({ ...f, [field]: path, [`${field}Filename`]: name }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.engagementName || !form.clientName) return
    if (dateError) return
    setSaving(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      const saved = await res.json()
      setModalOpen(false)
      router.push(`/projects/${saved.id}`)
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Hapus ${selected.size} project yang dipilih?`)) return
    setBulkDeleting(true)
    try {
      await Promise.all(Array.from(selected).map((id) =>
        fetch(`/api/projects/${id}`, { method: 'DELETE' })
      ))
      setSelected(new Set())
      revalidate()
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
    if (selected.size === sortedProjects.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sortedProjects.map((p) => p.id)))
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

  const sortedProjects = useMemo(() => {
    let result = monthFilteredProjects

    if (filters.search)
      result = result.filter((p) =>
        p.proposalName.toLowerCase().includes(filters.search.toLowerCase()) ||
        (p.clientName ?? '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (p.clientInitial ?? '').toLowerCase().includes(filters.search.toLowerCase()))

    if (filters.statuses.size > 0)
      result = result.filter((p) => filters.statuses.has(p.status))

    if (filters.teamMember)
      result = result.filter((p) =>
        [p.micInitial, p.tm1Initial, p.tm2Initial, p.tm3Initial,
         p.tm4Initial, p.tm5Initial, p.tm6Initial].includes(filters.teamMember))

    return [...result].sort((a, b) => {
      let av: string | number = ''
      let bv: string | number = ''
      if (sortField === 'proposalName')  { av = a.proposalName; bv = b.proposalName }
      else if (sortField === 'client')   { av = a.clientInitial ?? ''; bv = b.clientInitial ?? '' }
      else if (sortField === 'status')   { av = a.status; bv = b.status }
      else if (sortField === 'confirmedFee') { av = a.confirmedFee ?? 0; bv = b.confirmedFee ?? 0 }
      else if (sortField === 'startedDate')  { av = a.startedDate ?? ''; bv = b.startedDate ?? '' }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [monthFilteredProjects, sortField, sortDir, filters])

  const tmOptions = [{ initial: '', fullName: '—' }, ...teamMembers]

  function triggerDownload(blob: Blob, filename: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function handleExport() {
    const res = await fetch('/api/projects/export')
    if (!res.ok) { alert('Export failed'); return }
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') ?? ''
    const match = cd.match(/filename="(.+)"/)
    triggerDownload(blob, match?.[1] ?? 'Projects_Export.xlsx')
  }

  async function handleTemplateDownload() {
    const res = await fetch('/api/projects/template')
    if (!res.ok) { alert('Download failed'); return }
    const blob = await res.blob()
    triggerDownload(blob, 'Projects_Template.xlsx')
  }

  async function handleImport() {
    if (!importFile) { alert('Please select a file'); return }
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const res = await fetch('/api/projects/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setImportResult(data)
      revalidate()
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const { widths, onMouseDown } = useResizableColumns(DEFAULT_WIDTHS.length, DEFAULT_WIDTHS)

  function ResizeHandle({ col }: { col: number }) {
    return (
      <span
        onMouseDown={(e) => onMouseDown(col, e)}
        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#009CDE]/30 select-none z-10"
        style={{ touchAction: 'none' }}
      />
    )
  }

  const thBase     = 'relative px-4 py-3 text-gray-500 font-medium text-left whitespace-nowrap overflow-hidden'
  const thSortCls  = `${thBase} cursor-pointer hover:text-gray-700 select-none`

  return (
    <div className="rsm-page-in space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Projects</h1>
        <div className="flex items-center gap-2">
          <MonthFilter value={filterMonth} onChange={setFilterMonth} />
          <button onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={16} /> Export
          </button>
          <button onClick={() => { setImport(true); setImportFile(null); setImportResult(null) }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            <Upload size={16} /> Import
          </button>
          <button onClick={() => { haptic(); setForm(emptyForm()); setDateError(''); setModalOpen(true) }}
            className="inline-flex items-center gap-2 px-4 py-2 rsm-btn-spring rsm-btn-primary-glow bg-[#009CDE] text-white text-sm font-medium rounded-lg hover:bg-[#007BB5] transition-colors">
            <Plus size={16} /> Add Project
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {PROJ_STATUSES.map((s) => (
          <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${PROJ_STATUS_COLORS[s]}`}>
            {s}: {monthFilteredProjects.filter((p) => p.status === s).length}
          </span>
        ))}
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
              onClick={() => setFilters({ search: '', statuses: new Set(), teamMember: '' })}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <X size={12} /> Clear ({activeFilterCount})
            </button>
          )}
        </div>
        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5">
          {PROJ_STATUSES.map((s) => {
            const active = filters.statuses.has(s)
            return (
              <button
                key={s}
                onClick={() => toggleStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? `${PROJ_STATUS_COLORS[s] ?? 'bg-gray-200 text-gray-700'} border-transparent`
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
          Showing {sortedProjects.length} of {monthFilteredProjects.length} projects
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
        {/* Floating bulk action bar */}
        {selected.size > 0 && (
          <div className="absolute bottom-0 inset-x-0 z-10 flex items-center gap-3 px-5 py-3 bg-[#2D2D2D] text-white text-sm rounded-b-xl">
            <span className="font-medium">{selected.size} item dipilih</span>
            <button onClick={() => { haptic(); handleBulkDelete() }} disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 transition-colors">
              <Trash2 size={13} /> {bulkDeleting ? 'Menghapus...' : 'Hapus'}
            </button>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto text-white/50 hover:text-white transition-colors">
              <X size={15} />
            </button>
          </div>
        )}
        <div className={`overflow-x-auto${selected.size > 0 ? ' pb-12' : ''}`}>
          <table className="text-sm" style={{ tableLayout: 'fixed', width: `${Math.max(widths.reduce((a, b) => a + b, 0), 900)}px` }}>
            <colgroup>
              {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
            </colgroup>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={thBase} style={{ width: widths[0] }}>
                  <input type="checkbox"
                    checked={sortedProjects.length > 0 && selected.size === sortedProjects.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 accent-[#009CDE] cursor-pointer"
                  />
                </th>
                <th className={thSortCls} style={{ width: widths[1] }} onClick={() => handleSort('proposalName')}>
                  Engagement Name <SortIcon field="proposalName" current={sortField} dir={sortDir} />
                  <ResizeHandle col={1} />
                </th>
                <th className={thSortCls} style={{ width: widths[2] }} onClick={() => handleSort('client')}>
                  Client <SortIcon field="client" current={sortField} dir={sortDir} />
                  <ResizeHandle col={2} />
                </th>
                <th className={`${thBase} hidden sm:table-cell`} style={{ width: widths[3] }}>
                  Owner<ResizeHandle col={3} />
                </th>
                <th className={thSortCls} style={{ width: widths[4] }} onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" current={sortField} dir={sortDir} />
                  <ResizeHandle col={4} />
                </th>
                <th className={`${thBase} hidden sm:table-cell`} style={{ width: widths[5] }}>
                  MIC<ResizeHandle col={5} />
                </th>
                <th className={thBase} style={{ width: widths[6] }}>
                  Team<ResizeHandle col={6} />
                </th>
                <th className={thSortCls} style={{ width: widths[7] }} onClick={() => handleSort('startedDate')}>
                  Period <SortIcon field="startedDate" current={sortField} dir={sortDir} />
                  <ResizeHandle col={7} />
                </th>
                <th className={`${thSortCls} text-right`} style={{ width: widths[8] }} onClick={() => handleSort('confirmedFee')}>
                  Confirmed Fee <SortIcon field="confirmedFee" current={sortField} dir={sortDir} />
                  <ResizeHandle col={8} />
                </th>
                <th className={`${thBase} text-center hidden sm:table-cell`} style={{ width: widths[9] }}>
                  Termins<ResizeHandle col={9} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedProjects.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">Belum ada project.</td>
                </tr>
              )}
              {sortedProjects.map((proj) => {
                const team = [proj.tm1Initial, proj.tm2Initial, proj.tm3Initial,
                              proj.tm4Initial, proj.tm5Initial, proj.tm6Initial].filter(Boolean) as string[]
                const paidCount = proj.termins.filter((t) => t.status === 'Paid').length
                const isSelected = selected.has(proj.id)
                return (
                  <tr key={proj.id}
                    className={`rsm-row-click group cursor-pointer transition-colors ${isSelected ? 'bg-[#009CDE]/8' : 'hover:bg-gray-50'}`}
                    onClick={() => router.push(`/projects/${proj.id}`)}>
                    <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleSelect(proj.id)}
                        className={`rounded border-gray-300 accent-[#009CDE] cursor-pointer transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{proj.proposalName}</td>
                    <td className="px-4 py-3 text-gray-600" title={proj.clientName ?? ''}>{proj.clientInitial ?? proj.clientName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{proj.projectOwner ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROJ_STATUS_COLORS[proj.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {proj.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{proj.micInitial ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {team.map((t) => (
                          <span key={t} className="inline-flex px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{t}</span>
                        ))}
                        {team.length === 0 && <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(proj.startedDate)} – {formatDate(proj.endDate)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(proj.confirmedFee)}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600 hidden sm:table-cell">
                      {proj.termins.length > 0 ? `${paidCount}/${proj.termins.length} paid` : '—'}
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
              <h2 className="text-base font-semibold text-gray-800">Import Projects</h2>
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
                  className="px-5 py-2 text-sm font-medium rsm-btn-spring rsm-btn-primary-glow bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors">
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Project Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">New Project</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <Field label="Engagement Name" required>
                <input className={inputCls} value={form.engagementName}
                  onChange={(e) => set('engagementName', e.target.value)} required autoFocus />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Client Initial">
                  <input className={inputCls} value={form.clientInitial ?? ''}
                    onChange={(e) => set('clientInitial', e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="e.g. BRI" maxLength={6} />
                </Field>
                <Field label="Client Name">
                  <input className={inputCls} value={form.clientName ?? ''}
                    onChange={(e) => set('clientName', e.target.value)}
                    placeholder="Nama lengkap client" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Project Owner">
                  <select className={selectCls} value={form.projectOwner}
                    onChange={(e) => set('projectOwner', e.target.value)}>
                    <option value="">— (opsional)</option>
                    <option value="ITGRC-S">ITGRC-S</option>
                    <option value="Non ITGRC-S">Non ITGRC-S</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select className={selectCls} value={form.status}
                    onChange={(e) => set('status', e.target.value)}>
                    {PROJ_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Confirmed Fee (IDR)">
                <CurrencyInput value={form.confirmedFee} onChange={(v) => set('confirmedFee', v)} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Date">
                  <input type="date" className={inputCls} value={form.startedDate}
                    onChange={(e) => set('startedDate', e.target.value)} />
                </Field>
                <Field label="End Date">
                  <input type="date" className={inputCls} value={form.endDate}
                    min={form.startedDate || undefined}
                    onChange={(e) => set('endDate', e.target.value)} />
                </Field>
              </div>
              {dateError && <p className="text-xs text-red-500 -mt-2">{dateError}</p>}

              <div className="grid grid-cols-2 gap-4">
                <FileUploadField label="SPK (PDF)" filename={form.spkFilename}
                  uploading={false} onUpload={(path, name) => setFile('spk', path, name)} />
                <FileUploadField label="PKS (PDF)" filename={form.pksFilename}
                  uploading={false} onUpload={(path, name) => setFile('pks', path, name)} />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <Field label="MIC">
                  <select className={selectCls} value={form.micInitial}
                    onChange={(e) => set('micInitial', e.target.value)}>
                    {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                  </select>
                </Field>
                {(['tm1Initial','tm2Initial','tm3Initial'] as const).map((k, i) => (
                  <Field key={k} label={`TM${i+1}`}>
                    <select className={selectCls} value={form[k]}
                      onChange={(e) => set(k, e.target.value)}>
                      {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                    </select>
                  </Field>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {(['tm4Initial','tm5Initial','tm6Initial'] as const).map((k, i) => (
                  <Field key={k} label={`TM${i+4}`}>
                    <select className={selectCls} value={form[k]}
                      onChange={(e) => set(k, e.target.value)}>
                      {tmOptions.map((m) => <option key={m.initial} value={m.initial}>{m.initial || '—'}</option>)}
                    </select>
                  </Field>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={saving || !!dateError}
                  className="px-5 py-2 text-sm font-medium rsm-btn-spring rsm-btn-primary-glow bg-[#009CDE] text-white rounded-lg hover:bg-[#007BB5] disabled:opacity-60 transition-colors">
                  {saving ? 'Menyimpan...' : 'Simpan & Buka Detail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
