import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { formatRupiah, formatDate, OPP_STATUS_COLORS } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const opp = await prisma.opportunity.findUnique({
    where: { id: Number(params.id) },
    include: { client: true, serviceType: true, subService: true },
  })

  if (!opp) notFound()

  const rows: [string, React.ReactNode][] = [
    ["Status", <span key="status" className={`px-2 py-0.5 rounded-full text-xs font-medium ${OPP_STATUS_COLORS[opp.status] ?? 'bg-gray-100 text-gray-600'}`}>{opp.status}</span>],
    ["Client", `${opp.client.initial} — ${opp.client.fullName}`],
    ["Service Type", opp.serviceType?.name ?? "—"],
    ["Sub-Service", opp.subService?.name ?? "—"],
    ["Phase", opp.phase ?? "—"],
    ["Probability", opp.probability ?? "—"],
    ["Harga", formatRupiah(Number(opp.harga ?? 0))],
    ["Revenue CF", formatRupiah(Number(opp.revenueCf ?? 0))],
    ["RR %", opp.rrPercentage != null ? `${opp.rrPercentage}%` : "—"],
    ["MIC", opp.micInitial ?? "—"],
    ["TM", [opp.tm1Initial, opp.tm2Initial, opp.tm3Initial, opp.tm4Initial, opp.tm5Initial, opp.tm6Initial].filter(Boolean).join(", ") || "—"],
    ["Expected Date", formatDate(opp.expectedDate?.toISOString())],
    ["Submitted Date", formatDate(opp.submittedDate?.toISOString())],
    ["Notes", opp.notes ?? "—"],
  ]

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/opportunities" className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-semibold text-gray-800 flex-1">{opp.proposalName}</h1>
        <Link
          href={`/opportunities/${opp.id}/edit`}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <Pencil size={14} /> Edit
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {rows.map(([label, value]) => (
          <div key={label as string} className="flex px-5 py-3.5">
            <span className="w-36 text-sm text-gray-500 shrink-0">{label}</span>
            <span className="text-sm text-gray-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
