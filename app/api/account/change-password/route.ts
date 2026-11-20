import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { parseBody, changePasswordSchema, ValidationError } from "@/lib/validations"
import { logAudit } from "@/lib/audit"

// POST - Usuário autenticado altera a própria senha (usado para sair da senha
// provisória do seed e também como troca voluntária).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = parseBody(changePasswordSchema, body)

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "A nova senha deve ser diferente da atual" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, mustChangePassword: false },
    })

    await logAudit("ALTERACAO_SENHA", "Usuário alterou a própria senha", request)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Erro ao alterar senha:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
