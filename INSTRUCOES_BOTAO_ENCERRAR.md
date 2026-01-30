# 🔴 Instruções: Botão "Encerrar Votação"

## ✅ O Botão JÁ EXISTE!

O botão **"Encerrar Votação"** já está implementado no sistema e aparece automaticamente quando há uma votação ativa.

---

## 📍 Onde Encontrar o Botão?

### Local:
**Dashboard Administrativo** (`/admin`) → **Seção "Status da Sessão"** (topo da página)

### Quando Aparece:
- ✅ Quando há uma **votação ativa** (matéria ou documento)
- ✅ Aparece em um **box vermelho** chamativo
- ✅ Localizado no **topo da página**, logo abaixo dos controles principais

---

## 🎯 Como Usar:

### Passo 1: Iniciar uma Votação

Antes de encerrar, você precisa **iniciar** uma votação:

#### **Opção A: Votar um Documento**
1. Faça login como Admin: `admin@camara.gov.br` / `admin123`
2. Vá para **"Pequeno Expediente"** ou **"Grande Expediente"**
3. Clique no botão **"Votar"** em qualquer documento
4. Confirme a ação

#### **Opção B: Votar uma Matéria**
1. Vá para **"Ordem do Dia"**
2. Clique no botão **"Iniciar Votação"** em qualquer matéria
3. Confirme a ação

---

### Passo 2: Visualizar o Botão "Encerrar Votação"

Assim que a votação for iniciada, você verá:

```
┌─────────────────────────────────────────────────────────────┐
│  🗳️ VOTAÇÃO EM ANDAMENTO                                    │
│                                                               │
│  Ata da Sessão Anterior (Documento)                          │
│                                                               │
│  ✅ Favorável: 5    ❌ Contrário: 2    ⚪ Abstenção: 1       │
│  Total: 8/15                                                  │
│                                                               │
│                          [🔴 Encerrar Votação]   <-----      │
└─────────────────────────────────────────────────────────────┘
```

**Características do Box:**
- 🔴 **Fundo vermelho claro** (`bg-red-50`)
- 🔴 **Borda vermelha** (`border-red-200`)
- 🔴 **Ícone de voto** ao lado do título
- 🔴 **Botão vermelho "Encerrar Votação"** à direita

---

### Passo 3: Encerrar a Votação

1. Clique no botão **"Encerrar Votação"**
2. Confirme a ação no popup:
   ```
   Deseja ENCERRAR a votação "[Nome do Item]"?
   Esta ação não pode ser desfeita e o resultado será calculado automaticamente.
   ```
3. O sistema irá:
   - ✅ Calcular o resultado automaticamente
   - ✅ Exibir o resultado no painel público por 10 segundos
   - ✅ Atualizar o status do item (APROVADO/REJEITADO)
   - ✅ Remover o box de votação ativa

---

## 🔍 Por Que o Botão Pode Não Aparecer?

### Possíveis Motivos:

1. **❌ Nenhuma votação ativa**
   - Solução: Inicie uma votação primeiro

2. **❌ Página não atualizada**
   - Solução: Recarregue a página (`F5`)

3. **❌ Erro na API**
   - Solução: Verifique o console do navegador (`F12`)

4. **❌ Votação já foi encerrada**
   - Solução: Inicie uma nova votação

---

## 📊 Fluxo Completo:

```
1. Admin clica "Votar" em um documento/matéria
   ↓
2. API marca item com isVoting = true (documento) ou status = VOTING (matéria)
   ↓
3. Dashboard busca votação ativa via GET /api/admin/voting
   ↓
4. Box vermelho "VOTAÇÃO EM ANDAMENTO" aparece no topo
   ↓
5. Vereadores votam (via /votar ou /councilor)
   ↓
6. Votos são exibidos em tempo real no box
   ↓
7. Admin clica "Encerrar Votação"
   ↓
8. API calcula resultado e atualiza status
   ↓
9. Resultado é exibido no painel público por 10s
   ↓
10. Box de votação desaparece
```

---

## 🧪 Teste Rápido:

### Cenário de Teste:

```bash
# 1. Login Admin
URL: /admin
Email: admin@camara.gov.br
Senha: admin123

# 2. Verificar se há sessão ativa
# Se não houver, clique em "Criar Nova Sessão"

# 3. Abrir Pequeno Expediente
# Rolar até a lista de documentos

# 4. Clicar "Votar" no documento "Ata da Sessão Anterior"
# Confirmar

# 5. ROLAR PARA O TOPO DA PÁGINA
# Você verá o box vermelho com o botão "Encerrar Votação"

# 6. Clicar "Encerrar Votação"
# Confirmar

# 7. Verificar que o box desapareceu
```

---

## 💡 Dica Importante:

**O botão "Encerrar Votação" fica NO TOPO da página**, na seção "Status da Sessão", **NÃO** na lista de documentos/matérias!

```
┌─────────────────────────────────────────┐
│  DASHBOARD ADMINISTRATIVO                │ <-- VOCÊ ESTÁ AQUI
├─────────────────────────────────────────┤
│  [Status da Sessão]                      │ <-- BOTÃO FICA AQUI ⭐
│     ↓                                    │
│  🗳️ VOTAÇÃO EM ANDAMENTO                │
│  [Encerrar Votação] <-------------       │
├─────────────────────────────────────────┤
│  [Controle de Fases]                     │
│  [Pequeno Expediente]                    │
│  [Grande Expediente]                     │
│  [Ordem do Dia]                          │
└─────────────────────────────────────────┘
```

---

## 🔧 Código Relevante:

### Localização do Botão:
- **Arquivo**: `components/admin-dashboard.tsx`
- **Linhas**: 1151-1180

### Função que Encerra:
- **Arquivo**: `components/admin-dashboard.tsx`
- **Função**: `handleEndVoting()`
- **Linhas**: 594-627

### API de Encerramento:
- **Arquivo**: `app/api/admin/voting/route.ts`
- **Método**: `POST` com `action: 'end'`
- **Linhas**: 102-185

---

## ✅ Conclusão:

O botão **"Encerrar Votação"** está **100% implementado e funcional**. Ele aparece automaticamente no topo da página quando há uma votação ativa.

Se você não está vendo o botão:
1. ✅ Certifique-se de que iniciou uma votação
2. ✅ Role para o topo da página
3. ✅ Recarregue a página se necessário
4. ✅ Verifique o console do navegador por erros
