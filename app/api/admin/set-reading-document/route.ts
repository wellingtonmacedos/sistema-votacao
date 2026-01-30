
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { documentId, isReading } = await request.json()

    console.log('📄 Set Reading Document:', { documentId, isReading })

    // Primeiro, parar a leitura de todos os documentos
    const updateResult = await prisma.document.updateMany({
      data: {
        isBeingRead: false
      }
    })
    console.log('📄 Reset all documents isBeingRead:', updateResult.count, 'documents updated')

    // Se isReading for true, definir este documento como sendo lido
    if (isReading && documentId) {
      const updatedDoc = await prisma.document.update({
        where: { id: documentId },
        data: {
          isBeingRead: true
        }
      })
      console.log('📄 Document set to reading:', updatedDoc.title)
    }

    // Verificar estado final
    const currentlyReading = await prisma.document.findFirst({
      where: { isBeingRead: true },
      select: { id: true, title: true }
    })
    console.log('📄 Currently reading document:', currentlyReading ? currentlyReading.title : 'NENHUM')

    return NextResponse.json({ success: true, currentlyReading })
  } catch (error) {
    console.error('Erro ao definir documento em leitura:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
