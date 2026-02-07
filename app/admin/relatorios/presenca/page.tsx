"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { exportToPDF } from "@/lib/export-utils";

export default function PresenceReportPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [reportData, setReportData] = useState<any[]>([]);
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
      const res = await fetch(`/api/reports/presence?sessionId=${selectedSessionId}`);
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleExport = () => {
    if (!reportData.length) return;
    const columns = ["Vereador", "Partido", "Status", "Horário de Chegada"];
    const data = reportData.map(c => [
      c.fullName,
      c.party || '-',
      c.isPresent ? 'PRESENTE' : 'AUSENTE',
      c.arrivedAt ? format(new Date(c.arrivedAt), "HH:mm:ss", { locale: ptBR }) : '-'
    ]);
    const sessionTitle = sessions.find(s => s.id === selectedSessionId)?.title || "Sessão";
    exportToPDF(
      `Lista de Presença - ${sessionTitle}`,
      columns,
      data,
      `presenca_${selectedSessionId}`
    );
  };

  const presentCount = reportData.filter(c => c.isPresent).length;
  const totalCount = reportData.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Relatório de Presença por Sessão</CardTitle>
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

            {reportData.length > 0 && (
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lista de Presença</CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-base px-4 py-1">
                Total: {totalCount}
              </Badge>
              <Badge variant="default" className="text-base px-4 py-1 bg-green-600">
                Presentes: {presentCount}
              </Badge>
              <Badge variant="destructive" className="text-base px-4 py-1">
                Ausentes: {totalCount - presentCount}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Foto</TableHead>
                  <TableHead>Vereador</TableHead>
                  <TableHead>Partido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Horário de Chegada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((councilor) => (
                  <TableRow key={councilor.id}>
                    <TableCell>
                      <Avatar>
                        <AvatarImage src={councilor.photoUrl || ""} />
                        <AvatarFallback>{getInitials(councilor.fullName)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{councilor.fullName}</TableCell>
                    <TableCell>{councilor.party}</TableCell>
                    <TableCell>
                      {councilor.isPresent ? (
                        <div className="flex items-center text-green-600 font-medium">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Presente
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600 font-medium">
                          <XCircle className="mr-2 h-4 w-4" />
                          Ausente
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {councilor.arrivedAt 
                        ? format(new Date(councilor.arrivedAt), "HH:mm:ss", { locale: ptBR }) 
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
