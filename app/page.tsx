
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Vote, Users, Shield, FileText } from "lucide-react"

export default async function HomePage() {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Sistema de Votação Eletrônica
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Plataforma segura e transparente para sessões de votação da Câmara de Vereadores
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              Acessar Sistema
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <Vote className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Votação Segura</h3>
            <p className="text-gray-600">Sistema nominal com auditoria completa</p>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gestão de Presenças</h3>
            <p className="text-gray-600">Controle automático de quórum</p>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <Shield className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Controlado</h3>
            <p className="text-gray-600">Perfis diferenciados por função</p>
          </div>
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <FileText className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Atas Automáticas</h3>
            <p className="text-gray-600">Geração de documentos em PDF</p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Transparência e Eficiência
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Desenvolvido especificamente para atender às necessidades das Câmaras Municipais, 
            garantindo transparência, segurança e agilidade nos processos de votação.
          </p>
        </div>
      </div>
    </div>
  )
}
