
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Armazenamento temporário dos resultados (em produção, use Redis ou similar)
let tempResult: any = null
let resultTimeout: NodeJS.Timeout | null = null

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin ou presidente
    if (session.user.role !== 'ADMIN' && session.user.role !== 'PRESIDENT') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { result } = await request.json()

    // Armazenar resultado temporariamente
    tempResult = result
    
    // Limpar resultado após 10 segundos
    if (resultTimeout) {
      clearTimeout(resultTimeout)
    }
    
    resultTimeout = setTimeout(() => {
      tempResult = null
    }, 10000) // 10 segundos

    return NextResponse.json({ message: 'Resultado será exibido por 10 segundos' })

  } catch (error) {
    console.error('Erro ao mostrar resultado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// GET - Buscar resultado temporário
export async function GET() {
  return NextResponse.json({ result: tempResult })
}
