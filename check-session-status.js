const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('=== STATUS DAS SESSÕES ===\n');
  
  // Buscar todas as sessões
  const sessions = await prisma.votingSession.findMany({
    orderBy: { date: 'desc' },
    take: 5
  });
  
  if (sessions.length === 0) {
    console.log('❌ PROBLEMA: Nenhuma sessão encontrada no banco de dados!');
    console.log('\n💡 SOLUÇÃO: É necessário criar uma sessão primeiro.');
    console.log('   Execute o script de seed: yarn prisma db seed');
  } else {
    console.log(`✅ ${sessions.length} sessão(ões) encontrada(s):\n`);
    sessions.forEach((session, index) => {
      console.log(`${index + 1}. Sessão #${session.sessionNumber}`);
      console.log(`   ID: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Data: ${new Date(session.date).toLocaleDateString('pt-BR')}`);
      console.log(`   Iniciada: ${session.startedAt ? 'Sim' : 'Não'}`);
      console.log(`   Encerrada: ${session.endedAt ? 'Sim' : 'Não'}`);
      console.log('');
    });
    
    // Verificar se existe alguma sessão ativa
    const activeSession = await prisma.votingSession.findFirst({
      where: {
        status: {
          not: 'CLOSED'
        }
      }
    });
    
    if (activeSession) {
      console.log('✅ Sessão ativa encontrada:');
      console.log(`   Sessão #${activeSession.sessionNumber}`);
      console.log(`   Status: ${activeSession.status}`);
    } else {
      console.log('⚠️ Nenhuma sessão ativa no momento (todas estão encerradas)');
      console.log('   Para ativar uma sessão, use o painel administrativo');
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
