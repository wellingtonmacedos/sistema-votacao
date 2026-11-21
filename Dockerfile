FROM node:26-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
# --legacy-peer-deps: o lockfile resolve @typescript-eslint/eslint-plugin@7.0.0, cujo peer
# range (^6.0.0) é incompatível com o @typescript-eslint/parser@7.0.0 também fixado.
RUN npm ci --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT_MODE=standalone
# Identidade institucional (deploy dedicado por Câmara). São variáveis NEXT_PUBLIC_*:
# ficam embutidas no bundle do cliente em tempo de build, por isso precisam chegar
# aqui como build args (o docker-compose mapeia de NEXT_PUBLIC_APP_NAME/ORG_NAME).
# Sem valor, o sistema usa o padrão genérico.
ARG NEXT_PUBLIC_APP_NAME=""
ARG NEXT_PUBLIC_ORG_NAME=""
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_ORG_NAME=$NEXT_PUBLIC_ORG_NAME
# Placeholder apenas para o build: lib/db.ts valida a variável ao ser importado pelos
# route handlers. O valor real é injetado em runtime pelo ambiente de deploy.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN npx prisma generate && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_OUTPUT_MODE=standalone

# Prisma CLI para aplicar as migrations no start (engines exigem openssl no alpine)
RUN apk add --no-cache openssl
RUN npm install -g prisma@6.7.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Pasta de anexos: criada aqui (fora do .dockerignore) e com ownership do usuário
# nextjs para que o volume nomeado, quando montado nesse caminho, herde a permissão
# de escrita. Sem isso o usuário nextjs (uid 1001) não consegue gravar em public/uploads.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Aplica as migrations pendentes antes de subir a aplicação.
# Se a migration falhar, o servidor não inicia (fail-fast).
CMD ["sh", "-c", "prisma migrate deploy && exec node server.js"]
