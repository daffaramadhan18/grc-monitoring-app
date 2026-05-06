import { prisma } from "@/lib/prisma"
import { formatRupiah } from "@/lib/utils"
import { TrendingUp, FolderKanban, DollarSign, Award } from "lucide-react"
import WinRateChart from "./WinRateChart"
import WorkloadTable from "./WorkloadTable"

async function getStats() {
  const [opps, projects, termins] = await Promise.all([
    prisma.opportunity.findMany({ select: { status: true, harga: true } }),
    prisma.project.findMany({ select: { status: true } }),
    prisma.termin.findMany({ select: { fee: true, status: true } }),
  ])

  const wins = opps.filter((o) => o.status === "Win").length
  const loses = opps.filter((o) => o.status === "Lose").length
  const decided = wins + loses

  return {
    total_opportunities: opps.length,
    win_count: wins,
    lose_count: loses,
    in_progress_count: opps.filter((o) => o.status === "In Progress").length,
    win_rate: decided > 0 ? Math.round((wins / decided) * 100) : 0,
    pipeline_value: opps
      .filter((o) => !["Lose", "Cancelled", "Withdraw"].includes(o.status))
      .reduce((s, o) => s + Number(o.harga ?? 0), 0),
    active_projects: projects.filter((p) => p.status !== "Finish").length,
    total_revenue: termins
      .filter((t) => t.status === "Paid")
      .reduce((s, t) => s + Number(t.fee ?? 0), 0),
    pending_revenue: termins
      .filter((t) => t.status !== "Paid")
      .reduce((s, t) => s + Number(t.fee ?? 0), 0),
  }
}

async function getWorkload() {
  const members = await prisma.teamMember.findMany()
  const projects = await prisma.project.findMany({
    where: { status: { not: "Finish" } },
    select: {
      micInitial: true, tm1Initial: true, tm2Initial: true, tm3Initial: true,
      tm4Initial: true, tm5Initial: true, tm6Initial: true,
      alokasiHours: true, currentHours: true,
    },
  })

  return members.map((m) => {
    const myProjects = projects.filter((p) =>
      [p.micInitial, p.tm1Initial, p.tm2Initial, p.tm3Initial,
       p.tm4Initial, p.tm5Initial, p.tm6Initial].includes(m.initial)
    )
    return {
      initial: m.initial,
      fullName: m.fullName,
      active_projects: myProjects.length,
      alokasi_hours: myProjects.reduce((s, p) => s + (p.alokasiHours ?? 0), 0),
      current_hours: myProjects.reduce((s, p) => s + (p.currentHours ?? 0), 0),
    }
  }).filter((m) => m.active_projects > 0)
    .sort((a, b) => b.active_projects - a.active_projects)
}

const StatCard = ({ label, value, icon: Icon, sub }: {
  label: string; value: string; icon: any; sub?: string
}) => (
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Win Rate" value={`${stats.win_rate}%`} icon={Award}
          sub={`${stats.win_count}W / ${stats.lose_count}L`} />
        <StatCard label="Pipeline Value" value={formatRupiah(stats.pipeline_value)} icon={TrendingUp}
          sub={`${stats.total_opportunities} opportunities`} />
        <StatCard label="Active Projects" value={String(stats.active_projects)} icon={FolderKanban} />
        <StatCard label="Revenue Collected" value={formatRupiah(stats.total_revenue)} icon={DollarSign}
          sub={`${formatRupiah(stats.pending_revenue)} pending`} />
      </div>

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
