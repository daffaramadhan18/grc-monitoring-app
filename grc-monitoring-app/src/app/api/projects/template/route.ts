import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const headers = [
    'Engagement Name', 'Client Name', 'Client Initial', 'Project Owner', 'Status',
    'Start Date', 'End Date', 'Confirmed Fee', 'SPK', 'PKS',
    'MIC', 'Team Members',
    'Termin 1 %', 'Termin 1 Fee', 'Termin 1 Status',
    'Termin 2 %', 'Termin 2 Fee', 'Termin 2 Status',
    'Termin 3 %', 'Termin 3 Fee', 'Termin 3 Status',
    'Termin 4 %', 'Termin 4 Fee', 'Termin 4 Status',
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers])
  XLSX.utils.book_append_sheet(wb, ws, 'Projects')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Projects_Template.xlsx"',
    },
  })
}
