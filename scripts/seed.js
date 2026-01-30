"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = require("bcryptjs");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1, hashPassword, admin, _a, _b, president, _c, _d, vereadores, createdCouncilors, _i, vereadores_1, vereador, createdCouncilor, _e, _f, testUser, _g, _h, exampleSession, exampleMatters, createdMatters, _j, _k, _l, index, matter, createdMatter, exampleDocuments, createdDocuments, _m, _o, _p, index, doc, createdDoc, speechRequests, createdSpeechRequests, _q, _r, _s, index, speech, createdSpeech, legislativeProcesses, createdProcesses, _t, legislativeProcesses_1, process_1, createdProcess;
        var _u, _v, _w, _x, _y, _z, _0, _1;
        var _this = this;
        return __generator(this, function (_2) {
            switch (_2.label) {
                case 0:
                    console.log('🌱 Iniciando seed do banco de dados...');
                    _2.label = 1;
                case 1:
                    _2.trys.push([1, 13, , 14]);
                    return [4 /*yield*/, prisma.legislativeProcess.deleteMany()];
                case 2:
                    _2.sent();
                    return [4 /*yield*/, prisma.documentVote.deleteMany()];
                case 3:
                    _2.sent();
                    return [4 /*yield*/, prisma.vote.deleteMany()];
                case 4:
                    _2.sent();
                    return [4 /*yield*/, prisma.speechRequest.deleteMany()];
                case 5:
                    _2.sent();
                    return [4 /*yield*/, prisma.sessionPhase.deleteMany()];
                case 6:
                    _2.sent();
                    return [4 /*yield*/, prisma.document.deleteMany()];
                case 7:
                    _2.sent();
                    return [4 /*yield*/, prisma.attendance.deleteMany()];
                case 8:
                    _2.sent();
                    return [4 /*yield*/, prisma.sessionMatter.deleteMany()];
                case 9:
                    _2.sent();
                    return [4 /*yield*/, prisma.matter.deleteMany()];
                case 10:
                    _2.sent();
                    return [4 /*yield*/, prisma.votingSession.deleteMany()];
                case 11:
                    _2.sent();
                    return [4 /*yield*/, prisma.user.deleteMany()];
                case 12:
                    _2.sent();
                    console.log('🗑️ Dados existentes removidos');
                    return [3 /*break*/, 14];
                case 13:
                    error_1 = _2.sent();
                    console.log('ℹ️ Banco limpo (primeira execução)');
                    return [3 /*break*/, 14];
                case 14:
                    hashPassword = function (password) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, bcryptjs_1.default.hash(password, 12)];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        });
                    }); };
                    _b = (_a = prisma.user).create;
                    _u = {};
                    _v = {
                        email: 'admin@camara.gov.br'
                    };
                    return [4 /*yield*/, hashPassword('admin123')];
                case 15: return [4 /*yield*/, _b.apply(_a, [(_u.data = (_v.password = _2.sent(),
                            _v.fullName = 'Administrador do Sistema',
                            _v.role = 'ADMIN',
                            _v),
                            _u)])];
                case 16:
                    admin = _2.sent();
                    console.log('👨‍💼 Administrador criado');
                    _d = (_c = prisma.user).create;
                    _w = {};
                    _x = {
                        email: 'presidente@camara.gov.br'
                    };
                    return [4 /*yield*/, hashPassword('presidente123')];
                case 17: return [4 /*yield*/, _d.apply(_c, [(_w.data = (_x.password = _2.sent(),
                            _x.fullName = 'Carlos Eduardo da Silva',
                            _x.role = 'PRESIDENT',
                            _x),
                            _w)])];
                case 18:
                    president = _2.sent();
                    console.log('🏛️ Presidente criado');
                    vereadores = [
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
                    ];
                    createdCouncilors = [];
                    _i = 0, vereadores_1 = vereadores;
                    _2.label = 19;
                case 19:
                    if (!(_i < vereadores_1.length)) return [3 /*break*/, 23];
                    vereador = vereadores_1[_i];
                    _f = (_e = prisma.user).create;
                    _y = {};
                    _z = {
                        email: vereador.email
                    };
                    return [4 /*yield*/, hashPassword(vereador.password)];
                case 20: return [4 /*yield*/, _f.apply(_e, [(_y.data = (_z.password = _2.sent(),
                            _z.fullName = vereador.fullName,
                            _z.role = 'COUNCILOR',
                            _z),
                            _y)])];
                case 21:
                    createdCouncilor = _2.sent();
                    createdCouncilors.push(createdCouncilor);
                    _2.label = 22;
                case 22:
                    _i++;
                    return [3 /*break*/, 19];
                case 23:
                    console.log("\uD83D\uDC65 ".concat(createdCouncilors.length, " Vereadores criados"));
                    _h = (_g = prisma.user).create;
                    _0 = {};
                    _1 = {
                        email: 'john@doe.com'
                    };
                    return [4 /*yield*/, hashPassword('johndoe123')];
                case 24: return [4 /*yield*/, _h.apply(_g, [(_0.data = (_1.password = _2.sent(),
                            _1.fullName = 'John Doe - Teste Admin',
                            _1.role = 'ADMIN',
                            _1),
                            _0)])];
                case 25:
                    testUser = _2.sent();
                    console.log('🔧 Conta de teste criada');
                    return [4 /*yield*/, prisma.votingSession.create({
                            data: {
                                title: 'Sessão Ordinária de Demonstração',
                                description: 'Primeira sessão do sistema de votação eletrônica',
                                status: 'SCHEDULED',
                                scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                                quorum: 7,
                                sessionNumber: '001/2024',
                                date: new Date(),
                                createdBy: president.id
                            }
                        })];
                case 26:
                    exampleSession = _2.sent();
                    console.log('📅 Sessão de exemplo criada');
                    exampleMatters = [
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
                    ];
                    createdMatters = [];
                    _j = 0, _k = exampleMatters.entries();
                    _2.label = 27;
                case 27:
                    if (!(_j < _k.length)) return [3 /*break*/, 31];
                    _l = _k[_j], index = _l[0], matter = _l[1];
                    return [4 /*yield*/, prisma.matter.create({
                            data: {
                                title: matter.title,
                                description: matter.description,
                                status: 'PENDING',
                                orderIndex: index + 1,
                                createdBy: president.id
                            }
                        })];
                case 28:
                    createdMatter = _2.sent();
                    createdMatters.push(createdMatter);
                    // Vincular pauta à sessão
                    return [4 /*yield*/, prisma.sessionMatter.create({
                            data: {
                                sessionId: exampleSession.id,
                                matterId: createdMatter.id,
                                orderIndex: index + 1
                            }
                        })];
                case 29:
                    // Vincular pauta à sessão
                    _2.sent();
                    _2.label = 30;
                case 30:
                    _j++;
                    return [3 /*break*/, 27];
                case 31:
                    console.log("\uD83D\uDCCB ".concat(createdMatters.length, " Pautas de exemplo criadas"));
                    exampleDocuments = [
                        {
                            title: 'Ata da Sessão Anterior - 15/09/2024',
                            description: 'Aprovação da ata da sessão ordinária do dia 15 de setembro de 2024',
                            type: 'ATA_ANTERIOR',
                            content: "ATA DA SESS\u00C3O ORDIN\u00C1RIA N\u00B0 012/2024\n\nAos quinze dias do m\u00EAs de setembro do ano de dois mil e vinte e quatro, \u00E0s nove horas, reuniram-se os Vereadores da C\u00E2mara Municipal em sess\u00E3o ordin\u00E1ria, sob a presid\u00EAncia do Excelent\u00EDssimo Senhor Presidente.\n\nPRESENTES: Os Vereadores Maria dos Santos, Jo\u00E3o Carlos Silva, Pedro Oliveira, Ana Paula Costa, Roberto Ferreira, Carlos Eduardo Santos, Luciana Pereira, Jos\u00E9 Antonio Lima, Teresa Cristina Souza, Fernando Augusto Rocha, M\u00E1rcia Regina Alves, Ant\u00F4nio Carlos Neves e Paulo Henrique Torres.\n\nAUSENTES: Nenhum vereador ausente foi registrado.\n\nPAUTA:\n1. Aprova\u00E7\u00E3o da Ata da Sess\u00E3o Anterior\n2. Discuss\u00E3o sobre o Projeto de Lei n\u00B0 145/2024\n3. Requerimento para pavimenta\u00E7\u00E3o das ruas do Bairro Central\n4. Outros assuntos de interesse p\u00FAblico\n\nA sess\u00E3o foi presidida pelo Excelent\u00EDssimo Presidente da C\u00E2mara, que ap\u00F3s verificar a presen\u00E7a do qu\u00F3rum regimental, declarou aberta a sess\u00E3o.\n\nNo Grande Expediente foram apresentados tr\u00EAs requerimentos de autoria dos Vereadores, tratando de quest\u00F5es relacionadas \u00E0 melhoria da infraestrutura urbana e servi\u00E7os p\u00FAblicos municipais.\n\nDurante a Ordem do Dia foram votadas e aprovadas por unanimidade as seguintes mat\u00E9rias:\n- Projeto de Lei n\u00B0 145/2024 que disp\u00F5e sobre hor\u00E1rios de funcionamento do com\u00E9rcio\n- Mo\u00E7\u00E3o de congratula\u00E7\u00F5es pelos 50 anos da Escola Municipal Jo\u00E3o da Silva\n\nNada mais havendo a tratar, o Excelent\u00EDssimo Presidente declarou encerrada a sess\u00E3o \u00E0s onze horas e quinze minutos.\n\nPara constar, eu, Secret\u00E1rio da C\u00E2mara, lavrei a presente ata que vai assinada por mim e pelo Excelent\u00EDssimo Presidente.",
                            author: 'Secretário da Câmara'
                        },
                        {
                            title: 'Dispensa da Leitura da Ata',
                            description: 'Solicitação de dispensa da leitura integral da ata anterior',
                            type: 'DISPENSA_ATA',
                            content: "REQUERIMENTO DE DISPENSA DE LEITURA\n\nExcelent\u00EDssimo Senhor Presidente,\nNobres Vereadores,\n\nTendo em vista que a Ata da Sess\u00E3o Anterior foi previamente distribu\u00EDda a todos os Senhores Vereadores com anteced\u00EAncia m\u00EDnima de 24 horas, conforme determina o Regimento Interno desta Casa Legislativa, e considerando que todos os membros tiveram oportunidade de examinar detidamente o seu conte\u00FAdo,\n\nREQUEIRO a dispensa da leitura integral da referida ata, passando-se diretamente \u00E0 sua discuss\u00E3o e vota\u00E7\u00E3o, caso haja alguma observa\u00E7\u00E3o ou retifica\u00E7\u00E3o a ser apresentada.\n\nEsta medida objetiva agilizar os trabalhos da presente sess\u00E3o, permitindo maior tempo para a discuss\u00E3o das mat\u00E9rias constantes da Ordem do Dia.\n\nRespeitosamente,\nMesa Diretora",
                            author: 'Mesa Diretora'
                        },
                        {
                            title: 'Requerimento 001/2024 - Informações sobre Obras Públicas',
                            description: 'Requerimento solicitando informações sobre o andamento das obras de pavimentação',
                            type: 'REQUERIMENTO',
                            content: "REQUERIMENTO N\u00B0 001/2024\n\nExcelent\u00EDssimo Senhor Presidente,\nNobres Pares,\n\nO Vereador que este subscreve, no uso de suas atribui\u00E7\u00F5es regimentais, vem perante esta Casa Legislativa apresentar o seguinte REQUERIMENTO:\n\nCONSIDERANDO que o sistema vi\u00E1rio de nossa cidade apresenta diversas defici\u00EAncias que comprometem a mobilidade urbana e a qualidade de vida dos mun\u00EDcipes;\n\nCONSIDERANDO que v\u00E1rias ruas e avenidas encontram-se em estado prec\u00E1rio de conserva\u00E7\u00E3o, oferecendo riscos \u00E0 seguran\u00E7a dos usu\u00E1rios;\n\nCONSIDERANDO a necessidade de implementar melhorias na sinaliza\u00E7\u00E3o de tr\u00E2nsito e na ilumina\u00E7\u00E3o p\u00FAblica;\n\nREQUER que seja oficiado ao Excelent\u00EDssimo Senhor Prefeito Municipal solicitando:\n\n1) Elabora\u00E7\u00E3o de um cronograma emergencial de recupera\u00E7\u00E3o das vias p\u00FAblicas em pior estado de conserva\u00E7\u00E3o;\n\n2) Implementa\u00E7\u00E3o de programa permanente de manuten\u00E7\u00E3o preventiva do sistema vi\u00E1rio municipal;\n\n3) Melhoria da sinaliza\u00E7\u00E3o de tr\u00E2nsito, especialmente nas proximidades de escolas e centros de sa\u00FAde;\n\n4) Amplia\u00E7\u00E3o e moderniza\u00E7\u00E3o do sistema de ilumina\u00E7\u00E3o p\u00FAblica, priorizando \u00E1reas de maior vulnerabilidade social;\n\n5) Cria\u00E7\u00E3o de relat\u00F3rio mensal sobre as a\u00E7\u00F5es implementadas para conhecimento desta Casa Legislativa.\n\nRespeitosamente,\nVereador Jos\u00E9 Silva",
                            author: 'Vereador José Silva'
                        },
                        {
                            title: 'Projeto de Lei 005/2024 - Horários de Funcionamento',
                            description: 'Projeto de lei que altera horários de funcionamento do comércio local',
                            type: 'PROJETO',
                            content: "PROJETO DE LEI N\u00B0 005/2024\n\nAltera os hor\u00E1rios de funcionamento do com\u00E9rcio local e d\u00E1 outras provid\u00EAncias.\n\nArt. 1\u00B0 Fica alterado o hor\u00E1rio de funcionamento dos estabelecimentos comerciais no munic\u00EDpio, que poder\u00E3o funcionar:\n\nI - De segunda a sexta-feira: das 8h \u00E0s 22h;\nII - Aos s\u00E1bados: das 8h \u00E0s 18h;\nIII - Aos domingos e feriados: das 14h \u00E0s 20h (facultativo).\n\nArt. 2\u00B0 Ficam excetuados do disposto no artigo anterior:\n\nI - Farm\u00E1cias e drogarias;\nII - Postos de combust\u00EDvel;\nIII - Restaurantes, lanchonetes e similares;\nIV - Estabelecimentos de turismo e hotelaria;\nV - Supermercados e hipermercados.\n\nArt. 3\u00B0 O descumprimento desta Lei sujeitar\u00E1 o infrator \u00E0s penalidades previstas no C\u00F3digo de Posturas Municipal.\n\nArt. 4\u00B0 Esta Lei entra em vigor na data de sua publica\u00E7\u00E3o.\n\nJUSTIFICA\u00C7\u00C3O\n\nO presente projeto visa adequar os hor\u00E1rios comerciais \u00E0s necessidades da popula\u00E7\u00E3o, permitindo maior flexibilidade aos consumidores e oportunidades de crescimento aos empres\u00E1rios locais.",
                            author: 'Vereadora Maria dos Santos'
                        }
                    ];
                    createdDocuments = [];
                    _m = 0, _o = exampleDocuments.entries();
                    _2.label = 32;
                case 32:
                    if (!(_m < _o.length)) return [3 /*break*/, 35];
                    _p = _o[_m], index = _p[0], doc = _p[1];
                    return [4 /*yield*/, prisma.document.create({
                            data: {
                                title: doc.title,
                                description: doc.description,
                                content: doc.content,
                                author: doc.author,
                                type: doc.type,
                                orderIndex: index + 1,
                                sessionId: exampleSession.id,
                                createdBy: admin.id
                            }
                        })];
                case 33:
                    createdDoc = _2.sent();
                    createdDocuments.push(createdDoc);
                    _2.label = 34;
                case 34:
                    _m++;
                    return [3 /*break*/, 32];
                case 35:
                    console.log("\uD83D\uDCC4 ".concat(createdDocuments.length, " Documentos de exemplo criados"));
                    speechRequests = [
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
                            citizenCpf: '123.456.789-00'
                        },
                        {
                            type: 'TRIBUNA_LIVE',
                            subject: 'Apresentação do projeto comunitário de reciclagem',
                            citizenName: 'Ana Maria Ferreira',
                            citizenCpf: '987.654.321-00'
                        }
                    ];
                    createdSpeechRequests = [];
                    _q = 0, _r = speechRequests.entries();
                    _2.label = 36;
                case 36:
                    if (!(_q < _r.length)) return [3 /*break*/, 39];
                    _s = _r[_q], index = _s[0], speech = _s[1];
                    return [4 /*yield*/, prisma.speechRequest.create({
                            data: {
                                sessionId: exampleSession.id,
                                type: speech.type,
                                subject: speech.subject,
                                userId: speech.userId || null,
                                citizenName: speech.citizenName || null,
                                citizenCpf: speech.citizenCpf || null,
                                orderIndex: index + 1,
                                isApproved: false
                            }
                        })];
                case 37:
                    createdSpeech = _2.sent();
                    createdSpeechRequests.push(createdSpeech);
                    _2.label = 38;
                case 38:
                    _q++;
                    return [3 /*break*/, 36];
                case 39:
                    console.log("\uD83C\uDFA4 ".concat(createdSpeechRequests.length, " Solicita\u00E7\u00F5es de fala criadas"));
                    legislativeProcesses = [
                        {
                            userId: createdCouncilors[0].id,
                            speechRequestId: createdSpeechRequests[0].id,
                            number: '001/2024',
                            title: 'Projeto de Lei - Sistema de Transporte Público Municipal',
                            description: 'Dispõe sobre a criação de novas linhas de ônibus e melhoria do transporte coletivo municipal, com foco na sustentabilidade e acessibilidade.',
                            type: 'PROJETO_LEI',
                            status: 'EM_TRAMITACAO'
                        },
                        {
                            userId: createdCouncilors[0].id,
                            number: '002/2024',
                            title: 'Requerimento - Informações sobre Orçamento de Transporte',
                            description: 'Solicita informações detalhadas sobre o orçamento destinado ao transporte público municipal e os investimentos previstos para 2024.',
                            type: 'REQUERIMENTO',
                            status: 'EM_TRAMITACAO'
                        },
                        {
                            userId: createdCouncilors[1].id,
                            speechRequestId: createdSpeechRequests[1].id,
                            number: '003/2024',
                            title: 'Indicação - Programa de Iluminação LED',
                            description: 'Indica ao Poder Executivo a implementação de programa de substituição da iluminação pública por tecnologia LED, visando economia energética.',
                            type: 'INDICACAO',
                            status: 'EM_TRAMITACAO'
                        },
                        {
                            userId: createdCouncilors[1].id,
                            number: '004/2024',
                            title: 'Moção de Apoio - Energia Solar em Prédios Públicos',
                            description: 'Moção de apoio à implementação de sistemas de energia solar fotovoltaica em prédios públicos municipais.',
                            type: 'MOCAO',
                            status: 'APROVADO'
                        },
                        {
                            userId: createdCouncilors[2].id,
                            number: '005/2024',
                            title: 'Projeto de Lei - Programa Jovem Empreendedor',
                            description: 'Institui o Programa Municipal Jovem Empreendedor, oferecendo capacitação e microcrédito para jovens de 18 a 29 anos.',
                            type: 'PROJETO_LEI',
                            status: 'EM_TRAMITACAO'
                        },
                        {
                            userId: createdCouncilors[3].id,
                            number: '006/2024',
                            title: 'Requerimento - Centro de Atendimento à Mulher',
                            description: 'Requer informações sobre a criação de Centro Especializado de Atendimento à Mulher em situação de violência doméstica.',
                            type: 'REQUERIMENTO',
                            status: 'EM_TRAMITACAO'
                        }
                    ];
                    createdProcesses = [];
                    _t = 0, legislativeProcesses_1 = legislativeProcesses;
                    _2.label = 40;
                case 40:
                    if (!(_t < legislativeProcesses_1.length)) return [3 /*break*/, 43];
                    process_1 = legislativeProcesses_1[_t];
                    return [4 /*yield*/, prisma.legislativeProcess.create({
                            data: process_1
                        })];
                case 41:
                    createdProcess = _2.sent();
                    createdProcesses.push(createdProcess);
                    _2.label = 42;
                case 42:
                    _t++;
                    return [3 /*break*/, 40];
                case 43:
                    console.log("\uD83D\uDCCB ".concat(createdProcesses.length, " Processos legislativos criados"));
                    // 10. Criar histórico de fases da sessão
                    return [4 /*yield*/, prisma.sessionPhase.create({
                            data: {
                                sessionId: exampleSession.id,
                                phase: 'SCHEDULED',
                                startedAt: exampleSession.createdAt
                            }
                        })];
                case 44:
                    // 10. Criar histórico de fases da sessão
                    _2.sent();
                    console.log('📝 Histórico de fases iniciado');
                    console.log('✅ Seed concluído com sucesso!');
                    console.log('\n📊 Resumo dos dados criados:');
                    console.log("- 1 Administrador: admin@camara.gov.br (senha: admin123)");
                    console.log("- 1 Presidente: presidente@camara.gov.br (senha: presidente123)");
                    console.log("- 13 Vereadores: [email]@camara.gov.br (senha: vereador123)");
                    console.log("- 1 Conta Teste: john@doe.com (senha: johndoe123)");
                    console.log("- 1 Sess\u00E3o de demonstra\u00E7\u00E3o com todas as fases");
                    console.log("- 3 Pautas para vota\u00E7\u00E3o");
                    console.log("- 4 Documentos para expedientes (ata, requerimentos, projetos)");
                    console.log("- 4 Solicita\u00E7\u00F5es de fala (vereadores e cidad\u00E3os)");
                    console.log("- 6 Processos legislativos dos vereadores");
                    console.log("- Hist\u00F3rico de fases da sess\u00E3o");
                    console.log('\n🏛️ Funcionalidades disponíveis:');
                    console.log("- Pequeno Expediente (ata anterior, dispensas)");
                    console.log("- Grande Expediente (requerimentos, projetos)");
                    console.log("- Ordem do Dia (vota\u00E7\u00E3o das pautas)");
                    console.log("- Considera\u00E7\u00F5es Finais (vereadores)");
                    console.log("- Tribuna Live (cidad\u00E3os)");
                    console.log('\n🔗 Acesse: http://localhost:3000');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
