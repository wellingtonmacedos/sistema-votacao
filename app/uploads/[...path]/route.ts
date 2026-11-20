import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import fs from 'fs'

// Em produção (Next.js standalone) o servidor só serve estaticamente arquivos de
// `public/` que existiam no boot. Como os anexos são enviados em runtime, eles
// dariam 404 até um restart. Este handler serve `/uploads/*` lendo direto do disco
// (o diretório de uploads, que em produção é um volume persistente).
export const dynamic = 'force-dynamic'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const segments = params.path || []

    // Os anexos são sempre um único arquivo (sem subpastas) com nome seguro.
    if (segments.length !== 1) {
      return new NextResponse('Not found', { status: 404 })
    }

    const fileName = segments[0]
    if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const filePath = path.resolve(UPLOAD_DIR, fileName)
    if (!filePath.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) {
      return new NextResponse('Not found', { status: 404 })
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Not found', { status: 404 })
    }

    const data = await readFile(filePath)
    const contentType =
      MIME_TYPES[path.extname(fileName).toLowerCase()] || 'application/octet-stream'

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Erro ao servir anexo:', error)
    return new NextResponse('Internal error', { status: 500 })
  }
}
