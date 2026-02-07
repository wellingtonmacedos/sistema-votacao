import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Vote, UserCheck, BarChart, LayoutDashboard } from "lucide-react";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto py-6 px-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Módulo de Relatórios</h1>
          <p className="text-sm text-gray-500 mt-1">Sistema de Gestão Legislativa</p>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>
      
      <div className="flex space-x-2 bg-gray-50 p-1 rounded-lg border w-fit">
        <Link href="/admin/relatorios">
          <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-white hover:shadow-sm">
            <BarChart className="h-4 w-4" />
            Visão Geral
          </Button>
        </Link>
        <Link href="/admin/relatorios/sessoes">
          <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-white hover:shadow-sm">
            <FileText className="h-4 w-4" />
            Sessões
          </Button>
        </Link>
        <Link href="/admin/relatorios/votacoes">
          <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-white hover:shadow-sm">
            <Vote className="h-4 w-4" />
            Votações
          </Button>
        </Link>
        <Link href="/admin/relatorios/presenca">
          <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-white hover:shadow-sm">
            <UserCheck className="h-4 w-4" />
            Presença
          </Button>
        </Link>
      </div>

      <div className="min-h-[600px] bg-white rounded-lg border shadow-sm p-6">
        {children}
      </div>
    </div>
  );
}
