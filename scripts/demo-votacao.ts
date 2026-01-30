
import { prisma } from '../lib/db'
import dotenv from 'dotenv'

dotenv.config()

async function demonstrateVoting() {
  console.log('🗳️  Iniciando demonstração de votação...\n')

  try {
    // 1. Buscar sessão ativa
    const activeSession = await prisma.votingSession.findFirst({
      where: { status: { not: 'CLOSED' } },
      orderBy: { updatedAt: 'desc' }
    })

    if (!activeSession) {
      console.log('❌ Nenhuma sessão ativa encontrada.')
      return
    }

    console.log(`📋 Sessão ativa: ${activeSession.title || `Sessão ${activeSession.sessionNumber}`}`)

    // 2. Criar alguns documentos de exemplo se não existirem
    const existingDocs = await prisma.document.count({
      where: { sessionId: activeSession.id }
    })

    if (existingDocs === 0) {
      console.log('📄 Criando documentos de exemplo...')
      
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      })

      if (adminUser) {
        await prisma.document.createMany({
          data: [
            {
              sessionId: activeSession.id,
              title: 'Ata da Sessão Anterior',
              description: 'Aprovação da ata da sessão ordinária anterior',
              content: 'Conteúdo da ata da sessão anterior...',
              type: 'ATA_ANTERIOR',
              author: 'Mesa Diretora',
              createdBy: adminUser.id
            },
            {
              sessionId: activeSession.id,
              title: 'Projeto de Lei nº 001/2024',
              description: 'Dispõe sobre a criação de área de lazer no bairro Centro',
              content: 'Art. 1º Fica criada uma área de lazer...',
              type: 'PROJETO',
              author: 'Vereador João Silva',
              createdBy: adminUser.id
            },
            {
              sessionId: activeSession.id,
              title: 'Requerimento nº 005/2024',
              description: 'Solicita informações sobre obras na Rua Principal',
              content: 'Requer informações detalhadas...',
              type: 'REQUERIMENTO',
              author: 'Vereadora Maria Santos',
              createdBy: adminUser.id
            }
          ]
        })
        console.log('✅ Documentos criados com sucesso!')
      }
    }

    // 3. Criar algumas matérias se não existirem
    const existingMatters = await prisma.matter.count()

    if (existingMatters === 0) {
      console.log('📋 Criando matérias de exemplo...')
      
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      })

      if (adminUser) {
        await prisma.matter.createMany({
          data: [
            {
              title: 'Aprovação do Orçamento Municipal 2025',
              description: 'Discussão e votação da proposta orçamentária para o próximo ano',
              status: 'PENDING',
              orderIndex: 1,
              createdBy: adminUser.id
            },
            {
              title: 'Criação da Semana Municipal do Meio Ambiente',
              description: 'Projeto de lei que institui a Semana Municipal do Meio Ambiente',
              status: 'PENDING',
              orderIndex: 2,
              createdBy: adminUser.id
            },
            {
              title: 'Regulamentação do Transporte Público',
              description: 'Proposta de regulamentação para melhoria do transporte público municipal',
              status: 'PENDING',
              orderIndex: 3,
              createdBy: adminUser.id
            }
          ]
        })

        // Vincular matérias à sessão
        const matters = await prisma.matter.findMany({ take: 3 })
        await prisma.sessionMatter.createMany({
          data: matters.map((matter, index) => ({
            sessionId: activeSession.id,
            matterId: matter.id,
            orderIndex: index + 1
          }))
        })

        console.log('✅ Matérias criadas e vinculadas à sessão!')
      }
    }

    // 4. Mostrar documentos e matérias disponíveis
    const documents = await prisma.document.findMany({
      where: { sessionId: activeSession.id },
      orderBy: { orderIndex: 'asc' }
    })

    const matters = await prisma.matter.findMany({
      where: {
        sessions: {
          some: { sessionId: activeSession.id }
        }
      },
      orderBy: { orderIndex: 'asc' }
    })

    console.log('\n📄 DOCUMENTOS DISPONÍVEIS PARA VOTAÇÃO:')
    documents.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.title} (${doc.type})`)
      console.log(`      Autor: ${doc.author}`)
      console.log(`      Status: ${doc.isApproved === null ? 'Não votado' : doc.isApproved ? 'Aprovado' : 'Rejeitado'}`)
      console.log()
    })

    console.log('📋 MATÉRIAS DISPONÍVEIS PARA VOTAÇÃO:')
    matters.forEach((matter, index) => {
      console.log(`   ${index + 1}. ${matter.title}`)
      console.log(`      Descrição: ${matter.description}`)
      console.log(`      Status: ${matter.status}`)
      console.log()
    })

    console.log('🎯 COMO TESTAR A VOTAÇÃO:')
    console.log('1. Acesse o painel administrativo em: http://localhost:3000/admin')
    console.log('2. Faça login como administrador')
    console.log('3. Vá para a aba "PEQUENO EXPEDIENTE" ou "ORDEM DO DIA"')
    console.log('4. Clique em "Votar" em qualquer documento ou "Iniciar Votação" em qualquer matéria')
    console.log('5. Abra o painel público em: http://localhost:3000/painel')
    console.log('6. Você verá a votação ativa sendo exibida!')
    console.log()
    console.log('📱 O painel público agora mostra:')
    console.log('   • Tipo de votação (Documento ou Matéria)')
    console.log('   • Título e descrição do item sendo votado')
    console.log('   • Contagem de votos em tempo real')
    console.log('   • Progresso visual dos votos')
    console.log('   • Total de vereadores presentes')
    console.log()
    console.log('✅ Sistema de votação implementado e pronto para uso!')

  } catch (error) {
    console.error('❌ Erro durante a demonstração:', error)
  } finally {
    await prisma.$disconnect()
  }
}

demonstrateVoting()
