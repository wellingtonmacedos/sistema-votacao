const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar sessão ativa
  const session = await prisma.votingSession.findFirst({
    where: { status: { not: 'CLOSED' } },
    orderBy: { createdAt: 'desc' }
  });
  
  // Buscar um vereador
  const councilor = await prisma.user.findFirst({
    where: { role: 'COUNCILOR' }
  });
  
  if (!session || !councilor) {
    console.log('Sessão ou vereador não encontrado');
    return;
  }
  
  // Criar nova inscrição
  const speechRequest = await prisma.speechRequest.create({
    data: {
      sessionId: session.id,
      userId: councilor.id,
      type: 'CONSIDERACOES_FINAIS',
      subject: 'Discussão sobre melhorias na infraestrutura urbana',
      isApproved: true,
      isSpeaking: false,
      hasSpoken: false,
      orderIndex: 2,
      createdAt: new Date()
    }
  });
  
  console.log('Nova inscrição criada:', JSON.stringify(speechRequest, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
