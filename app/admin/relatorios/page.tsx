"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Vote, UserCheck } from "lucide-react";
import Link from "next/link";

export default function ReportsDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Link href="/admin/relatorios/sessoes">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relatório de Sessões</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Sessões</div>
            <p className="text-xs text-muted-foreground">
              Visualize todas as sessões por mês/ano
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/admin/relatorios/votacoes">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relatório de Votações</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Votações</div>
            <p className="text-xs text-muted-foreground">
              Detalhes de votos por sessão e matéria
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link href="/admin/relatorios/presenca">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relatório de Presença</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Presença</div>
            <p className="text-xs text-muted-foreground">
              Lista de presença dos vereadores por sessão
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
