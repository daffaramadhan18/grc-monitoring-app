import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const data = await prisma.opportunity.findMany({
    include: { client: true, serviceType: true, subService: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const data = await prisma.opportunity.create({ data: body })
  return NextResponse.json(data, { status: 201 })
}
