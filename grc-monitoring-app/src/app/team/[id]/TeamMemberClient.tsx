'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { OPP_STATUS_COLORS, PROJ_STATUS_COLORS, TERMIN_STATUS_COLORS, formatRupiah, formatDate } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member { id: number; fullName: string; initial: string; level: string }

interface Proposal {
  id: number; proposalName: string; status: string; expectedDate: string | null
  micInitial: string | null; tm1Initial: string | null; tm2Initial: string | null
  tm3Initial: string | null; tm4Initial: string | null; tm5Initial: string | null; tm6Initial: string | null
  clientName?: string | null
  serviceType?: { name: string } | null
}

interface Termin { status: string; fee: number | null }

interface Project {
  id: number; proposalName: string; status: string
  startedDate: string | null; endDate: string | null; confirmedFee: number | null
  micInitial: string | null; tm1Initial: string | null; tm2Initial: string | null
  tm3Initial: string | null; tm4Initial: string | null; tm5Initial: string | null; tm6Initial: string | null
  clientName?: string | null
  termins?: Termin[]
}

interface Props { member: Member; proposals: Proposal[]; projects: Project[] }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-[#009CDE]', 'bg-[#43B02A]', 'bg-[#58595B]', 'bg-[#F59E0B]', 'bg-[#8B5CF6]', 'bg-[#EC4899]',
]

function avatarColor(initial: string) {
  const hash = initial.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function capacityBadge(projects: number, proposals: number) {
  if (projects > 2 || proposals > 2)
    return { label: 'Overloaded',  cls: 'bg-red-100 text-red-700' }
  if (projects === 2 && proposals === 2)
    return { label: 'At Capacity', cls: 'bg-amber-100 text-amber-700' }
  return   { label: 'Available',   cls: 'bg-[#43B02A]/15 text-[#2d7a1a]' }
}

const TM_FIELDS = ['micInitial','tm1Initial','tm2Initial','tm3Initial','tm4Initial','tm5Initial','tm6Initial'] as const
const TM_LABELS = ['MIC','TM1','TM2','TM3','TM4','TM5','TM6']

function roleOf(row: Record<string, any>, initial: string): string {
  for (let i = 0; i < TM_FIELDS.length; i++) {
    if (row[TM_FIELDS[i]] === initial) return TM_LABELS[i]
  }
  return '—'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TeamMemberClient({ member, proposals, projects }: Props) {
  const router = useRouter()
  const badge = capacityBadge(projects.length, proposals.length)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/team')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Team Member Detail</h1>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
        <div className={`w-14 h-14 ${avatarColor(member.initial)} rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0`}>
          {member.initial.slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{member.fullName}</h2>
          <p className="text-sm text-gray-500">{member.level}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex px-2 py-1 rounded font-mono text-xs font-semibold bg-slate-100 text-slate-700">
            {member.initial}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Active Proposals */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Active Proposals</h3>
          <span className="text-xs text-gray-400">{proposals.length} proposal{proposals.length !== 1 ? 's' : ''}</span>
        </div>
        {proposals.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Tidak ada proposal aktif</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Proposal Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Service Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Expected</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {proposals.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{o.proposalName}</td>
                  <td className="px-4 py-3 text-gray-600">{o.client?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{o.serviceType?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${OPP_STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(o.expectedDate)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                      {roleOf(o, member.initial)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Active Projects */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Active Projects</h3>
          <span className="text-xs text-gray-400">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
        </div>
        {projects.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">Tidak ada project aktif</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Engagement Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Period</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Confirmed Fee</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Termins</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {projects.map((p) => {
                const paid = p.termins?.filter((t) => t.status === 'Paid').length ?? 0
                const total = p.termins?.length ?? 0
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{p.proposalName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.client?.fullName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${PROJ_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatDate(p.startedDate)} – {formatDate(p.endDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatRupiah(p.confirmedFee)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {total > 0 ? `${paid}/${total} paid` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {roleOf(p, member.initial)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
