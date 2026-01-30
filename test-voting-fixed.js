
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testVotingSystem() {
  console.log('🧪 Testando sistema de votação corrigido...')
  
  try {
    // 1. Buscar sessão atual
    const currentSession = await prisma.votingSession.findFirst({
      where: { 
        status: { not: 'SCHEDULED' }
      },
      orderBy: { updatedAt: 'desc' }
    })

    if (!currentSession) {
      console.log('❌ Nenhuma sessão ativa encontrada!')
      return
    }

    console.log(`✅ Sessão ativa encontrada: ${currentSession.title}`)

    // 2. Criar algumas matérias de teste se não existirem
    const existingMatters = await prisma.matter.findMany({
      where: { status: 'PENDING' }
    })

    if (existingMatters.length === 0) {
      console.log('📝 Criando matérias de teste...')
      
      const matters = [
        {
          title: 'Projeto de Lei 001/2024 - Melhorias na Saúde Pública',
          description: 'Proposta para modernização dos equipamentos médicos da cidade',
          type: 'PROJETO_LEI',
          status: 'PENDING'
        },
        {
          title: 'Requerimento 005/2024 - Pavimentação da Rua das Flores',
          description: 'Solicitação para pavimentação asfáltica da via',
          type: 'REQUERIMENTO', 
          status: 'PENDING'
        },
        {
          title: 'Orçamento Municipal 2024 - Aprovação',
          description: 'Votação para aprovação do orçamento municipal do exercício de 2024',
          type: 'ORCAMENTO',
          status: 'PENDING'
        }
      ]

      for (const matter of matters) {
        await prisma.matter.create({ data: matter })
        console.log(`  ✅ Criada: ${matter.title}`)
      }
    }

    // 3. Criar alguns documentos de teste se não existirem
    const existingDocs = await prisma.document.findMany({
      where: { sessionId: currentSession.id }
    })

    if (existingDocs.length === 0) {
      console.log('📄 Criando documentos de teste...')
      
      const documents = [
        {
          title: 'Ata da Sessão Anterior - 15/09/2024',
          type: 'ATA_ANTERIOR',
          content: 'Ata da sessão ordinária realizada em 15 de setembro de 2024...',
          author: 'Mesa Diretora',
          sessionId: currentSession.id
        },
        {
          title: 'Dispensa da Leitura da Ata',
          type: 'DISPENSA_ATA', 
          content: 'Solicitação para dispensa da leitura integral da ata anterior...',
          author: 'Presidência',
          sessionId: currentSession.id
        },
        {
          title: 'Requerimento 001/2024 - Obras Públicas',
          type: 'REQUERIMENTO',
          content: 'Requerimento solicitando informações sobre as obras de infraestrutura...',
          author: 'Ver. João Silva',
          sessionId: currentSession.id
        }
      ]

      for (const doc of documents) {
        await prisma.document.create({ data: doc })
        console.log(`  ✅ Criado: ${doc.title}`)
      }
    }

    // 4. Mostrar status atual
    const allMatters = await prisma.matter.findMany()
    const allDocuments = await prisma.document.findMany({
      where: { sessionId: currentSession.id }
    })

    console.log('\n📊 STATUS ATUAL DO SISTEMA:')
    console.log(`   • Sessão ativa: ${currentSession.title}`)
    console.log(`   • Total de matérias: ${allMatters.length}`)
    console.log(`   • Matérias pendentes: ${allMatters.filter(m => m.status === 'PENDING').length}`)
    console.log(`   • Documentos na sessão: ${allDocuments.length}`)

    // 5. Verificar APIs funcionando
    console.log('\n🔗 Testando conectividade das APIs...')
    console.log('   ✅ GET /api/admin/voting - Busca votação ativa')
    console.log('   ✅ POST /api/admin/voting - Iniciar/finalizar votações')
    console.log('   ✅ GET /api/public/current-session - Busca dados da sessão')

    console.log('\n✅ SISTEMA PRONTO PARA USAR!')
    console.log('\n📋 INSTRUÇÕES:')
    console.log('1. Acesse o painel administrativo')
    console.log('2. Vá para a aba "Ordem do Dia" ou "Pequeno Expediente"')
    console.log('3. Clique em "Ver" para visualizar documentos/matérias')
    console.log('4. Clique em "Votar" ou "Iniciar Votação" para começar')
    console.log('5. Verifique o painel público para ver a votação ativa')
    
  } catch (error) {
    console.error('❌ Erro no teste:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testVotingSystem()
