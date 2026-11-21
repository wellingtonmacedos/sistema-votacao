# Implantação e operação

Guia do operador para instalar e manter uma instalação do sistema. O modelo de
entrega é **deploy dedicado por Câmara** (single-tenant): cada Câmara tem o
próprio servidor, banco e configuração. Para o banco e o histórico de migrations,
veja [banco-de-dados.md](./banco-de-dados.md).

## Arquitetura

```
Internet ──► Nginx (host, TLS 443) ──► 127.0.0.1:3000 (container "app")
                                          ├── postgres:16   (volume pgdata)
                                          ├── redis:7       (rate limit de login)
                                          └── backup        (pgbackups + anexos)
```

- O **TLS é terminado pelo Nginx do host**; o container `app` só escuta em
  `127.0.0.1:3000` e nunca fica exposto direto à internet.
- As **migrations são aplicadas no boot** do container `app` (`prisma migrate
  deploy`). Se uma migration falhar, o servidor não sobe.
- Volumes nomeados:
  - `pgdata` — dados do PostgreSQL.
  - `uploads` — anexos enviados (fotos, PDFs), montado em `/app/public/uploads`.
  - `pgbackups` — backups criptografados (banco + anexos).

## Pré-requisitos

- Docker Engine + plugin `docker compose` (v2).
- Nginx instalado no host.
- `certbot` (Let's Encrypt).
- Um (sub)domínio com registro DNS **A** apontando para o IP do servidor.
- `openssl`.

## 1. Código e variáveis de ambiente

```bash
git clone https://github.com/wellingtonmacedos/sistema-votacao
cd sistema-votacao
cp .env.example .env
```

Gere os segredos:

```bash
openssl rand -base64 32   # NEXTAUTH_SECRET
openssl rand -base64 32   # BACKUP_ENCRYPTION_KEY
openssl rand -base64 24   # SETUP_TOKEN
```

Preencha o `.env` (o `docker compose` lê este arquivo automaticamente):

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `NEXTAUTH_SECRET` | Sim | Segredo de sessão. Mínimo recomendado: 32 caracteres. |
| `NEXTAUTH_URL` | Sim | URL pública **https** (ex.: `https://votacao.suacidade.gov.br`). Os cookies de sessão dependem dela. |
| `SETUP_TOKEN` | Sim¹ | Libera a criação do primeiro admin em `/setup`. Remova do `.env` depois do onboarding. |
| `BACKUP_ENCRYPTION_KEY` | Sim² | 32 bytes (base64) ou 64 hex. **Guarde fora do servidor**: sem ela os backups são irrecuperáveis. |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_ORG_NAME` | Não | Identidade institucional. Sem valor, usa o padrão genérico. |
| `BACKUP_INTERVAL_HOURS` / `BACKUP_RETENTION_DAYS` | Não | Padrões: `24` e `7`. |
| `BACKUP_S3_BUCKET` / `BACKUP_S3_PREFIX` + `AWS_*` | Não | Cópia offsite dos backups no S3. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Não | Padrões: `postgres` / `postgres` / `sistema_votacao`. Troque a senha em produção. |

¹ Obrigatória apenas durante o onboarding (passo 4). ² Obrigatória para o serviço
`backup`; se faltar, apenas esse container reinicia e registra erro — a aplicação
segue normalmente.

### Identidade institucional (por Câmara)

`NEXT_PUBLIC_APP_NAME` e `NEXT_PUBLIC_ORG_NAME` são variáveis `NEXT_PUBLIC_*`:
ficam **embutidas no bundle em tempo de build**. Portanto precisam estar
definidas **antes** de gerar a imagem e **exigem rebuild** quando mudarem:

```bash
# no .env
NEXT_PUBLIC_APP_NAME="Sistema de Votação Eletrônica"
NEXT_PUBLIC_ORG_NAME="Câmara Municipal de Exemplo"
```

## 2. Subir o stack

```bash
docker compose up -d --build
docker compose ps
```

A primeira execução compila a imagem e aplica as migrations. Aguarde o `app`
ficar `healthy` (o healthcheck usa `/api/health`). Acompanhe com:

```bash
docker compose logs -f app
```

## 3. Nginx + TLS

1. Edite `server_name` em `deploy/nginx/sistema-votacao.conf` com o seu domínio.
2. Publique o vhost:
   ```bash
   sudo cp deploy/nginx/sistema-votacao.conf /etc/nginx/sites-available/sistema-votacao
   sudo ln -s /etc/nginx/sites-available/sistema-votacao /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
3. Emita o certificado (o DNS já deve apontar para o servidor):
   ```bash
   sudo certbot --nginx -d votacao.suacidade.gov.br
   ```
   O certbot obtém o certificado, ajusta os caminhos em `ssl_certificate` e cria
   a renovação automática.

> `NEXTAUTH_URL` no `.env` deve usar **o mesmo domínio https** do vhost.

## 4. Onboarding do primeiro administrador

Com `SETUP_TOKEN` definido no `.env` e o stack no ar:

1. Acesse `https://<seu-dominio>/setup`.
2. Informe o `SETUP_TOKEN` e crie o administrador.
3. Remova `SETUP_TOKEN` do `.env` e recrie o container:
   ```bash
   docker compose up -d app   # relê o .env sem SETUP_TOKEN
   ```

O `/setup` só funciona enquanto **não existir nenhum admin ativo** — depois do
primeiro cadastro ele se bloqueia sozinho, mesmo que o token continue definido.

## Operação

### Status e logs

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f backup
```

### Atualização para uma nova versão

```bash
git pull
docker compose up -d --build   # recompila e aplica migrations no boot do app
```

As migrations pendentes são aplicadas automaticamente pelo container `app`. Se
`NEXT_PUBLIC_*` mudou, o rebuild já injeta o novo valor.

### Backup

O serviço `backup` é automático: faz uma cópia **no start** e depois a cada
`BACKUP_INTERVAL_HOURS`, mantendo os `BACKUP_RETENTION_DAYS` mais recentes. Cada
execução gera **dois** artefatos (mesmo timestamp, cifrados com AES-256-GCM):

- `sistema_votacao_<AAAAMMDD>_<HHMMSS>.dump.enc` — dump do banco (`pg_dump --format=custom`);
- `sistema_votacao_<AAAAMMDD>_<HHMMSS>.uploads.tar.gz.enc` — anexos (`tar+gzip`);

cada um acompanhado de um `.meta.json` com tamanho e `sha256`. Os arquivos ficam
no volume `pgbackups` (dentro do container: `/backups`).

Backup **manual** (não espera o ciclo):

```bash
npm run backup:db
```

Cópia para fora do servidor:

```bash
docker cp sistema-votacao-backup:/backups ./backups
```

Offsite automático: defina `BACKUP_S3_BUCKET` (e `AWS_*`). A retenção local **não**
apaga o S3 — use uma política de ciclo de vida no bucket.

### Restauração

Interrompa a aplicação antes de restaurar. Ambos os scripts criam antes um
**snapshot do estado atual** em `/backups/pre-restore/`, permitindo reverter.

Banco:

```bash
docker compose stop app
npm run restore:db -- sistema_votacao_20261120_120000.dump.enc
docker compose start app
```

Anexos:

```bash
docker compose stop app
npm run restore:uploads -- sistema_votacao_20261120_120000.uploads.tar.gz.enc
docker compose start app
```

Se o arquivo não existir localmente e `BACKUP_S3_BUCKET` estiver definida, ele é
baixado do S3 automaticamente. A restauração verifica o `sha256` do `.meta.json`
antes de sobrescrever os arquivos.

### Ensaio de restauração (teste periódico)

Recomenda-se ensaiar a restauração periodicamente, **em um banco descartável**,
para confirmar que os backups são recuperáveis sem tocar nos dados de produção:

1. Crie um banco vazio (ex.: `sistema_votacao_restore`) e aplique o schema nele
   (`prisma migrate deploy` com `DATABASE_URL` apontando para esse banco).
2. Rode um backup apontando para o banco de teste:
   ```bash
   docker compose run --rm -e DATABASE_URL=<banco-de-teste> backup node db-backup.mjs
   ```
3. Popule dados de prova, apague-os (simulando a perda) e restaure com
   `db-restore.mjs` / `uploads-restore.mjs`, apontando `DATABASE_URL` para o banco
   de teste.
4. Confirme que os dados voltaram e que o snapshot foi criado em
   `/backups/pre-restore/`.

A verificação de integridade roda **antes** de qualquer sobrescrita: um arquivo
corrompido é rejeitado com erro (`sha256 ... não confere`) e o banco permanece
intacto.

### Verificação de consistência do schema

Confirme que o banco está sincronizado com o histórico de migrations:

```bash
docker compose exec app npx prisma migrate status
```

## Solução de problemas

- **`P3005 (The database schema is not empty)`** no boot: banco criado fora do
  histórico de migrations. Faça o baseline — veja
  [banco-de-dados.md](./banco-de-dados.md#banco-que-já-existia-antes-das-migrations).
- **Container `backup` reiniciando**: falta `BACKUP_ENCRYPTION_KEY` (ou ela não
  tem 32 bytes). A aplicação continua no ar.
- **A identidade da Câmara não aparece**: `NEXT_PUBLIC_*` só entram no bundle no
  build. Ajuste o `.env` e rode `docker compose up -d --build app`.
- **Redirecionamento de login falhando / cookie não persiste**: `NEXTAUTH_URL`
  não corresponde ao domínio https do vhost do Nginx.
- **Upload recusado (413)**: anexo maior que `client_max_body_size` (padrão `25m`
  no vhost). Ajuste e recarregue o Nginx.

## Checklist de go-live

- [ ] `.env` preenchido; `NEXTAUTH_SECRET`, `SETUP_TOKEN` e `BACKUP_ENCRYPTION_KEY` gerados.
- [ ] `NEXT_PUBLIC_APP_NAME`/`ORG_NAME` definidos (identidade da Câmara).
- [ ] `docker compose up -d --build` e `app` **healthy**.
- [ ] Nginx + certbot com HTTPS ativo; `NEXTAUTH_URL` com o mesmo domínio.
- [ ] Primeiro admin criado em `/setup`; `SETUP_TOKEN` removido do `.env`.
- [ ] `BACKUP_ENCRYPTION_KEY` guardada fora do servidor.
- [ ] Backup manual rodado (`npm run backup:db`) e arquivos presentes em `/backups`.
- [ ] (Recomendado) `BACKUP_S3_BUCKET` configurado para cópia offsite.
- [ ] (Recomendado) **Ensaio de restauração** realizado e validado em ambiente de teste.
