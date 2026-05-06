import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { formatRupiah, formatDate, STATUS_COLORS } from "@/lib/utils"
import type { Opportunity } from "@/types"
import { Plus } from "lucide-react"

async function getOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("opportunities")
    .select(`
      *,
      client:clients(id, name),
      service_type:service_types(id, name),
      pic:team_members(id, name)
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Opportunity[]
}

export default async function OpportunitiesPage() {
  const opportunities = await getOpportunities()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Opportunities</h1>
        <Link
          href="/opportunities/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000] text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={16} />
          New Opportunity
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {["Win", "In Progress", "Waiting for Result", "Submitted"].map((s) => {
          const count = opportunities.filter((o) => o.status === s).length
          return (
            <span key={s} className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s]}`}>
              {s}: {count}
            </span>
          )
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Title</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Service</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Value</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">PIC</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {opportunities.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No opportunities yet. Click &ldquo;New Opportunity&rdquo; to add one.
                </td>
              </tr>
            )}
            {opportunities.map((opp) => (
              <tr key={opp.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/opportunities/${opp.id}`} className="font-medium text-gray-900 hover:text-[#CC0000]">
                    {opp.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{opp.client?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{opp.service_type?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[opp.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {opp.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(opp.value_idr)}</td>
                <td className="px-4 py-3 text-gray-600">{(opp.pic as any)?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(opp.submitted_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
