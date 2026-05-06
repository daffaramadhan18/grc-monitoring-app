import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("projects")
    .select(`*, client:clients(id,name), termins(*), team_members:project_team_members(*, member:team_members(name,role))`)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { termins, team_members, ...projectData } = body

  const { data: project, error } = await supabase
    .from("projects")
    .insert(projectData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Insert termins if provided
  if (termins?.length) {
    const terminRows = termins.map((t: any) => ({ ...t, project_id: project.id }))
    await supabase.from("termins").insert(terminRows)
  }

  // Insert team members if provided
  if (team_members?.length) {
    const tmRows = team_members.map((m: any) => ({ ...m, project_id: project.id }))
    await supabase.from("project_team_members").insert(tmRows)
  }

  return NextResponse.json(project, { status: 201 })
}
