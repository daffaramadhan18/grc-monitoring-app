import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { formatRupiah, formatDate } from "@/lib/utils"
import type { Project } from "@/types"
import { Plus, CheckCircle2, Clock } from "lucide-react"

async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      client:clients(id, name),
      termins(id, termin_number, fee_idr, is_paid)
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as Project[]
}

const STATUS_STYLE: Record<string, string> = {
  Active: "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
  "On Hold": "bg-yellow-100 text-yellow-800",
  Cancelled: "bg-red-100 text-red-800",
}

export default async function ProjectsPage() {
  const projects = await getProjects()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Projects</h1>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#CC0000] text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus size={16} />
          New Project
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Project</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Client</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">SPK/PKS</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Period</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Total Value</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Termins</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {projects.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No projects yet.
                </td>
              </tr>
            )}
            {projects.map((proj) => {
              const termins = proj.termins ?? []
              const paidCount = termins.filter((t) => t.is_paid).length
              return (
                <tr key={proj.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${proj.id}`} className="font-medium text-gray-900 hover:text-[#CC0000]">
                      {proj.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{(proj.client as any)?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[proj.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {proj.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {proj.spk_number && <div>SPK: {proj.spk_number}</div>}
                    {proj.pks_number && <div>PKS: {proj.pks_number}</div>}
                    {!proj.spk_number && !proj.pks_number && "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(proj.start_date)} – {formatDate(proj.end_date)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{formatRupiah(proj.total_value_idr)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      {termins.length === 0
                        ? <span className="text-gray-300 text-xs">—</span>
                        : termins.map((t) => (
                          <span key={t.id} title={`Termin ${t.termin_number}: ${formatRupiah(t.fee_idr)}`}>
                            {t.is_paid
                              ? <CheckCircle2 size={16} className="text-green-500" />
                              : <Clock size={16} className="text-gray-300" />
                            }
                          </span>
                        ))
                      }
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
