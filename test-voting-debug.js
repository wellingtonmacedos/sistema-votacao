
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function debugVotingSystem() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 DEBUG: Sistema de Votação\n');

    // 1. Verificar usuários admin
    console.log('1️⃣ Verificando usuários admin...');
    const admins = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'PRESIDENT' }
        ]
      }
    });
    console.log(`   ✅ Encontrados ${admins.length} administradores:`, 
      admins.map(a => `${a.fullName} (${a.role})`));

    // 2. Verificar sessão ativa
    console.log('\n2️⃣ Verificando sessão ativa...');
    const currentSession = await prisma.votingSession.findFirst({
      where: { status: { not: 'SCHEDULED' } },
      orderBy: { updatedAt: 'desc' },
      include: {
        attendances: {
          include: { user: true }
        }
      }
    });
    
    if (currentSession) {
      console.log(`   ✅ Sessão ativa: ${currentSession.title} (${currentSession.status})`);
      console.log(`   👥 Presenças: ${currentSession.attendances.filter(a => a.isPresent).length} presentes`);
    } else {
      console.log('   ❌ Nenhuma sessão ativa encontrada');
    }

    // 3. Verificar matérias existentes
    console.log('\n3️⃣ Verificando matérias...');
    const matters = await prisma.matter.findMany({
      include: {
        votes: true,
        creator: true
      }
    });
    console.log(`   📋 Encontradas ${matters.length} matérias:`);
    matters.forEach(m => {
      console.log(`      - ${m.title} (${m.status}) - Votos: ${m.votes.length}`);
    });

    // 4. Criar matérias de teste se não existirem
    if (matters.length === 0) {
      console.log('\n🔧 Criando matérias de teste...');
      const admin = admins.find(a => a.role === 'ADMIN') || admins[0];
      
      if (admin) {
        const testMatters = [
          {
            title: 'Aprovação do Orçamento Municipal 2024',
            description: 'Votação para aprovação do orçamento anual do município para o exercício de 2024.',
            creatorId: admin.id,
            status: 'PENDING'
          },
          {
            title: 'Lei do Plano Diretor - Alterações',
            description: 'Proposta de alterações no plano diretor municipal para adequação às novas demandas urbanas.',
            creatorId: admin.id,
            status: 'PENDING'
          },
          {
            title: 'Programa Jovem Empreendedor',
            description: 'Criação de programa municipal de incentivo ao empreendedorismo jovem.',
            creatorId: admin.id,
            status: 'PENDING'
          }
        ];

        for (const matter of testMatters) {
          await prisma.matter.create({ data: matter });
          console.log(`      ✅ Criada: ${matter.title}`);
        }
      }
    }

    // 5. Testar API de votação
    console.log('\n4️⃣ Testando API de votação...');
    const testMatter = await prisma.matter.findFirst({
      where: { status: 'PENDING' }
    });
    
    if (testMatter) {
      console.log(`   🎯 Testando com matéria: ${testMatter.title}`);
      
      // Simular início de votação
      const updatedMatter = await prisma.matter.update({
        where: { id: testMatter.id },
        data: { status: 'VOTING' }
      });
      console.log(`   ✅ Votação iniciada: ${updatedMatter.status}`);
      
      // Verificar se existe votação ativa
      const activeVoting = await prisma.matter.findFirst({
        where: { status: 'VOTING' },
        include: { votes: true }
      });
      
      if (activeVoting) {
        console.log(`   🗳️ Votação ativa confirmada: ${activeVoting.title}`);
        console.log(`   📊 Votos atuais: ${activeVoting.votes.length}`);
        
        // Resetar para PENDING para testes futuros
        await prisma.matter.update({
          where: { id: activeVoting.id },
          data: { status: 'PENDING' }
        });
        console.log(`   🔄 Status resetado para PENDING`);
      }
    } else {
      console.log('   ❌ Nenhuma matéria disponível para teste');
    }

    // 6. Verificar documentos
    console.log('\n5️⃣ Verificando documentos...');
    const documents = await prisma.document.findMany({
      include: {
        votes: true,
        session: true
      }
    });
    console.log(`   📄 Encontrados ${documents.length} documentos:`);
    documents.forEach(d => {
      console.log(`      - ${d.title} (Aprovado: ${d.isApproved}) - Votos: ${d.votes.length}`);
    });

    // 7. Criar dados de teste se necessário
    if (currentSession && documents.length === 0) {
      console.log('\n🔧 Criando documentos de teste...');
      const admin = admins[0];
      
      const testDocuments = [
        {
          title: 'Ata da Sessão Anterior - 15/09/2024',
          type: 'ATA_ANTERIOR',
          sessionId: currentSession.id,
          creatorId: admin.id,
          isApproved: null
        },
        {
          title: 'Dispensa da Leitura da Ata',
          type: 'DISPENSA_ATA',
          sessionId: currentSession.id,
          creatorId: admin.id,
          isApproved: null
        }
      ];

      for (const doc of testDocuments) {
        await prisma.document.create({ data: doc });
        console.log(`      ✅ Criado: ${doc.title}`);
      }
    }

    console.log('\n✅ DEBUG concluído! O sistema está pronto para votação.');
    console.log('\n📝 INSTRUÇÕES PARA TESTE:');
    console.log('1. Faça login como administrador: admin@camara.gov.br / admin123');
    console.log('2. Vá para a aba "Ordem do Dia" no painel admin');
    console.log('3. Clique em "Iniciar Votação" em uma das matérias');
    console.log('4. Verifique o painel público em /painel');
    console.log('5. Use /votar para simular votos de vereadores');

  } catch (error) {
    console.error('❌ Erro no debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugVotingSystem();
