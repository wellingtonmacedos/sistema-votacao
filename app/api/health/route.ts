import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Nunca cachear: cada chamada deve refletir o estado atual do processo e do banco.
export const dynamic = 'force-dynamic'

// Endpoint público de healthcheck (readiness).
//
// O middleware de autenticação cobre apenas /admin, /president e /councilor, logo
// esta rota não exige sessão. É usada pelo healthcheck do docker-compose e por
// monitoramento externo (ex.: Nginx, uptime checks).
export async function GET() {
  try {
    // Consulta leve para confirmar que a conexão com o Postgres está viva.
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({ status: 'ok', database: 'ok' })
  } catch (error) {
    console.error('Healthcheck falhou:', error)

    // 503 indica que a aplicação está de pé, porém não pronta para receber tráfego.
    return NextResponse.json(
      { status: 'error', database: 'down' },
      { status: 503 }
    )
  }
}
