
import { LoginForm } from "@/components/login-form"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    // Redirecionar baseado no papel do usuário
    switch (session.user.role) {
      case 'ADMIN':
        redirect('/admin')
      case 'PRESIDENT':
        redirect('/president')
      case 'COUNCILOR':
        redirect('/councilor')
      default:
        redirect('/councilor')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Votação
          </h1>
          <p className="text-gray-600">
            Câmara de Vereadores - Acesso Seguro
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
