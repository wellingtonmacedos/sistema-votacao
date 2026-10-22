
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ O seed não pode ser executado em ambiente de produção.')
    console.error('   Esta operação apaga todos os dados do banco de dados.')
    process.exit(1)
  }

  console.log('🌱 Iniciando seed do banco de dados...')

  // Limpar dados existentes (cuidado em produção!)
  try {
    await prisma.legislativeProcess.deleteMany()
    await prisma.documentType.deleteMany()
    await prisma.documentVote.deleteMany()
    await prisma.vote.deleteMany()
    await prisma.speechRequest.deleteMany()
    await prisma.sessionPhase.deleteMany()
    await prisma.document.deleteMany()
    await prisma.attendance.deleteMany()
    await prisma.sessionMatter.deleteMany()
    await prisma.matter.deleteMany()
    await prisma.votingSession.deleteMany()
    await prisma.user.deleteMany()
    console.log('🗑️ Dados existentes removidos')
  } catch (error) {
    console.log('ℹ️ Banco limpo (primeira execução)')
  }

  // Hash para as senhas
  const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, 12)
  }

  // 1. Criar Administrador
  const admin = await prisma.user.create({
    data: {
      email: 'admin@camara.gov.br',
      password: await hashPassword('admin123'),
      fullName: 'Administrador do Sistema',
      role: 'ADMIN'
    }
  })
  console.log('👨‍💼 Administrador criado')

  // 2. Criar Presidente da Câmara
  const president = await prisma.user.create({
    data: {
      email: 'presidente@camara.gov.br',
      password: await hashPassword('presidente123'),
      fullName: 'Carlos Eduardo da Silva',
      role: 'PRESIDENT'
    }
  })
  console.log('🏛️ Presidente criado')

  // 3. Criar 13 Vereadores fictícios
  const vereadores = [
    {
      email: 'maria.santos@camara.gov.br',
      fullName: 'Maria dos Santos Oliveira',
      password: 'vereador123'
    },
    {
      email: 'joao.silva@camara.gov.br',
      fullName: 'João Carlos Silva',
      password: 'vereador123'
    },
    {
      email: 'ana.costa@camara.gov.br',
      fullName: 'Ana Paula Costa',
      password: 'vereador123'
    },
    {
      email: 'pedro.almeida@camara.gov.br',
      fullName: 'Pedro Almeida Ferreira',
      password: 'vereador123'
    },
    {
      email: 'luciana.rodrigues@camara.gov.br',
      fullName: 'Luciana Rodrigues Mendes',
      password: 'vereador123'
    },
    {
      email: 'marcos.pereira@camara.gov.br',
      fullName: 'Marcos Pereira dos Santos',
      password: 'vereador123'
    },
    {
      email: 'fernanda.lima@camara.gov.br',
      fullName: 'Fernanda Lima Barbosa',
      password: 'vereador123'
    },
    {
      email: 'roberto.souza@camara.gov.br',
      fullName: 'Roberto Souza Martins',
      password: 'vereador123'
    },
    {
      email: 'patricia.moura@camara.gov.br',
      fullName: 'Patrícia Moura Gonçalves',
      password: 'vereador123'
    },
    {
      email: 'ricardo.nobrega@camara.gov.br',
      fullName: 'Ricardo Nóbrega Araújo',
      password: 'vereador123'
    },
    {
      email: 'claudia.torres@camara.gov.br',
      fullName: 'Cláudia Torres Campos',
      password: 'vereador123'
    },
    {
      email: 'antonio.ramos@camara.gov.br',
      fullName: 'Antônio Ramos da Costa',
      password: 'vereador123'
    },
    {
      email: 'simone.cardoso@camara.gov.br',
      fullName: 'Simone Cardoso Ribeiro',
      password: 'vereador123'
    }
  ]

  // Criar todos os vereadores
  const createdCouncilors = []
  for (const vereador of vereadores) {
    const createdCouncilor = await prisma.user.create({
      data: {
        email: vereador.email,
        password: await hashPassword(vereador.password),
        fullName: vereador.fullName,
        role: 'COUNCILOR'
      }
    })
    createdCouncilors.push(createdCouncilor)
  }
  console.log(`👥 ${createdCouncilors.length} Vereadores criados`)

  // 4. Criar conta de teste especial (conforme diretrizes)
  const testUser = await prisma.user.create({
    data: {
      email: 'john@doe.com',
      password: await hashPassword('johndoe123'),
      fullName: 'John Doe - Teste Admin',
      role: 'ADMIN'
    }
  })
  console.log('🔧 Conta de teste criada')

  // 5. Criar tipos padrão de documentos por fase
  await prisma.documentType.createMany({
    data: [
      { label: 'Ata Anterior', value: 'ATA_ANTERIOR', orderIndex: 0, isActive: true },
      { label: 'Dispensa de Ata', value: 'DISPENSA_ATA', orderIndex: 1, isActive: true },
      { label: 'Comunicado', value: 'COMUNICADO', orderIndex: 2, isActive: true },
      { label: 'Ofício', value: 'OFICIO', orderIndex: 3, isActive: true },
      { label: 'Requerimento', value: 'REQUERIMENTO', orderIndex: 4, isActive: true },
      { label: 'Projeto', value: 'PROJETO', orderIndex: 5, isActive: true },
      { label: 'Indicação', value: 'INDICACAO', orderIndex: 6, isActive: true },
      { label: 'Moção', value: 'MOCAO', orderIndex: 7, isActive: true }
    ]
  })
  console.log('🗂️ Tipos de documento padrão criados')

  // 6. Criar fases padrão da sessão
  await prisma.phase.createMany({
    data: [
      { name: 'Pequeno Expediente', orderIndex: 0, color: '#eab308', isActive: true, isDefault: true, hasVoting: false },
      { name: 'Grande Expediente', orderIndex: 1, color: '#f97316', isActive: true, isDefault: true, hasVoting: false },
      { name: 'Ordem do Dia', orderIndex: 2, color: '#8b5cf6', isActive: true, isDefault: true, hasVoting: true },
      { name: 'Considerações Finais', orderIndex: 3, color: '#6366f1', isActive: true, isDefault: true, hasVoting: false },
      { name: 'Tribuna Livre', orderIndex: 4, color: '#ec4899', isActive: true, isDefault: true, hasVoting: false },
      { name: 'Encerrada', orderIndex: 5, color: '#6b7280', isActive: true, isDefault: true, hasVoting: false }
    ]
  })
  console.log('🧭 Fases padrão criadas')

  // 7. Criar uma sessão de exemplo (agendada para demonstração)
  const exampleSession = await prisma.votingSession.create({
    data: {
      title: 'Sessão Ordinária de Demonstração',
      description: 'Primeira sessão do sistema de votação eletrônica',
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Amanhã
      quorum: 7, // Maioria simples para 13 vereadores
      sessionNumber: '001/2024',
      date: new Date(),
      createdBy: president.id
    }
  })
  console.log('📅 Sessão de exemplo criada')

  // 8. Criar pautas de exemplo
  const exampleMatters = [
    {
      title: 'Aprovação do Orçamento Municipal 2024',
      description: 'Discussão e votação da proposta orçamentária para o próximo exercício fiscal',
    },
    {
      title: 'Lei do Plano Diretor - Alterações',
      description: 'Proposta de alteração de alguns artigos do Plano Diretor Municipal',
    },
    {
      title: 'Criação do Programa Jovem Empreendedor',
      description: 'Projeto de lei que institui programa de incentivo ao empreendedorismo jovem',
    }
  ]

  const createdMatters = []
  for (const [index, matter] of exampleMatters.entries()) {
    const createdMatter = await prisma.matter.create({
      data: {
        title: matter.title,
        description: matter.description,
        status: 'PENDING',
        orderIndex: index + 1,
        createdBy: president.id
      }
    })
    createdMatters.push(createdMatter)

    // Vincular pauta à sessão
    await prisma.sessionMatter.create({
      data: {
        sessionId: exampleSession.id,
        matterId: createdMatter.id,
        orderIndex: index + 1
      }
    })
  }
  console.log(`📋 ${createdMatters.length} Pautas de exemplo criadas`)

  // 9. Criar documentos de exemplo para diferentes fases da sessão
  const exampleDocuments = [
    {
      title: 'Ata da Sessão Anterior - 15/09/2024',
      description: 'Aprovação da ata da sessão ordinária do dia 15 de setembro de 2024',
      type: 'ATA_ANTERIOR',
      content: `ATA DA SESSÃO ORDINÁRIA N° 012/2024

Aos quinze dias do mês de setembro do ano de dois mil e vinte e quatro, às nove horas, reuniram-se os Vereadores da Câmara Municipal em sessão ordinária, sob a presidência do Excelentíssimo Senhor Presidente.

PRESENTES: Os Vereadores Maria dos Santos, João Carlos Silva, Pedro Oliveira, Ana Paula Costa, Roberto Ferreira, Carlos Eduardo Santos, Luciana Pereira, José Antonio Lima, Teresa Cristina Souza, Fernando Augusto Rocha, Márcia Regina Alves, Antônio Carlos Neves e Paulo Henrique Torres.

AUSENTES: Nenhum vereador ausente foi registrado.

PAUTA:
1. Aprovação da Ata da Sessão Anterior
2. Discussão sobre o Projeto de Lei n° 145/2024
3. Requerimento para pavimentação das ruas do Bairro Central
4. Outros assuntos de interesse público

A sessão foi presidida pelo Excelentíssimo Presidente da Câmara, que após verificar a presença do quórum regimental, declarou aberta a sessão.

No Grande Expediente foram apresentados três requerimentos de autoria dos Vereadores, tratando de questões relacionadas à melhoria da infraestrutura urbana e serviços públicos municipais.

Durante a Ordem do Dia foram votadas e aprovadas por unanimidade as seguintes matérias:
- Projeto de Lei n° 145/2024 que dispõe sobre horários de funcionamento do comércio
- Moção de congratulações pelos 50 anos da Escola Municipal João da Silva

Nada mais havendo a tratar, o Excelentíssimo Presidente declarou encerrada a sessão às onze horas e quinze minutos.

Para constar, eu, Secretário da Câmara, lavrei a presente ata que vai assinada por mim e pelo Excelentíssimo Presidente.`,
      author: 'Secretário da Câmara'
    },
    {
      title: 'Dispensa da Leitura da Ata',
      description: 'Solicitação de dispensa da leitura integral da ata anterior',
      type: 'DISPENSA_ATA',
      content: `REQUERIMENTO DE DISPENSA DE LEITURA

Excelentíssimo Senhor Presidente,
Nobres Vereadores,

Tendo em vista que a Ata da Sessão Anterior foi previamente distribuída a todos os Senhores Vereadores com antecedência mínima de 24 horas, conforme determina o Regimento Interno desta Casa Legislativa, e considerando que todos os membros tiveram oportunidade de examinar detidamente o seu conteúdo,

REQUEIRO a dispensa da leitura integral da referida ata, passando-se diretamente à sua discussão e votação, caso haja alguma observação ou retificação a ser apresentada.

Esta medida objetiva agilizar os trabalhos da presente sessão, permitindo maior tempo para a discussão das matérias constantes da Ordem do Dia.

Respeitosamente,
Mesa Diretora`,
      author: 'Mesa Diretora'
    },
    {
      title: 'Requerimento 001/2024 - Informações sobre Obras Públicas',
      description: 'Requerimento solicitando informações sobre o andamento das obras de pavimentação',
      type: 'REQUERIMENTO',
      content: `REQUERIMENTO N° 001/2024

Excelentíssimo Senhor Presidente,
Nobres Pares,

O Vereador que este subscreve, no uso de suas atribuições regimentais, vem perante esta Casa Legislativa apresentar o seguinte REQUERIMENTO:

CONSIDERANDO que o sistema viário de nossa cidade apresenta diversas deficiências que comprometem a mobilidade urbana e a qualidade de vida dos munícipes;

CONSIDERANDO que várias ruas e avenidas encontram-se em estado precário de conservação, oferecendo riscos à segurança dos usuários;

CONSIDERANDO a necessidade de implementar melhorias na sinalização de trânsito e na iluminação pública;

REQUER que seja oficiado ao Excelentíssimo Senhor Prefeito Municipal solicitando:

1) Elaboração de um cronograma emergencial de recuperação das vias públicas em pior estado de conservação;

2) Implementação de programa permanente de manutenção preventiva do sistema viário municipal;

3) Melhoria da sinalização de trânsito, especialmente nas proximidades de escolas e centros de saúde;

4) Ampliação e modernização do sistema de iluminação pública, priorizando áreas de maior vulnerabilidade social;

5) Criação de relatório mensal sobre as ações implementadas para conhecimento desta Casa Legislativa.

Respeitosamente,
Vereador José Silva`,
      author: 'Vereador José Silva'
    },
    {
      title: 'Projeto de Lei 005/2024 - Horários de Funcionamento',
      description: 'Projeto de lei que altera horários de funcionamento do comércio local',
      type: 'PROJETO',
      content: `PROJETO DE LEI N° 005/2024

Altera os horários de funcionamento do comércio local e dá outras providências.

Art. 1° Fica alterado o horário de funcionamento dos estabelecimentos comerciais no município, que poderão funcionar:

I - De segunda a sexta-feira: das 8h às 22h;
II - Aos sábados: das 8h às 18h;
III - Aos domingos e feriados: das 14h às 20h (facultativo).

Art. 2° Ficam excetuados do disposto no artigo anterior:

I - Farmácias e drogarias;
II - Postos de combustível;
III - Restaurantes, lanchonetes e similares;
IV - Estabelecimentos de turismo e hotelaria;
V - Supermercados e hipermercados.

Art. 3° O descumprimento desta Lei sujeitará o infrator às penalidades previstas no Código de Posturas Municipal.

Art. 4° Esta Lei entra em vigor na data de sua publicação.

JUSTIFICAÇÃO

O presente projeto visa adequar os horários comerciais às necessidades da população, permitindo maior flexibilidade aos consumidores e oportunidades de crescimento aos empresários locais.`,
      author: 'Vereadora Maria dos Santos'
    }
  ]

  const createdDocuments = []
  for (const [index, doc] of exampleDocuments.entries()) {
    const createdDoc = await prisma.document.create({
      data: {
        title: doc.title,
        description: doc.description,
        content: doc.content,
        author: doc.author,
        type: doc.type as any,
        orderIndex: index + 1,
        sessionId: exampleSession.id,
        createdBy: admin.id
      }
    })
    createdDocuments.push(createdDoc)
  }
  console.log(`📄 ${createdDocuments.length} Documentos de exemplo criados`)

  // 8. Criar solicitações de fala de exemplo
  const speechRequests = [
    {
      type: 'CONSIDERACOES_FINAIS',
      subject: 'Questões sobre transporte público municipal',
      userId: createdCouncilors[0].id // Maria dos Santos
    },
    {
      type: 'CONSIDERACOES_FINAIS', 
      subject: 'Proposta para melhoria da iluminação pública',
      userId: createdCouncilors[1].id // João Carlos
    },
    {
      type: 'TRIBUNA_LIVE',
      subject: 'Reivindicações dos moradores do Bairro Centro',
      citizenName: 'José da Silva Pereira',
      citizenProfession: 'Comerciante'
    },
    {
      type: 'TRIBUNA_LIVE',
      subject: 'Apresentação do projeto comunitário de reciclagem',
      citizenName: 'Ana Maria Ferreira',
      citizenProfession: 'Professora'
    }
  ]

  const createdSpeechRequests = []
  for (const [index, speech] of speechRequests.entries()) {
    const createdSpeech = await prisma.speechRequest.create({
      data: {
        sessionId: exampleSession.id,
        type: speech.type as any,
        subject: speech.subject,
        userId: speech.userId || null,
        citizenName: speech.citizenName || null,
        citizenProfession: speech.citizenProfession || null,
        orderIndex: index + 1,
        isApproved: false
      }
    })
    createdSpeechRequests.push(createdSpeech)
  }
  console.log(`🎤 ${createdSpeechRequests.length} Solicitações de fala criadas`)

  // 9. Criar processos legislativos de exemplo
  const legislativeProcesses = [
    {
      userId: createdCouncilors[0].id, // Maria dos Santos
      speechRequestId: createdSpeechRequests[0].id, // Vincula à primeira solicitação
      number: '001/2024',
      title: 'Projeto de Lei - Sistema de Transporte Público Municipal',
      description: 'Dispõe sobre a criação de novas linhas de ônibus e melhoria do transporte coletivo municipal, com foco na sustentabilidade e acessibilidade.',
      type: 'PROJETO_LEI',
      status: 'EM_TRAMITACAO'
    },
    {
      userId: createdCouncilors[0].id, // Maria dos Santos
      number: '002/2024',
      title: 'Requerimento - Informações sobre Orçamento de Transporte',
      description: 'Solicita informações detalhadas sobre o orçamento destinado ao transporte público municipal e os investimentos previstos para 2024.',
      type: 'REQUERIMENTO',
      status: 'EM_TRAMITACAO'
    },
    {
      userId: createdCouncilors[1].id, // João Carlos
      speechRequestId: createdSpeechRequests[1].id, // Vincula à segunda solicitação
      number: '003/2024',
      title: 'Indicação - Programa de Iluminação LED',
      description: 'Indica ao Poder Executivo a implementação de programa de substituição da iluminação pública por tecnologia LED, visando economia energética.',
      type: 'INDICACAO',
      status: 'EM_TRAMITACAO'
    },
    {
      userId: createdCouncilors[1].id, // João Carlos
      number: '004/2024',
      title: 'Moção de Apoio - Energia Solar em Prédios Públicos',
      description: 'Moção de apoio à implementação de sistemas de energia solar fotovoltaica em prédios públicos municipais.',
      type: 'MOCAO',
      status: 'APROVADO'
    },
    {
      userId: createdCouncilors[2].id, // Pedro Oliveira
      number: '005/2024',
      title: 'Projeto de Lei - Programa Jovem Empreendedor',
      description: 'Institui o Programa Municipal Jovem Empreendedor, oferecendo capacitação e microcrédito para jovens de 18 a 29 anos.',
      type: 'PROJETO_LEI',
      status: 'EM_TRAMITACAO'
    },
    {
      userId: createdCouncilors[3].id, // Ana Clara
      number: '006/2024',
      title: 'Requerimento - Centro de Atendimento à Mulher',
      description: 'Requer informações sobre a criação de Centro Especializado de Atendimento à Mulher em situação de violência doméstica.',
      type: 'REQUERIMENTO',
      status: 'EM_TRAMITACAO'
    }
  ]

  const createdProcesses = []
  for (const process of legislativeProcesses) {
    const createdProcess = await prisma.legislativeProcess.create({
      data: process
    })
    createdProcesses.push(createdProcess)
  }
  console.log(`📋 ${createdProcesses.length} Processos legislativos criados`)

  // 10. Criar histórico de fases da sessão
  await prisma.sessionPhase.create({
    data: {
      sessionId: exampleSession.id,
      phase: 'SCHEDULED',
      startedAt: exampleSession.createdAt
    }
  })
  console.log('📝 Histórico de fases iniciado')

  console.log('✅ Seed concluído com sucesso!')
  console.log('\n📊 Resumo dos dados criados:')
  console.log(`- 1 Administrador: admin@camara.gov.br (senha: admin123)`)
  console.log(`- 1 Presidente: presidente@camara.gov.br (senha: presidente123)`)
  console.log(`- 13 Vereadores: [email]@camara.gov.br (senha: vereador123)`)
  console.log(`- 1 Conta Teste: john@doe.com (senha: johndoe123)`)
  console.log(`- 1 Sessão de demonstração com todas as fases`)
  console.log(`- 3 Pautas para votação`)
  console.log(`- 4 Documentos para expedientes (ata, requerimentos, projetos)`)
  console.log(`- 4 Solicitações de fala (vereadores e cidadãos)`)
  console.log(`- 6 Processos legislativos dos vereadores`)
  console.log(`- Histórico de fases da sessão`)
  console.log('\n🏛️ Funcionalidades disponíveis:')
  console.log(`- Pequeno Expediente (ata anterior, dispensas)`)
  console.log(`- Grande Expediente (requerimentos, projetos)`)
  console.log(`- Ordem do Dia (votação das pautas)`)
  console.log(`- Considerações Finais (vereadores)`)
  console.log(`- Tribuna Live (cidadãos)`)
  console.log('\n🔗 Acesse: http://localhost:3000')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
