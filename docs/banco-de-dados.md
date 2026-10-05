# Banco de dados e migrations

O sistema usa **PostgreSQL**. O schema fica em `prisma/schema.prisma` e o histórico de alterações em `prisma/migrations/`.
A URL do banco vem da variável `DATABASE_URL` (veja `.env.example`).

## Desenvolvimento local (Docker)

```
cp .env.example .env          # Windows: copy .env.example .env  — preencha NEXTAUTH_SECRET
docker compose up -d          # sobe o Postgres em localhost:5432 (usuário/senha/banco: votacao)
pnpm exec prisma migrate deploy
pnpm dev
```

Para dados de exemplo num banco vazio: `pnpm exec prisma db seed` (o seed **apaga** os dados existentes).

## Migrar os dados do SQLite antigo (`prisma/dev.db`)

Até a versão v1.2.0 o sistema usava SQLite. Para levar esses dados para o Postgres:

1. Faça uma cópia de segurança do `prisma/dev.db`.
2. Com `DATABASE_URL` apontando para um Postgres **vazio**, aplique as migrations:
   ```
   pnpm exec prisma migrate deploy
   ```
3. Copie os dados (requer Node 22.5 ou superior):
   ```
   node --env-file=.env scripts/copy-sqlite-to-postgres.mjs prisma/dev.db
   ```
   O script lê o SQLite em modo somente leitura, recusa rodar se o destino já tiver dados, copia tudo numa única
   transação e, ao final, compara tabela por tabela (quantidade e conteúdo) entre origem e destino.

O mesmo procedimento vale para staging e produção (ex.: Supabase), trocando apenas a `DATABASE_URL`.

## Alterando o schema

Não use `prisma db push`. Depois de editar `prisma/schema.prisma`:
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
