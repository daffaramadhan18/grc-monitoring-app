import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { formatRupiah, formatDate, STATUS_COLORS } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const { data: opp, error } = await supabase
    .from("opportunities")
    .select(`
      *,
      client:clients(*),
      service_type:service_types(name),
      sub_service:sub_services(name),
      pic:team_members(name)
    `)
    .eq("id", params.id)
    .single()

  if (error || !opp) notFound()

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/opportunities" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-gray-800 flex-1">{opp.title}</h1>
        <Link
          href={`/opportunities/${opp.id}/edit`}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <Pencil size={14} /> Edit
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {[
          ["Status", <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[opp.status]}`}>{opp.status}</span>],
          ["Client", (opp.client as any)?.name],
          ["Service Type", (opp.service_type as any)?.name ?? "—"],
          ["Sub-Service", (opp.sub_service as any)?.name ?? "—"],
          ["Value", formatRupiah(opp.value_idr)],
          ["PIC", (opp.pic as any)?.name ?? "—"],
          ["Submitted Date", formatDate(opp.submitted_date)],
          ["Notes", opp.notes ?? "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex px-5 py-3.5">
            <span className="w-36 text-sm text-gray-500 shrink-0">{label}</span>
            <span className="text-sm text-gray-800">{value as React.ReactNode}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
