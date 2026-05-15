'use client'
import { ChevronRight, Trash2 } from 'lucide-react'
import { OPP_STATUS_COLORS, formatRupiah, formatDate } from '@/lib/utils'

interface Opp {
  id: number; proposalName: string; clientName: string | null; clientInitial: string | null
  status: string; harga: number | null; expectedDate: string | null
  micInitial: string | null
  tm1Initial: string | null; tm2Initial: string | null; tm3Initial: string | null
  tm4Initial: string | null; tm5Initial: string | null; tm6Initial: string | null
  [key: string]: unknown
}

const AVATAR_COLORS = ['#009CDE','#43B02A','#58595B','#F59E0B','#8B5CF6','#EC4899']
function avatarBg(s: string) {
  const h = s.split('').reduce((a,c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function MobileOppCard({ opp, onTap, onDelete }: { opp: Opp; onTap: (o: any) => void; onDelete?: (opp: Opp) => void }) {
  const team = [
    opp.micInitial ? { i: opp.micInitial, mic: true } : null,
    ...[opp.tm1Initial,opp.tm2Initial,opp.tm3Initial,opp.tm4Initial,opp.tm5Initial,opp.tm6Initial]
      .filter(Boolean).map(t => ({ i: t!, mic: false }))
  ].filter(Boolean) as { i: string; mic: boolean }[]
  const shown = team.slice(0, 4)
  const extra = team.length - shown.length

  return (
    <article className="rsm-mcard" onClick={() => onTap(opp)}>
      <div className="rsm-mcard-top">
        <div className="rsm-mcard-name">{opp.proposalName}</div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${OPP_STATUS_COLORS[opp.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {opp.status}
          </span>
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(opp); }}
              className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Hapus"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="rsm-mcard-client">
        {opp.clientInitial && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs font-semibold">
            {opp.clientInitial}
          </span>
        )}
        <span className="truncate">{opp.clientName ?? '—'}</span>
      </div>
      <div className="rsm-mcard-row">
        <span className="rsm-mcard-harga">{formatRupiah(opp.harga)}</span>
        <span className="rsm-mcard-row-meta">{formatDate(opp.expectedDate)}</span>
      </div>
      <div className="rsm-mcard-team">
        <div className="flex items-center">
          {shown.map((a, idx) => (
            <span
              key={a.i + idx}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-[10px] font-semibold shrink-0${idx > 0 ? ' -ml-2' : ''}`}
              style={{ backgroundColor: a.mic ? '#2D2D2D' : avatarBg(a.i) }}
              title={a.mic ? `MIC: ${a.i}` : a.i}
            >
              {a.i.slice(0, 2)}
            </span>
          ))}
          {extra > 0 && (
            <span className="-ml-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-[10px] font-semibold shrink-0">
              +{extra}
            </span>
          )}
          {team.length === 0 && <span className="text-gray-300 text-xs">—</span>}
        </div>
        <ChevronRight size={16} color="#D1D5DB" />
      </div>
    </article>
  )
}
