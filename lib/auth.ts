
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./db"
import bcrypt from "bcryptjs"
import { rateLimit, resetRateLimit, buildRateLimitKey } from "./rate-limit"
import { logAuditEvent } from "./audit"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.toLowerCase()
        const forwardedFor = req.headers?.["x-forwarded-for"]
        const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
        const userAgent = req.headers?.["user-agent"] ?? null
        const rateKey = buildRateLimitKey(email, ip)

        // Tentativas de login podem não ter usuário identificado (email
        // inexistente), por isso gravamos direto via logAuditEvent.
        const auditLogin = (action: string, details: string, userId: string | null = null) =>
          logAuditEvent({ action, details, userId, ipAddress: ip ?? null, userAgent })

        const limit = await rateLimit(rateKey)
        if (!limit.allowed) {
          await auditLogin("LOGIN_BLOQUEADO", `Excesso de tentativas de login para ${email}`)
          console.warn(`Rate limit excedido para ${credentials.email}. Tente novamente em ${limit.retryAfter}s`)
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user) {
          await auditLogin("LOGIN_FALHA", `Usuário inexistente: ${email}`)
          return null
        }

        if (!user.isActive) {
          await auditLogin("LOGIN_FALHA", `Usuário inativo: ${email}`, user.id)
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          await auditLogin("LOGIN_FALHA", `Senha incorreta: ${email}`, user.id)
          return null
        }

        await resetRateLimit(rateKey)
        await auditLogin("LOGIN_SUCESSO", `Login de ${email}`, user.id)

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.mustChangePassword = user.mustChangePassword
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.mustChangePassword = token.mustChangePassword as boolean
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
}
