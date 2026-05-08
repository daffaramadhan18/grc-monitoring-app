import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const headers = [
    'Proposal Name', 'Client Name', 'Service Type', 'Sub-service', 'Phase', 'Status',
    'Probability', 'Harga', 'Revenue CF', '%RR', 'Expected Date', 'Submitted Date',
    'MIC', 'TM1', 'TM2', 'TM3', 'TM4', 'TM5', 'TM6', 'Notes',
  ]

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([headers])
  XLSX.utils.book_append_sheet(wb, ws, 'Opportunities')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Opportunities_Template.xlsx"',
    },
  })
}
