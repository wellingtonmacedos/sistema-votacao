
"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  FileText,
  Play,
  Square,
  Users,
  Vote,
  Clock,
  CheckCircle
} from "lucide-react"

export function PresidentDashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  const handleNewSession = () => {
    // Funcionalidade para criar nova sessão
    alert('Funcionalidade de Nova Sessão em desenvolvimento!')
  }

  const handleManageMatters = () => {
    // Funcionalidade para gerenciar pautas
    alert('Funcionalidade de Gerenciar Pautas em desenvolvimento!')
  }

  const handleViewHistory = () => {
    // Funcionalidade para ver histórico
    alert('Funcionalidade de Histórico em desenvolvimento!')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Presidência da Câmara
          </h1>
          <p className="text-gray-600">
            Presidir sessões e acompanhar os trabalhos legislativos
          </p>
        </div>

        {/* Session Status */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-900">
                  Aguardando sessão criada pelo Administrador
                </h3>
                <p className="text-sm text-amber-700">
                  O Administrador controla criação de sessões, pautas e início das votações
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-white">
              Aguardando
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Vereadores Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">13</div>
              <p className="text-xs text-gray-600">
                Todos os vereadores cadastrados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sessões Este Mês
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-600">
                Primeira sessão do mês
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pautas Pendentes
              </CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-gray-600">
                Nenhuma pauta cadastrada
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Quórum Mínimo
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-gray-600">
                Maioria simples (13 vereadores)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer opacity-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-gray-400" />
                  Presidir Sessão
                </CardTitle>
                <Badge variant="secondary">Aguardando</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Presidir sessão ativa quando criada pelo Administrador
              </p>
              <Button disabled className="w-full">
                Nenhuma Sessão Ativa
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Visualizar Pautas
                </CardTitle>
                <Badge variant="secondary">0 pautas</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Consultar pautas cadastradas pelo Administrador
              </p>
              <Button variant="outline" className="w-full" onClick={handleManageMatters}>
                Ver Pautas
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5 text-purple-600" />
                  Histórico
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Consultar sessões anteriores e resultados das votações
              </p>
              <Button variant="outline" className="w-full" onClick={handleViewHistory}>
                Ver Histórico
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
