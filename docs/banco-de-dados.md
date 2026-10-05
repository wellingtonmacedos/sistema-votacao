# Banco de dados e migrations

O schema do banco fica em `prisma/schema.prisma` e o histórico de alterações em `prisma/migrations/`.
A URL do banco vem da variável `DATABASE_URL` (veja `.env.example`). Em desenvolvimento o padrão é o SQLite `prisma/dev.db`.

## Primeira configuração

1. Copie o arquivo de exemplo e preencha `NEXTAUTH_SECRET`:
   ```
   cp .env.example .env        # Windows: copy .env.example .env
   ```
2. Faça backup do banco antes de qualquer passo abaixo (copie `prisma/dev.db`).

### Banco que já existia antes das migrations

Bancos criados com `prisma db push` já têm todas as tabelas, mas não têm o histórico de migrations.
Rode **uma única vez** em cada banco existente para marcar a migration inicial como já aplicada (não altera nenhum dado):
```
pnpm exec prisma migrate resolve --applied 0_init
```
Confira com `pnpm exec prisma migrate status` — deve mostrar "Database schema is up to date!".

### Banco novo (vazio)

```
pnpm exec prisma migrate deploy
pnpm exec prisma db seed     # opcional: dados de exemplo
```

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
