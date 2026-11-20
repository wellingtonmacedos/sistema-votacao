
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ChangePasswordForm } from "@/components/change-password-form"

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Defina uma nova senha
          </h1>
          <p className="text-gray-600">
            Sua senha atual é provisória. Crie uma senha pessoal para continuar.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
