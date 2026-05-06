import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
  }

  const buffer   = Buffer.from(await file.arrayBuffer())
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const dir      = path.join(process.cwd(), 'public', 'uploads')

  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, safeName), buffer)

  return NextResponse.json({
    path:     `/uploads/${safeName}`,
    filename: file.name,
  })
}
