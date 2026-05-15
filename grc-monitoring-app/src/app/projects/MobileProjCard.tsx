'use client'
import { ChevronRight } from 'lucide-react'
import { PROJ_STATUS_COLORS, formatRupiah, formatDate } from '@/lib/utils'

interface Termin { id: number; status: string | null; fee: number | null }
interface Project {
  id: number; proposalName: string; clientName: string | null; clientInitial: string | null
  status: string; confirmedFee: number | null; endDate: string | null
  micInitial: string | null; tm1Initial: string | null; tm2Initial: string | null; tm3Initial: string | null
  termins: Termin[]
}

const AVATAR_COLORS = ['#009CDE','#43B02A','#58595B','#F59E0B','#8B5CF6','#EC4899']
function avatarBg(s: string) {
  const h = s.split('').reduce((a,c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export default function MobileProjCard({ project, onTap }: { project: Project; onTap: (p: Project) => void }) {
  const paidCount = project.termins.filter(t => t.status === 'Paid').length
  const totalTermins = project.termins.length
  const paidFee = project.termins.filter(t => t.status === 'Paid').reduce((s, t) => s + Number(t.fee ?? 0), 0)
  const pct = (project.confirmedFee ?? 0) > 0 ? Math.round((paidFee / (project.confirmedFee ?? 1)) * 100) : 0

  const team = [
    project.micInitial ? { i: project.micInitial, mic: true } : null,
    ...[project.tm1Initial,project.tm2Initial,project.tm3Initial]
      .filter(Boolean).map(t => ({ i: t!, mic: false }))
  ].filter(Boolean) as { i: string; mic: boolean }[]

  return (
    <article className="rsm-mcard" onClick={() => onTap(project)}>
      <div className="rsm-mcard-top">
        <div className="rsm-mcard-name">{project.proposalName}</div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${PROJ_STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {project.status}
        </span>
      </div>
      <div className="rsm-mcard-client">
        {project.clientInitial && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
            {project.clientInitial}
          </span>
        )}
        <span className="truncate">{project.clientName ?? '—'}</span>
      </div>
      <div className="rsm-mcard-row">
        <span className="rsm-mcard-harga">{formatRupiah(project.confirmedFee)}</span>
        <span className="rsm-mcard-row-meta">{paidCount}/{totalTermins} termin paid</span>
      </div>
      <div className="rsm-mproj-progress">
        <div className="rsm-mproj-progress-bar">
          <div className="rsm-mproj-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span>{pct}%</span>
      </div>
      <div className="rsm-mcard-team">
        <div className="flex items-center">
          {team.slice(0,4).map((a, idx) => (
            <span
              key={a.i + idx}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-semibold shrink-0${idx > 0 ? ' -ml-2' : ''}`}
              style={{ backgroundColor: a.mic ? '#2D2D2D' : avatarBg(a.i) }}
            >
              {a.i.slice(0, 2)}
            </span>
          ))}
          {team.length === 0 && <span className="text-gray-300 text-xs">—</span>}
        </div>
        <span className="rsm-mcard-row-meta">{formatDate(project.endDate)}</span>
      </div>
    </article>
  )
}
