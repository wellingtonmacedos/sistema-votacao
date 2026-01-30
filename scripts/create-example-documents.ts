import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  try {
    // Buscar a sessão ativa
    const session = await prisma.votingSession.findFirst({
      where: { status: { not: 'CLOSED' } },
      orderBy: { createdAt: 'desc' }
    })

    if (!session) {
      console.log('Nenhuma sessão ativa encontrada.')
      return
    }

    // Buscar um usuário admin/presidente para ser o autor
    const admin = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'PRESIDENT'] } }
    })

    if (!admin) {
      console.log('Nenhum admin encontrado.')
      return
    }

    console.log('Sessão ativa:', session.sessionNumber)
    console.log('Admin:', admin.fullName)

    // Criar documentos de exemplo
    const docs = [
      {
        title: 'Ata da Sessão Anterior - 15/09/2024',
        type: 'ATA_ANTERIOR' as const,
        author: admin.fullName,
        content: 'Conteúdo da ata da sessão anterior realizada em 15 de setembro de 2024.\n\nForam aprovados os projetos de lei 001/2024 e 002/2024.\n\nPresentes: Todos os vereadores.\n\nAusentes: Nenhum.',
        createdBy: admin.id,
        sessionId: session.id
      },
      {
        title: 'Dispensa da Leitura da Ata',
        type: 'DISPENSA_ATA' as const,
        author: admin.fullName,
        content: 'Requerimento de dispensa da leitura da ata da sessão anterior.\n\nConsiderando que a ata foi disponibilizada previamente a todos os vereadores, solicita-se a dispensa de sua leitura.',
        createdBy: admin.id,
        sessionId: session.id
      },
      {
        title: 'Requerimento 001/2024 - Obras Públicas',
        type: 'REQUERIMENTO' as const,
        author: admin.fullName,
        content: 'Requerimento solicitando informações sobre o andamento das obras públicas no bairro Centro.\n\nSenhor Presidente,\n\nVenho por meio deste requerer ao Poder Executivo informações detalhadas sobre as obras em andamento.',
        createdBy: admin.id,
        sessionId: session.id
      },
      {
        title: 'Projeto de Lei 005/2024 - Horários',
        type: 'PROJETO' as const,
        author: admin.fullName,
        content: 'Projeto de Lei que altera os horários de funcionamento do comércio local.\n\nArtigo 1º - Fica autorizado o funcionamento do comércio local até às 22 horas nos dias úteis.\n\nArtigo 2º - Esta lei entra em vigor na data de sua publicação.',
        createdBy: admin.id,
        sessionId: session.id
      }
    ]

    for (const doc of docs) {
      const existing = await prisma.document.findFirst({
        where: { title: doc.title, sessionId: session.id }
      })

      if (!existing) {
        const created = await prisma.document.create({ data: doc })
        console.log('✅ Documento criado:', created.title, '(ID:', created.id + ')')
      } else {
        console.log('⚠️  Documento já existe:', doc.title, '(ID:', existing.id + ')')
      }
    }

    console.log('\n✅ Processo concluído!')
  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
