"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FileText, Vote, UserCheck, ArrowLeft, BarChart3, Calendar, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ReportsDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Painel de Relatórios</h2>
        <p className="text-muted-foreground">
          Acesse e exporte relatórios detalhados sobre as atividades legislativas, votações e presença dos parlamentares.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card de Sessões */}
        <Link href="/admin/relatorios/sessoes">
          <Card className="h-full hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 cursor-pointer group">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
              <CardTitle className="text-xl mt-4">Relatório de Sessões</CardTitle>
              <CardDescription>
                Histórico completo das sessões realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Visualize sessões por período, verifique quórum, pautas discutidas e documentos apresentados.
              </p>
            </CardContent>
            <CardFooter>
              <span className="text-sm font-medium text-blue-600 group-hover:underline">Acessar relatório &rarr;</span>
            </CardFooter>
          </Card>
        </Link>

        {/* Card de Votações */}
        <Link href="/admin/relatorios/votacoes">
          <Card className="h-full hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500 cursor-pointer group">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-100 rounded-full group-hover:bg-purple-200 transition-colors">
                  <Vote className="h-6 w-6 text-purple-600" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
              </div>
              <CardTitle className="text-xl mt-4">Relatório de Votações</CardTitle>
              <CardDescription>
                Detalhamento de votos por matéria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Analise como cada vereador votou em cada projeto, com filtros por sessão, autor e tipo de votação.
              </p>
            </CardContent>
            <CardFooter>
              <span className="text-sm font-medium text-purple-600 group-hover:underline">Acessar relatório &rarr;</span>
            </CardFooter>
          </Card>
        </Link>

        {/* Card de Presença */}
        <Link href="/admin/relatorios/presenca">
          <Card className="h-full hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500 cursor-pointer group">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-green-500 transition-colors" />
              </div>
              <CardTitle className="text-xl mt-4">Relatório de Presença</CardTitle>
              <CardDescription>
                Frequência dos parlamentares
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Monitore a assiduidade dos vereadores, horários de chegada e justificativas de ausência.
              </p>
            </CardContent>
            <CardFooter>
              <span className="text-sm font-medium text-green-600 group-hover:underline">Acessar relatório &rarr;</span>
            </CardFooter>
          </Card>
        </Link>
      </div>

      <div className="mt-8 flex justify-end">
        <Link href="/admin">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Menu Principal
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
