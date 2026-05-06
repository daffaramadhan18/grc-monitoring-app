import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { formatRupiah, formatDate } from "@/lib/utils"
import Link from "next/link"
import { ArrowLeft, Pencil, CheckCircle2, Clock } from "lucide-react"

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const { data: proj, error } = await supabase
    .from("projects")
    .select(`
      *,
      client:clients(name),
      termins(*),
      team_members:project_team_members(*, member:team_members(name, role))
    `)
    .eq("id", params.id)
    .single()

  if (error || !proj) notFound()

  const termins = (proj.termins ?? []).sort((a: any, b: any) => a.termin_number - b.termin_number)
  const teamMembers = proj.team_members ?? []

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects" className="text-gray-400 hover:text-gray-700"><ArrowLeft size={18} /></Link>
        <h1 className="text-xl font-semibold text-gray-800 flex-1">{proj.name}</h1>
        <Link
          href={`/projects/${proj.id}/edit`}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          <Pencil size={14} /> Edit
        </Link>
      </div>

      {/* Project details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {[
          ["Client", (proj.client as any)?.name],
          ["SPK Number", proj.spk_number ?? "—"],
          ["PKS Number", proj.pks_number ?? "—"],
          ["Start Date", formatDate(proj.start_date)],
          ["End Date", formatDate(proj.end_date)],
          ["Total Value", formatRupiah(proj.total_value_idr)],
          ["Status", proj.status],
          ["Notes", proj.notes ?? "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex px-5 py-3">
            <span className="w-36 text-sm text-gray-500 shrink-0">{label}</span>
            <span className="text-sm text-gray-800">{value as string}</span>
          </div>
        ))}
      </div>

      {/* Termin tracking */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Payment Termins</h2>
        {termins.length === 0
          ? <p className="text-sm text-gray-400">No termins added yet.</p>
          : (
            <div className="space-y-3">
              {termins.map((t: any) => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                  {t.is_paid
                    ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                    : <Clock size={18} className="text-gray-300 shrink-0" />
                  }
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-800">Termin {t.termin_number}</div>
                    {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm text-gray-800">{formatRupiah(t.fee_idr)}</div>
                    <div className={`text-xs ${t.is_paid ? "text-green-600" : "text-orange-500"}`}>
                      {t.is_paid ? `Paid ${formatDate(t.paid_date)}` : `Due ${formatDate(t.due_date)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Team */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Team Members</h2>
        {teamMembers.length === 0
          ? <p className="text-sm text-gray-400">No team members assigned.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Name</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Role</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Hours (Used/Alloc)</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((tm: any) => (
                  <tr key={tm.id} className="border-b border-gray-50">
                    <td className="py-2 text-gray-800">{tm.member?.name}</td>
                    <td className="py-2 text-gray-500">{tm.role_in_project ?? tm.member?.role ?? "—"}</td>
                    <td className="py-2 text-right text-gray-600">
                      {tm.hours_current ?? 0}h / {tm.hours_allocated ?? 0}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  )
}
