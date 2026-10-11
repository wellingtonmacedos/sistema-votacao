
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseBody, setReadingDocumentSchema, ValidationError } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { documentId, isReading } = parseBody(setReadingDocumentSchema, body)

    await prisma.document.updateMany({
      data: {
        isBeingRead: false
      }
    })

    if (isReading && documentId) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          isBeingRead: true
        }
      })
    }

    const currentlyReading = await prisma.document.findFirst({
      where: { isBeingRead: true },
      select: { id: true, title: true }
    })

    return NextResponse.json({ success: true, currentlyReading })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro ao definir documento em leitura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
