# Banco de dados e migrations

O schema do banco fica em `prisma/schema.prisma` e o histórico de alterações em `prisma/migrations/`.
O projeto utiliza **PostgreSQL** em todos os ambientes. A URL de conexão vem da variável `DATABASE_URL` (veja `.env.example`).

## Primeira configuração

1. Instale e inicie o PostgreSQL (localmente ou via Docker):
   ```bash
   docker run --name postgres-sv -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
   ```
2. Crie o banco de dados:
   ```bash
   createdb -U postgres sistema_votacao
   ```
3. Copie o arquivo de exemplo e preencha `DATABASE_URL`, `NEXTAUTH_SECRET`:
   ```
   cp .env.example .env        # Windows: copy .env.example .env
   ```

### Banco novo (vazio)

```
npx prisma migrate deploy
npx prisma db seed     # opcional: dados de exemplo
```

### Banco que já existia antes das migrations

Bancos criados com `prisma db push` já têm todas as tabelas, mas não têm o histórico de migrations.
Nesse caso o `migrate deploy` falha com `P3005 (The database schema is not empty)` e o servidor não sobe —
o banco não é alterado, mas é preciso fazer o baseline antes.

Marque **todas** as migrations de `prisma/migrations/` como já aplicadas (não altera nenhum dado).
No estado atual do repositório, são estas:
```
npx prisma migrate resolve --applied 0_init
npx prisma migrate resolve --applied 20261016000000_add_session_script_items
npx prisma migrate resolve --applied 20261016010000_add_document_types
```
Confira com `npx prisma migrate status` — deve mostrar "Database schema is up to date!".

> Marque todas porque um banco criado por `db push` já reflete o schema mais recente.
> Marcar apenas `0_init` faria as migrations seguintes tentarem recriar tabelas existentes.

## Alterando o schema

Não use mais `prisma db push`. Depois de editar `prisma/schema.prisma`:
```
npx prisma migrate dev --name descricao-curta-da-mudanca
```
Isso cria uma pasta em `prisma/migrations/` que deve ser commitada junto com o schema.
A CI falha se o schema for alterado sem a migration correspondente.

## Produção

Com `DATABASE_URL` apontando para o banco de produção (e backup feito):
```
npx prisma migrate deploy
```

### Via Docker

No deploy com `docker-compose` (ou qualquer imagem baseada no `Dockerfile`), as migrations são aplicadas automaticamente:
o container executa `prisma migrate deploy` antes de iniciar o servidor. Se houver migration pendente, ela é aplicada
no start; se alguma falhar, o servidor não sobe.

Por isso, a cada alteração de schema garanta que a pasta em `prisma/migrations/` esteja commitada antes de gerar a imagem.
