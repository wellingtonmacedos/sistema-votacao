import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Vote, UserCheck, BarChart } from "lucide-react";

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Módulo de Relatórios</h1>
      </div>
      
      <div className="flex space-x-2 border-b pb-2">
        <Link href="/admin/relatorios">
          <Button variant="ghost" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Visão Geral
          </Button>
        </Link>
        <Link href="/admin/relatorios/sessoes">
          <Button variant="ghost" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Sessões
          </Button>
        </Link>
        <Link href="/admin/relatorios/votacoes">
          <Button variant="ghost" className="flex items-center gap-2">
            <Vote className="h-4 w-4" />
            Votações
          </Button>
        </Link>
        <Link href="/admin/relatorios/presenca">
          <Button variant="ghost" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Presença
          </Button>
        </Link>
      </div>

      <div className="min-h-[600px]">
        {children}
      </div>
    </div>
  );
}
