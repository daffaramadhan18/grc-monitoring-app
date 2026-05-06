import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const data = await prisma.project.findMany({
    include: { client: true, termins: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { termins, ...projectData } = body
  const project = await prisma.project.create({
    data: {
      ...projectData,
      termins: termins?.length
        ? { create: termins }
        : undefined,
    },
  })
  return NextResponse.json(project, { status: 201 })
}
