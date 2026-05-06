import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatRupiah, formatDate } from "@/lib/utils"
import { Plus, CheckCircle2, Clock } from "lucide-react"

const STATUS_STYLE: Record<string, string> = {
  Planning:  "bg-yellow-100 text-yellow-800",
  Fieldwork: "bg-blue-100 text-blue-800",
  Reporting: "bg-purple-100 text-purple-800",
  Finish:    "bg-green-100 text-green-800",
}

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    include: { client: true, termins: { orderBy: { terminNumber: "asc" } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Projects</h1>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000] text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={16} /> New Project
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Proposal</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">SPK/PKS</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Period</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Confirmed Fee</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Termins</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projects.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Belum ada project.</td>
              </tr>
            )}
            {projects.map((proj) => (
              <tr key={proj.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/projects/${proj.id}`} className="font-medium text-gray-900 hover:text-[#CC0000]">
                    {proj.proposalName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600" title={proj.client.fullName}>{proj.client.initial}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[proj.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {proj.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {proj.spk && <div>SPK: {proj.spk}</div>}
                  {proj.pks && <div>PKS: {proj.pks}</div>}
                  {!proj.spk && !proj.pks && "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {formatDate(proj.startedDate?.toISOString())} – {formatDate(proj.endDate?.toISOString())}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(Number(proj.confirmedFee ?? 0))}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-1">
                    {proj.termins.length === 0
                      ? <span className="text-gray-300 text-xs">—</span>
                      : proj.termins.map((t) => (
                        <span key={t.id} title={`Termin ${t.terminNumber}: ${formatRupiah(Number(t.fee ?? 0))} — ${t.status}`}>
                          {t.status === "Paid"
                            ? <CheckCircle2 size={16} className="text-green-500" />
                            : <Clock size={16} className="text-gray-300" />}
                        </span>
                      ))
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
