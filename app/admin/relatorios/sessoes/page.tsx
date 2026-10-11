"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, ChevronDown, ChevronRight, Clock, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

import { exportToPDF } from "@/lib/export-utils";

type PhaseRow = {
  id: string;
  phase: string;
  label: string;
  color: string;
  startedAt: string;
  endedAt: string | null;
  isOpen: boolean;
  durationMs: number;
  durationHuman: string;
};

type PhaseHistory = {
  session: any;
  phases: PhaseRow[];
  summary: {
    totalPhases: number;
    totalDurationMs: number;
    totalDurationHuman: string;
  };
};

export default function SessionsReportPage() {
  const [month, setMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyBySession, setHistoryBySession] = useState<Record<string, PhaseHistory>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const years = ["2024", "2025", "2026"];

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/sessions?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Erro ao buscar sessões:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhaseHistory = async (sessionId: string) => {
    if (historyBySession[sessionId]) return;
    setLoadingHistory((prev) => ({ ...prev, [sessionId]: true }));
    try {
      const res = await fetch(`/api/sessions/${sessionId}/phases`);
      if (res.ok) {
        const data = (await res.json()) as PhaseHistory;
        setHistoryBySession((prev) => ({ ...prev, [sessionId]: data }));
      }
    } catch (error) {
      console.error("Erro ao buscar fases da sessão:", error);
    } finally {
      setLoadingHistory((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleExport = () => {
    const columns = ["Data", "Sessão", "Status", "Matérias", "Presenças", "Duração Total"];
    const data = sessions.map(s => {
      const hist = historyBySession[s.id];
      const duration = hist?.summary?.totalDurationHuman || "-";
      return [
        format(new Date(s.date), "dd/MM/yyyy", { locale: ptBR }),
        `${s.title} (${s.sessionNumber || '-'})`,
        s.status,
        s._count?.matters || 0,
        s._count?.attendances || 0,
        duration
      ];
    });
    
    exportToPDF(
      `Relatório de Sessões - ${months.find(m => m.value === month)?.label}/${year}`,
      columns,
      data,
      `sessoes_${month}_${year}`
    );
  };

  const formatDateTime = (iso: string | undefined | null) => {
    if (!iso) return "-";
    try {
      return format(new Date(iso), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Sessões por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 w-[180px]">
              <label className="text-sm font-medium">Mês</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 w-[180px]">
              <label className="text-sm font-medium">Ano</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={fetchSessions} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Buscando..." : "Gerar Relatório"}
            </Button>

            {sessions.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {sessions.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <Accordion type="multiple" className="w-full">
              {sessions.map((session) => (
                <AccordionItem key={session.id} value={session.id}>
                  <AccordionTrigger
                    className="flex-1 hover:no-underline"
                    onClick={() => loadPhaseHistory(session.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm sm:text-base">
                        {format(new Date(session.date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="hidden sm:inline">
                        <span className="font-semibold">{session.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">{session.sessionNumber}</span>
                      </span>
                      <Badge variant={session.status === 'CLOSED' ? 'secondary' : 'default'}>
                        {session.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto hidden md:inline">
                        Matérias: {session._count?.matters || 0} · Presenças: {session._count?.attendances || 0}
                        {historyBySession[session.id] && (
                          <> · Duração total: <strong>{historyBySession[session.id].summary.totalDurationHuman}</strong></>
                        )}
                      </span>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent>
                    <div className="pt-3 pb-2">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <HistoryIcon className="h-4 w-4" />
                          Histórico de Fases
                        </div>
                        {loadingHistory[session.id] && (
                          <span className="text-xs text-muted-foreground">Carregando...</span>
                        )}
                        {historyBySession[session.id] && (
                          <div className="text-xs text-muted-foreground">
                            {historyBySession[session.id].summary.totalPhases} fase(s) · Total: <strong>{historyBySession[session.id].summary.totalDurationHuman}</strong>
                          </div>
                        )}
                      </div>

                      {!historyBySession[session.id] && !loadingHistory[session.id] && (
                        <div className="text-sm text-muted-foreground">Expanda para carregar o histórico.</div>
                      )}

                      {historyBySession[session.id]?.phases?.length === 0 && (
                        <div className="text-sm text-muted-foreground">Nenhum registro de fases para esta sessão.</div>
                      )}

                      {historyBySession[session.id] && historyBySession[session.id].phases.length > 0 && (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>Fase</TableHead>
                                <TableHead className="text-right">Início</TableHead>
                                <TableHead className="text-right">Fim</TableHead>
                                <TableHead className="text-right">Duração</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {historyBySession[session.id].phases.map((p, idx) => (
                                <TableRow key={p.id}>
                                  <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${p.color}`} />
                                      <span className="font-medium text-sm">{p.label}</span>
                                      {p.isOpen && <Badge variant="outline" className="text-[10px] h-4 px-1.5">Em andamento</Badge>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right text-xs tabular-nums">{formatDateTime(p.startedAt)}</TableCell>
                                  <TableCell className="text-right text-xs tabular-nums">{formatDateTime(p.endedAt)}</TableCell>
                                  <TableCell className="text-right text-xs tabular-nums font-medium">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3 opacity-60" />
                                      {p.durationHuman}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      <Separator className="my-4" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
