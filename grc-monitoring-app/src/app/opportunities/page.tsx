import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatRupiah, formatDate, STATUS_COLORS } from "@/lib/utils"
import { Plus } from "lucide-react"

export default async function OpportunitiesPage() {
  const opportunities = await prisma.opportunity.findMany({
    include: { client: true, serviceType: true, subService: true },
    orderBy: { createdAt: "desc" },
  })

  const statusSummary = ["Win", "In Progress", "Waiting for Result", "Submitted"]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Opportunities</h1>
        <Link
          href="/opportunities/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000] text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={16} /> New Opportunity
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusSummary.map((s) => (
          <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s]}`}>
            {s}: {opportunities.filter((o) => o.status === s).length}
          </span>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Proposal</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Sub-Service</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Fase</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Harga</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">MIC</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {opportunities.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Belum ada opportunity.
                </td>
              </tr>
            )}
            {opportunities.map((opp) => (
              <tr key={opp.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/opportunities/${opp.id}`} className="font-medium text-gray-900 hover:text-[#CC0000]">
                    {opp.proposalName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600" title={opp.client.fullName}>
                  {opp.client.initial}
                </td>
                <td className="px-4 py-3 text-gray-600">{opp.subService.name}</td>
                <td className="px-4 py-3 text-gray-500">{opp.fase ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[opp.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {opp.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(Number(opp.harga ?? 0))}</td>
                <td className="px-4 py-3 text-gray-600">{opp.micInitial ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(opp.submittedDate?.toISOString())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
