import Redis from "ioredis"

interface RateLimitEntry {
  count: number
  resetAt: number
}

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number | null
}

// ---------------------------------------------------------------------------
// Fallback em memória.
//
// Usado no desenvolvimento/CI (sem REDIS_URL) e como rede de segurança caso o
// Redis fique indisponível em runtime. Não escala horizontalmente, mas evita
// bloquear todos os logins se o Redis cair.
// ---------------------------------------------------------------------------
const store = new Map<string, RateLimitEntry>()

function memoryLimit(key: string): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfter: null }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count += 1
  store.set(key, entry)
  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - entry.count,
    retryAfter: null,
  }
}

// ---------------------------------------------------------------------------
// Backend Redis (janela fixa).
//
// O cliente é criado sob demanda (nunca no import do módulo) para não abrir
// conexão durante o build do Next.js. Guardado em globalThis para sobreviver ao
// hot-reload em desenvolvimento.
// ---------------------------------------------------------------------------
const globalForRedis = globalThis as unknown as {
  __rateLimitRedis?: Redis
}

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL
  if (!url) return null

  if (!globalForRedis.__rateLimitRedis) {
    globalForRedis.__rateLimitRedis = new Redis(url, {
      // Limita o tempo de espera quando o Redis está fora, para cair no fallback.
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    })
    globalForRedis.__rateLimitRedis.on("error", (err) => {
      console.error("[rate-limit] erro na conexão com o Redis:", err.message)
    })
  }

  return globalForRedis.__rateLimitRedis
}

async function redisLimit(redis: Redis, key: string): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`

  const count = await redis.incr(redisKey)
  if (count === 1) {
    await redis.pexpire(redisKey, WINDOW_MS)
  }

  const ttl = await redis.pttl(redisKey)
  const retryAfter = ttl > 0 ? Math.ceil(ttl / 1000) : Math.ceil(WINDOW_MS / 1000)

  if (count > MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, retryAfter }
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - count, retryAfter: null }
}

export async function rateLimit(key: string): Promise<RateLimitResult> {
  const redis = getRedis()

  if (redis) {
    try {
      return await redisLimit(redis, key)
    } catch (error) {
      console.error(
        "[rate-limit] Redis indisponível; usando fallback em memória:",
        error
      )
    }
  }

  return memoryLimit(key)
}

export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedis()

  if (redis) {
    try {
      await redis.del(`ratelimit:${key}`)
      return
    } catch (error) {
      console.error(
        "[rate-limit] Redis indisponível ao resetar; limpando memória:",
        error
      )
    }
  }

  store.delete(key)
}

export function buildRateLimitKey(identifier: string, ip?: string): string {
  return `${identifier}:${ip || "unknown"}`
}
