import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const data = await prisma.project.findUnique({
    where: { id: Number(params.id) },
    include: { client: true, termins: true },
  })
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { termins, ...projectData } = body
  const data = await prisma.project.update({ where: { id: Number(params.id) }, data: projectData })
  return NextResponse.json(data)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.project.delete({ where: { id: Number(params.id) } })
  return new NextResponse(null, { status: 204 })
}
