import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { formatRupiah, formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft, Pencil, CheckCircle2, Clock } from "lucide-react"

const TERMIN_STYLE: Record<string, string> = {
  "Paid":              "text-green-600",
  "Invoice Sent":      "text-blue-600",
  "Invoice Requested": "text-yellow-600",
  "Unpaid":            "text-orange-500",
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const proj = await prisma.project.findUnique({
    where: { id: Number(params.id) },
    include: {
      client: true,
      termins: { orderBy: { terminNumber: "asc" } },
    },
  })

  if (!proj) notFound()

  const teamInitials = [
    proj.micInitial && `MIC: ${proj.micInitial}`,
    proj.tm1Initial, proj.tm2Initial, proj.tm3Initial,
    proj.tm4Initial, proj.tm5Initial, proj.tm6Initial,
  ].filter(Boolean).join(", ")

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-gray-400 hover:text-gray-700"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-semibold text-gray-800 flex-1">{proj.proposalName}</h1>
        <Link
          href={`/projects/${proj.id}/edit`}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <Pencil size={14} /> Edit
        </Link>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {([
          ["Client", `${proj.client.initial} — ${proj.client.fullName}`],
          ["Project Owner", proj.projectOwner ?? "—"],
          ["Status", proj.status],
          ["Period", `${formatDate(proj.startedDate?.toISOString())} – ${formatDate(proj.endDate?.toISOString())}`],
          ["SPK", proj.spk ?? "—"],
          ["PKS", proj.pks ?? "—"],
          ["Confirmed Fee", formatRupiah(Number(proj.confirmedFee ?? 0))],
          ["Hours", `${proj.currentHours ?? 0} / ${proj.alokasiHours ?? 0} jam`],
          ["Team", teamInitials || "—"],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label} className="flex px-5 py-3">
            <span className="w-36 text-sm text-gray-500 shrink-0">{label}</span>
            <span className="text-sm text-gray-800">{value}</span>
          </div>
        ))}
      </div>

      {/* Termins */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Termin Pembayaran</h2>
        {proj.termins.length === 0
          ? <p className="text-sm text-gray-400">Belum ada termin.</p>
          : (
            <div className="space-y-3">
              {proj.termins.map((t) => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                  {t.status === "Paid"
                    ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    : <Clock size={18} className="text-gray-300 shrink-0" />
                  }
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-800">Termin {t.terminNumber}</div>
                    {t.percentage != null && (
                      <div className="text-xs text-gray-500">{t.percentage}%</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm text-gray-800">{formatRupiah(Number(t.fee ?? 0))}</div>
                    <div className={`text-xs font-medium ${TERMIN_STYLE[t.status ?? "Unpaid"] ?? "text-gray-500"}`}>
                      {t.status ?? "Unpaid"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}
