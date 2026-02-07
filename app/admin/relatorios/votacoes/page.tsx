"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { exportToPDF } from "@/lib/export-utils";

export default function VotesReportPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/sessions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSessions(data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchReport = async () => {
    if (!selectedSessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/votes?sessionId=${selectedSessionId}`);
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Erro ao buscar relatório:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!reportData) return;
    const columns = ["Item", "Ementa/Descrição", "Status", "Resultado"];
    
    let data: any[][] = [];
    
    // Matérias
    if (reportData.matters) {
      data = data.concat(reportData.matters.map((m: any) => [
        `[MATÉRIA] ${m.matter.title}`,
        m.matter.description,
        m.matter.status,
        `${m.matter.votes.filter((v: any) => v.voteType === 'YES').length} SIM / ${m.matter.votes.filter((v: any) => v.voteType === 'NO').length} NÃO`
      ]));
    }

    // Documentos
    if (reportData.documents) {
      data = data.concat(reportData.documents.map((d: any) => [
        `[DOC] ${d.title}`,
        d.type,
        d.isApproved ? 'APROVADO' : d.isApproved === false ? 'REJEITADO' : 'NÃO VOTADO',
        d.votes ? `${d.votes.filter((v: any) => v.voteType === 'YES').length} SIM / ${d.votes.filter((v: any) => v.voteType === 'NO').length} NÃO` : '-'
      ]));
    }

    exportToPDF(
      `Relatório de Votações - ${reportData.title}`,
      columns,
      data,
      `votacoes_${selectedSessionId}`
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Votações por Sessão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 w-[400px]">
              <label className="text-sm font-medium">Selecione a Sessão</label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma sessão..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {format(new Date(session.date), "dd/MM/yyyy", { locale: ptBR })} - {session.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchReport} disabled={loading || !selectedSessionId}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Buscando..." : "Gerar Relatório"}
            </Button>

            {reportData && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>{reportData.title} - Detalhes das Votações</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="matters">
              <TabsList>
                <TabsTrigger value="matters">Matérias ({reportData.matters.length})</TabsTrigger>
                <TabsTrigger value="documents">Documentos ({reportData.documents.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="matters" className="space-y-6">
                {reportData.matters.map((item: any) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{item.matter.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.matter.description}</p>
                      </div>
                      <Badge>{item.matter.status}</Badge>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-md">
                      <h4 className="font-semibold mb-2 text-sm">Votos ({item.matter.votes.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        {item.matter.votes.map((vote: any) => (
                          <div key={vote.id} className="flex items-center gap-2">
                            <Badge variant={
                              vote.voteType === 'YES' ? 'default' : 
                              vote.voteType === 'NO' ? 'destructive' : 'secondary'
                            }>
                              {vote.voteType === 'YES' ? 'SIM' : vote.voteType === 'NO' ? 'NÃO' : 'ABST'}
                            </Badge>
                            <span>{vote.user.fullName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {reportData.matters.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma matéria votada nesta sessão.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-6">
                {reportData.documents.map((doc: any) => (
                  <div key={doc.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground">{doc.type}</p>
                      </div>
                      <Badge variant={doc.isApproved ? 'default' : 'destructive'}>
                        {doc.isApproved ? 'APROVADO' : doc.isApproved === false ? 'REJEITADO' : 'NÃO VOTADO'}
                      </Badge>
                    </div>

                    {doc.votes.length > 0 && (
                      <div className="bg-muted/50 p-4 rounded-md">
                        <h4 className="font-semibold mb-2 text-sm">Votos ({doc.votes.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                          {doc.votes.map((vote: any) => (
                            <div key={vote.id} className="flex items-center gap-2">
                              <Badge variant={
                                vote.voteType === 'YES' ? 'default' : 
                                vote.voteType === 'NO' ? 'destructive' : 'secondary'
                              }>
                                {vote.voteType === 'YES' ? 'SIM' : vote.voteType === 'NO' ? 'NÃO' : 'ABST'}
                              </Badge>
                              <span>{vote.user.fullName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {reportData.documents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum documento nesta sessão.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
