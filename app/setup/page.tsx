import { redirect } from "next/navigation"
import { SetupForm } from "@/components/setup-form"
import { isSetupEnabled, isSetupRequired } from "@/lib/setup"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldAlert } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SetupPage() {
  // Se já existe um administrador ativo, o setup está encerrado.
  if (!(await isSetupRequired())) {
    redirect("/login")
  }

  const enabled = isSetupEnabled()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configuração Inicial
          </h1>
          <p className="text-gray-600">
            Crie o primeiro administrador do sistema
          </p>
        </div>

        {enabled ? (
          <SetupForm />
        ) : (
          <Card className="w-full shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Configuração desabilitada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Para liberar a criação do administrador inicial, defina a variável de
                  ambiente <strong>SETUP_TOKEN</strong> no servidor (um valor aleatório e
                  secreto) e reinicie a aplicação. Depois, recarregue esta página.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
