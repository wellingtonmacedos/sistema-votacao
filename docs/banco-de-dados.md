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
pnpm exec prisma migrate deploy
pnpm exec prisma db seed     # opcional: dados de exemplo
```

### Banco que já existia antes das migrations

Bancos criados com `prisma db push` já têm todas as tabelas, mas não têm o histórico de migrations.
Rode **uma única vez** em cada banco existente para marcar a migration inicial como já aplicada (não altera nenhum dado):
```
pnpm exec prisma migrate resolve --applied 0_init
```
Confira com `pnpm exec prisma migrate status` — deve mostrar "Database schema is up to date!".

## Alterando o schema

Não use mais `prisma db push`. Depois de editar `prisma/schema.prisma`:
```
pnpm exec prisma migrate dev --name descricao-curta-da-mudanca
```
Isso cria uma pasta em `prisma/migrations/` que deve ser commitada junto com o schema.
A CI falha se o schema for alterado sem a migration correspondente.

## Produção

Com `DATABASE_URL` apontando para o banco de produção (e backup feito):
```
pnpm exec prisma migrate deploy
```
