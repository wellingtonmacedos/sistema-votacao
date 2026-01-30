require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkAndSeedDatabase() {
  try {
    console.log('🔍 Verificando dados no banco...')
    
    // Verificar se há usuários
    const userCount = await prisma.user.count()
    console.log(`👥 Usuários encontrados: ${userCount}`)
    
    // Verificar se há sessões
    const sessionCount = await prisma.votingSession.count()
    console.log(`🏛️ Sessões encontradas: ${sessionCount}`)
    
    if (userCount === 0) {
      console.log('📝 Criando dados básicos...')
      
      // Criar administrador
      const admin = await prisma.user.create({
        data: {
          email: 'admin@camara.gov.br',
          password: await bcrypt.hash('admin123', 12),
          fullName: 'Administrador do Sistema',
          role: 'ADMIN'
        }
      })
      console.log('👨‍💼 Administrador criado')
      
      // Criar sessão de demonstração
      const session = await prisma.votingSession.create({
        data: {
          sessionNumber: '001/2025',
          date: new Date(),
          status: 'PEQUENO_EXPEDIENTE',
          title: 'Sessão Ordinária de Demonstração'
        }
      })
      console.log('🏛️ Sessão de demonstração criada')
      
      // Criar documento de exemplo
      const document = await prisma.document.create({
        data: {
          title: 'Ata da Sessão Anterior',
          type: 'ATA',
          content: `CÂMARA MUNICIPAL DE VEREADORES

ATA DA SESSÃO ORDINÁRIA Nº 020/2025

Aos vinte e cinco dias do mês de setembro do ano de dois mil e vinte e cinco, às quatorze horas, reuniram-se os vereadores desta Câmara Municipal em sessão ordinária.

PRESENTES: Todos os vereadores eleitos para a atual legislatura compareceram à presente sessão.

PAUTA:
1. Aprovação da Ata da Sessão Anterior
2. Discussão sobre o projeto de lei municipal
3. Votação do orçamento para o próximo exercício
4. Considerações finais

DELIBERAÇÕES:
- A ata da sessão anterior foi aprovada por unanimidade
- O projeto de lei municipal foi discutido e aprovado
- O orçamento foi aprovado com 12 votos favoráveis e 1 abstenção

ENCERRAMENTO:
Nada mais havendo a tratar, a sessão foi encerrada às dezessete horas.`,
          author: 'Secretaria da Câmara',
          sessionId: session.id,
          createdBy: admin.id,
          orderIndex: 1,
          isBeingRead: true
        }
      })
      console.log('📄 Documento de exemplo criado')
    }
    
    console.log('✅ Verificação concluída!')
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAndSeedDatabase()