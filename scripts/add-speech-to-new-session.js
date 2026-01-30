const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar sessão mais recente
  const session = await prisma.votingSession.findFirst({
    where: { status: { not: 'CLOSED' } },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!session) {
    console.log('Nenhuma sessão ativa encontrada');
    return;
  }
  
  console.log('Sessão encontrada:', session.sessionNumber);
  
  // Buscar vereador
  const councilor = await prisma.user.findFirst({
    where: { role: 'COUNCILOR' },
    orderBy: { createdAt: 'asc' }
  });
  
  if (!councilor) {
    console.log('Nenhum vereador encontrado');
    return;
  }
  
  console.log('Vereador:', councilor.fullName);
  
  // Criar inscrição
  const speechRequest = await prisma.speechRequest.create({
    data: {
      sessionId: session.id,
      userId: councilor.id,
      type: 'CONSIDERACOES_FINAIS',
      subject: 'Proposta de melhorias no sistema de transporte público',
      isApproved: true,
      isSpeaking: false,
      hasSpoken: false,
      orderIndex: 1,
      createdAt: new Date()
    }
  });
  
  console.log('\n✅ Inscrição criada com sucesso!');
  console.log('ID:', speechRequest.id);
  console.log('Assunto:', speechRequest.subject);
  console.log('Status: Aprovado e aguardando');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
