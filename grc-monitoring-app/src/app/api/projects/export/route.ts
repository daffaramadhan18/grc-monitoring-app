import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function fmtDate(date: Date | null | undefined): string {
  if (!date) return ''
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

function fmtDateForFilename(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}-${m}-${y}`
}

export async function GET() {
  const projects = await prisma.project.findMany({
    include: { termins: { orderBy: { terminNumber: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })

  const headers = [
    'Engagement Name', 'Client Name', 'Client Initial', 'Project Owner', 'Status',
    'Start Date', 'End Date', 'Confirmed Fee', 'SPK', 'PKS',
    'MIC', 'TM1', 'TM2', 'TM3', 'TM4', 'TM5', 'TM6',
    'Termin 1 %', 'Termin 1 Fee', 'Termin 1 Status',
    'Termin 2 %', 'Termin 2 Fee', 'Termin 2 Status',
    'Termin 3 %', 'Termin 3 Fee', 'Termin 3 Status',
    'Termin 4 %', 'Termin 4 Fee', 'Termin 4 Status',
  ]

  const dataRows = projects.map((p) => {
    const terminCols: (string | number)[] = []
    for (let t = 1; t <= 4; t++) {
      const termin = p.termins.find((x) => x.terminNumber === t)
      terminCols.push(
        termin?.percentage ?? '',
        termin?.fee != null ? Number(termin.fee) : '',
        termin?.status ?? '',
      )
    }

    return [
      p.proposalName,
      p.clientName    ?? '',
      p.clientInitial ?? '',
      p.projectOwner  ?? '',
      p.status,
      fmtDate(p.startedDate),
      fmtDate(p.endDate),
      p.confirmedFee != null ? Number(p.confirmedFee) : '',
      p.spk ?? '',
      p.pks ?? '',
      p.micInitial ?? '',
      p.tm1Initial ?? '',
      p.tm2Initial ?? '',
      p.tm3Initial ?? '',
      p.tm4Initial ?? '',
      p.tm5Initial ?? '',
      p.tm6Initial ?? '',
      ...terminCols,
    ]
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
  XLSX.utils.book_append_sheet(wb, ws, 'Projects')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const filename = `Projects_Export_${fmtDateForFilename(new Date())}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
