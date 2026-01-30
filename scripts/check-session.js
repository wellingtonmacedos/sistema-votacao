require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkSession() {
  try {
    console.log('🔍 Verificando sessões...')
    
    // Buscar todas as sessões
    const allSessions = await prisma.votingSession.findMany({
      orderBy: { date: 'desc' }
    })
    
    console.log(`Total de sessões: ${allSessions.length}`)
    allSessions.forEach((session, index) => {
      console.log(`${index + 1}. ID: ${session.id}, Número: ${session.sessionNumber}, Status: ${session.status}, Data: ${session.date}`)
    })
    
    // Buscar sessão ativa (não fechada)
    const activeSession = await prisma.votingSession.findFirst({
      where: {
        status: {
          not: 'CLOSED'
        }
      },
      orderBy: {
        date: 'desc'
      }
    })
    
    console.log('\n🔍 Sessão ativa encontrada:', activeSession ? 'SIM' : 'NÃO')
    if (activeSession) {
      console.log('Detalhes da sessão ativa:')
      console.log(`- ID: ${activeSession.id}`)
      console.log(`- Número: ${activeSession.sessionNumber}`)
      console.log(`- Status: ${activeSession.status}`)
      console.log(`- Data: ${activeSession.date}`)
    }
    
    // Se não há sessão ativa, vou ativar a primeira
    if (!activeSession && allSessions.length > 0) {
      console.log('\n🔧 Ativando a primeira sessão...')
      const updatedSession = await prisma.votingSession.update({
        where: { id: allSessions[0].id },
        data: { status: 'PEQUENO_EXPEDIENTE' }
      })
      console.log(`✅ Sessão ${updatedSession.sessionNumber} ativada com status: ${updatedSession.status}`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSession()