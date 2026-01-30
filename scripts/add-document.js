require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addDocument() {
  try {
    console.log('🔍 Adicionando documento de exemplo...')
    
    // Buscar a sessão ativa
    const session = await prisma.votingSession.findFirst({
      where: {
        status: { not: 'CLOSED' }
      }
    })
    
    if (!session) {
      console.log('❌ Nenhuma sessão ativa encontrada')
      return
    }
    
    // Buscar admin
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    
    if (!admin) {
      console.log('❌ Admin não encontrado')
      return
    }
    
    // Criar documento sendo lido
    const document = await prisma.document.create({
      data: {
        title: 'Ata da Sessão Anterior - Aprovação',
        type: 'ATA_ANTERIOR',
        content: `CÂMARA MUNICIPAL DE VEREADORES

ATA DA SESSÃO ORDINÁRIA Nº 019/2025

Aos dezoito dias do mês de setembro do ano de dois mil e vinte e cinco, às quatorze horas, reuniram-se os vereadores desta Câmara Municipal em sessão ordinária, sob a presidência do Sr. João Silva.

PRESENTES: Todos os vereadores eleitos para a atual legislatura compareceram à presente sessão, totalizando 13 membros presentes.

PAUTA DO DIA:
1. Aprovação da Ata da Sessão Anterior
2. Leitura de Correspondências
3. Discussão do Projeto de Lei nº 025/2025 - Regulamentação do transporte escolar
4. Votação do Orçamento Municipal para o exercício de 2026
5. Requerimentos dos Vereadores
6. Considerações Finais

DELIBERAÇÕES E VOTAÇÕES:

1. APROVAÇÃO DA ATA: A ata da sessão anterior foi lida pelo Secretário e aprovada por unanimidade dos vereadores presentes.

2. CORRESPONDÊNCIAS: Foram lidas as correspondências recebidas durante a semana, incluindo ofícios da Prefeitura Municipal e solicitações da população.

3. PROJETO DE LEI Nº 025/2025: O projeto que regulamenta o transporte escolar municipal foi amplamente debatido. Os vereadores Maria Santos e Carlos Oliveira fizeram importantes considerações sobre a segurança dos veículos. Após os debates, o projeto foi aprovado com 11 votos favoráveis e 2 abstenções.

4. ORÇAMENTO MUNICIPAL: O projeto de orçamento para 2026 foi apresentado pela Comissão de Finanças. Após esclarecimentos sobre as principais rubricas, foi aprovado por 12 votos favoráveis e 1 voto contrário.

5. REQUERIMENTOS: Foram aprovados os seguintes requerimentos:
   - Requerimento nº 045/2025: Solicitação de melhorias na iluminação pública do Bairro Centro
   - Requerimento nº 046/2025: Pedido de informações sobre o cronograma de obras da Praça Municipal

CONSIDERAÇÕES FINAIS:
Durante as considerações finais, os vereadores fizeram importantes observações sobre questões municipais e agradeceram a presença da população.

ENCERRAMENTO:
Nada mais havendo a tratar, a sessão foi encerrada às dezessete horas e trinta minutos.

Esta ata foi lavrada por mim, Secretário da Câmara, e será submetida à aprovação na próxima sessão ordinária.

___________________________________
Secretaria da Câmara Municipal`,
        author: 'Secretaria da Câmara Municipal',
        sessionId: session.id,
        createdBy: admin.id,
        orderIndex: 1,
        isBeingRead: true
      }
    })
    
    console.log(`✅ Documento "${document.title}" criado e marcado como sendo lido`)
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addDocument()