"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarDays, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function PresidentNewSessionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Sessão criada com sucesso!");
        router.push("/president");
      } else {
        const error = await response.json();
        toast.error(error.error || "Erro ao criar sessão");
      }
    } catch (error) {
      console.error("Erro ao criar sessão:", error);
      toast.error("Erro de conexão ao criar sessão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push("/president")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao painel
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <PlusCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Criar Nova Sessão</CardTitle>
                <CardDescription>
                  Agende uma nova sessão ordinária
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Título da Sessão <span className="text-gray-400 font-normal">(opcional)</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Deixe em branco para gerar automaticamente"
                />
                <p className="text-xs text-gray-500">
                  Se não preencher, o título será gerado automaticamente com base no número da sessão.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  Data da Sessão
                </Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/president")}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Criando..." : "Criar Sessão"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Observação:</strong> Só pode existir uma sessão ativa por vez.
            Se já houver uma sessão em andamento, encerre-a antes de criar uma nova.
          </p>
        </div>
      </div>
    </div>
  );
}
