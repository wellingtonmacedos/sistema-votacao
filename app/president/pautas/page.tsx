"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, ThumbsUp, ThumbsDown, MinusCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Matter = {
  id: string;
  title: string;
  description: string;
  status: string;
  orderIndex: number;
  yesVotes: number;
  noVotes: number;
  abstentionVotes: number;
  totalVotes: number;
};

type SessionData = {
  id: string;
  title: string;
  sessionNumber: string;
  status: string;
  date: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  VOTING: "Em votação",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  ABSTAINED: "Adiada",
};

const STATUS_VARIANTS: Record<string, string> = {
  PENDING: "outline",
  VOTING: "default",
  APPROVED: "default",
  REJECTED: "destructive",
  ABSTAINED: "secondary",
};

export default function PresidentMattersPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatters = async () => {
      try {
        const res = await fetch("/api/matters");
        if (res.ok) {
          const data = await res.json();
          setSession(data.session);
          setMatters(data.matters || []);
        }
      } catch (error) {
        console.error("Erro ao buscar pautas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatters();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Pautas da Sessão</h1>
            <p className="text-gray-600">
              {session ? (
                <>
                  {session.title}{" "}
                  {session.sessionNumber && (
                    <span className="text-gray-500">({session.sessionNumber})</span>
                  )}{" "}
                  — {format(new Date(session.date), "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                "Consulte as matérias para votação"
              )}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/president")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Carregando pautas...
            </CardContent>
          </Card>
        ) : !session ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma sessão ativa no momento.</p>
              <p className="text-sm mt-1">As pautas serão exibidas quando houver uma sessão ativa.</p>
            </CardContent>
          </Card>
        ) : matters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhuma pauta cadastrada para esta sessão.</p>
              <p className="text-sm mt-1">O administrador pode cadastrar pautas no painel administrativo.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {matters.map((matter, idx) => (
              <Card key={matter.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {idx + 1}
                      </span>
                      <div>
                        <CardTitle className="text-lg">{matter.title}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{matter.description}</p>
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANTS[matter.status] as any}>
                      {STATUS_LABELS[matter.status] || matter.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-green-600">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="font-medium">{matter.yesVotes}</span>
                      <span className="text-gray-500">Sim</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-600">
                      <ThumbsDown className="h-4 w-4" />
                      <span className="font-medium">{matter.noVotes}</span>
                      <span className="text-gray-500">Não</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MinusCircle className="h-4 w-4" />
                      <span className="font-medium">{matter.abstentionVotes}</span>
                      <span className="text-gray-500">Abstenção</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 ml-auto">
                      <Clock className="h-4 w-4" />
                      <span>
                        {matter.totalVotes} voto(s)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
