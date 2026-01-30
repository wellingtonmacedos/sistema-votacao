
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function demoPresenca() {
  try {
    console.log('🚀 Iniciando demo da chamada de presença...')

    // Buscar a sessão ativa
    const session = await prisma.votingSession.findFirst({
      where: { status: 'PEQUENO_EXPEDIENTE' }
    })

    if (!session) {
      console.log('❌ Nenhuma sessão ativa encontrada')
      return
    }

    console.log(`✅ Sessão encontrada: ${session.sessionNumber}`)

    // Iniciar a chamada de presença
    await prisma.votingSession.update({
      where: { id: session.id },
      data: {
        isAttendanceOpen: true,
        attendanceStartedAt: new Date(),
        attendanceEndedAt: null
      }
    })

    console.log('📋 Chamada de presença iniciada!')

    // Buscar alguns vereadores para registrar presença
    const vereadores = await prisma.user.findMany({
      where: { role: 'COUNCILOR' },
      take: 8
    })

    console.log(`👥 Encontrados ${vereadores.length} vereadores`)

    // Registrar presença para alguns vereadores
    const presencesPromises = vereadores.map(async (vereador, index) => {
      // Simular que alguns chegaram e outros ainda não
      const isPresent = index < 5 // Primeiros 5 estão presentes
      
      if (isPresent) {
        await prisma.attendance.upsert({
          where: {
            sessionId_userId: {
              sessionId: session.id,
              userId: vereador.id
            }
          },
          create: {
            sessionId: session.id,
            userId: vereador.id,
            isPresent: true,
            arrivedAt: new Date(Date.now() - Math.random() * 30 * 60 * 1000) // Chegaram nos últimos 30 min
          },
          update: {
            isPresent: true,
            arrivedAt: new Date(Date.now() - Math.random() * 30 * 60 * 1000)
          }
        })
        console.log(`✅ ${vereador.fullName} - PRESENTE`)
      } else {
        await prisma.attendance.upsert({
          where: {
            sessionId_userId: {
              sessionId: session.id,
              userId: vereador.id
            }
          },
          create: {
            sessionId: session.id,
            userId: vereador.id,
            isPresent: false,
            arrivedAt: null
          },
          update: {
            isPresent: false,
            arrivedAt: null
          }
        })
        console.log(`❌ ${vereador.fullName} - AUSENTE`)
      }
    })

    await Promise.all(presencesPromises)

    console.log('🎉 Demo da presença configurada com sucesso!')
    console.log('📱 Agora você pode acessar http://localhost:3000/painel para ver o novo design!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

demoPresenca()
