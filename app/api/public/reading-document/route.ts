import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Buscar sessão ativa primeiro
    const currentSession = await prisma.votingSession.findFirst({
      where: {
        status: {
          not: 'CLOSED'
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    if (!currentSession) {
      return NextResponse.json({ document: null })
    }

    // Buscar o documento que está sendo lido
    const readingDocument = await prisma.document.findFirst({
      where: {
        isBeingRead: true,
        sessionId: currentSession.id
      },
      include: {
        creator: {
          select: {
            fullName: true,
            nickname: true,
            photoUrl: true,
            role: true
          }
        }
      }
    })

    let proponent = null

    if (readingDocument) {
      const normalizedAuthor = readingDocument.author?.trim()
      const authorNames = normalizedAuthor
        ? normalizedAuthor
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean)
        : []

      if (authorNames.length > 0) {
        const matchedAuthors = await prisma.user.findMany({
          where: {
            fullName: { in: authorNames }
          },
          select: {
            fullName: true,
            nickname: true,
            photoUrl: true
          }
        })

        const firstMatchedAuthor = authorNames
          .map((name) => matchedAuthors.find((user) => user.fullName === name))
          .find(Boolean)

        proponent = {
          fullName: normalizedAuthor,
          nickname: authorNames.length === 1 ? firstMatchedAuthor?.nickname?.trim() || null : null,
          photoUrl: firstMatchedAuthor?.photoUrl || null
        }
      } else if (readingDocument.creator.role !== 'ADMIN') {
        // Sem autor informado: usa o criador apenas se for vereador/presidente.
        // O administrador não deve aparecer como proponente.
        proponent = {
          fullName: readingDocument.creator.fullName,
          nickname: readingDocument.creator.nickname,
          photoUrl: readingDocument.creator.photoUrl
        }
      }
    }

    // Retornar resposta sem cache
    return NextResponse.json(
      {
        document: readingDocument
          ? {
              ...readingDocument,
              proponent
            }
          : null
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('Erro ao buscar documento em leitura:', error)
    return NextResponse.json({ document: null }, { status: 500 })
  }
}
