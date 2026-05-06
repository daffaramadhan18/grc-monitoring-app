import { supabase } from "@/lib/supabase"
import { formatRupiah } from "@/lib/utils"
import type { DashboardStats, TeamWorkload } from "@/types"
import {
  TrendingUp, FolderKanban, DollarSign, Award,
} from "lucide-react"
import WinRateChart from "./WinRateChart"
import WorkloadTable from "./WorkloadTable"

async function getStats(): Promise<DashboardStats> {
  const [{ data: opps }, { data: projects }, { data: termins }] = await Promise.all([
    supabase.from("opportunities").select("status, value_idr"),
    supabase.from("projects").select("status"),
    supabase.from("termins").select("fee_idr, is_paid"),
  ])

  const total = opps?.length ?? 0
  const wins = opps?.filter((o) => o.status === "Win").length ?? 0
  const loses = opps?.filter((o) => o.status === "Lose").length ?? 0
  const inProgress = opps?.filter((o) => o.status === "In Progress").length ?? 0
  const decided = wins + loses
  const winRate = decided > 0 ? Math.round((wins / decided) * 100) : 0
  const pipelineValue = opps
    ?.filter((o) => !["Lose", "Cancelled", "Withdraw"].includes(o.status))
    .reduce((s, o) => s + (o.value_idr ?? 0), 0) ?? 0
  const activeProjects = projects?.filter((p) => p.status === "Active").length ?? 0
  const totalRevenue = termins?.filter((t) => t.is_paid).reduce((s, t) => s + (t.fee_idr ?? 0), 0) ?? 0
  const pendingRevenue = termins?.filter((t) => !t.is_paid).reduce((s, t) => s + (t.fee_idr ?? 0), 0) ?? 0

  return {
    total_opportunities: total,
    win_count: wins,
    lose_count: loses,
    in_progress_count: inProgress,
    win_rate: winRate,
    pipeline_value_idr: pipelineValue,
    active_projects: activeProjects,
    total_revenue_idr: totalRevenue,
    pending_revenue_idr: pendingRevenue,
  }
}

async function getWorkload(): Promise<TeamWorkload[]> {
  const { data } = await supabase
    .from("project_team_members")
    .select(`
      team_member_id,
      hours_allocated,
      hours_current,
      project:projects(status),
      member:team_members(name)
    `)

  if (!data) return []

  const map = new Map<string, TeamWorkload>()
  for (const row of data) {
    const id = row.team_member_id
    const isActive = (row.project as any)?.status === "Active"
    if (!map.has(id)) {
      map.set(id, {
        team_member_id: id,
        name: (row.member as any)?.name ?? "Unknown",
        active_projects: 0,
        hours_allocated: 0,
        hours_current: 0,
      })
    }
    const entry = map.get(id)!
    if (isActive) entry.active_projects++
    entry.hours_allocated += row.hours_allocated ?? 0
    entry.hours_current += row.hours_current ?? 0
  }
  return [...map.values()].sort((a, b) => b.active_projects - a.active_projects)
}

const StatCard = ({
  label, value, icon: Icon, sub,
}: { label: string; value: string; icon: any; sub?: string }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </div>
      <div className="p-2.5 bg-red-50 rounded-lg">
        <Icon size={20} className="text-[#CC0000]" />
      </div>
    </div>
  </div>
)

export default async function DashboardPage() {
  const [stats, workload] = await Promise.all([getStats(), getWorkload()])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Win Rate"
          value={`${stats.win_rate}%`}
          icon={Award}
          sub={`${stats.win_count}W / ${stats.lose_count}L`}
        />
        <StatCard
          label="Pipeline Value"
          value={formatRupiah(stats.pipeline_value_idr)}
          icon={TrendingUp}
          sub={`${stats.total_opportunities} opportunities`}
        />
        <StatCard
          label="Active Projects"
          value={String(stats.active_projects)}
          icon={FolderKanban}
        />
        <StatCard
          label="Revenue Collected"
          value={formatRupiah(stats.total_revenue_idr)}
          icon={DollarSign}
          sub={`${formatRupiah(stats.pending_revenue_idr)} pending`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-600 mb-4">Opportunity Pipeline</h2>
          <WinRateChart stats={stats} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-600 mb-4">Team Workload</h2>
          <WorkloadTable workload={workload} />
        </div>
      </div>
    </div>
  )
}
