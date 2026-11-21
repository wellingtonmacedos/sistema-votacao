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

## Backup e restauração

O `docker-compose.yml` inclui um serviço **`backup`** que gera cópias **criptografadas**
(AES-256-GCM) do **banco e dos anexos** no volume nomeado `pgbackups`. Ele faz um backup
quando o container inicia e depois a cada `BACKUP_INTERVAL_HOURS` (padrão 24h), mantendo
os `BACKUP_RETENTION_DAYS` mais recentes (padrão 7).

Cada execução gera dois pares de arquivos (mesmo timestamp):
- `sistema_votacao_AAAAMMDD_HHMMSS.dump.enc` — dump (`pg_dump --format=custom`) cifrado;
- `sistema_votacao_AAAAMMDD_HHMMSS.uploads.tar.gz.enc` — anexos (`tar+gzip`) cifrados;
- e um `.meta.json` para cada (ex.: `sistema_votacao_AAAAMMDD_HHMMSS.meta.json`), com
  tamanho e `sha256`, usado para verificar a integridade na restauração.

> Os anexos entram no backup quando `UPLOADS_DIR` está definida — no `docker-compose`
> já é `/uploads` (o volume `uploads` é montado no serviço de backup). Fora do Docker,
> aponte `UPLOADS_DIR` para o diretório local (ex.: `./public/uploads`). Sem ela, apenas
> o banco é copiado.

### Configuração

No `.env` (usado pelo compose):
```
BACKUP_ENCRYPTION_KEY=<openssl rand -base64 32>
BACKUP_RETENTION_DAYS=7
BACKUP_INTERVAL_HOURS=24
```

> Guarde `BACKUP_ENCRYPTION_KEY` em local seguro (fora do servidor). Sem ela os backups
> **não** podem ser restaurados — os arquivos são irrecuperáveis.
>
> Se a chave não estiver definida, o container de backup ficará reiniciando e registrando
> erro; a aplicação continua funcionando normalmente.

#### Cópia off-site automática (opcional)

Para enviar cada backup automaticamente a um bucket S3 (recomendado em produção),
defina também:
```
BACKUP_S3_BUCKET=meu-bucket-de-backups
BACKUP_S3_PREFIX=backups
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

A cada execução o container de backup envia o dump e o arquivo de anexos (e os
respectivos `.meta.json`) para `s3://<BACKUP_S3_BUCKET>/<BACKUP_S3_PREFIX>/`. A
**retenção local não apaga o S3** — use uma política de ciclo de vida (lifecycle)
no bucket para expirar versões antigas. Sem `BACKUP_S3_BUCKET`, a cópia off-site é
ignorada e o backup permanece apenas local.

### Backup manual

```
npm run backup:db
```

### Restauração

Interrompa a aplicação antes de restaurar (o `pg_restore` recria os objetos e conexões
ativas podem atrapalhar). A restauração sempre cria antes um **snapshot do banco atual**
em `/backups/pre-restore/`, permitindo reverter:

```
docker compose stop app
npm run restore:db -- sistema_votacao_20261120_120000.dump.enc
docker compose start app
```

Os anexos são restaurados separadamente (também cria um snapshot pré-restore dos
anexos atuais):

```
docker compose stop app
npm run restore:uploads -- sistema_votacao_20261120_120000.uploads.tar.gz.enc
docker compose start app
```

Em ambos os casos, se o arquivo não existir localmente e `BACKUP_S3_BUCKET` estiver
definida, ele é baixado do S3 automaticamente. O procedimento completo (incluindo
verificação de integridade) está em [implantacao-e-operacao.md](./implantacao-e-operacao.md).

### Copiar backups para fora do servidor

Mantenha uma cópia off-site (os arquivos são criptografados, então podem sair do host):

```
docker cp sistema-votacao-backup:/backups ./backups
```
