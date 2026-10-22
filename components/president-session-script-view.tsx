"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { ArrowLeft, CheckCircle2, Loader2, NotebookPen } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

type ScriptItem = {
  id: string;
  sectionTitle: string | null;
  content: string;
  orderIndex: number;
  isCompleted: boolean;
  completedAt: string | null;
  presidentNotes: string | null;
};

type ScriptResponse = {
  session: {
    id: string;
    title: string;
    sessionNumber: string;
    status: string;
    date: string;
  } | null;
  items: ScriptItem[];
  summary: {
    total: number;
    completed: number;
  } | null;
};

type ScriptApiResponse = ScriptResponse | { error: string };

export function PresidentSessionScriptView() {
  const [data, setData] = useState<ScriptResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const groupedItems = useMemo(() => {
    return (data?.items || []).reduce<Array<{ sectionTitle: string; items: ScriptItem[] }>>((groups, item) => {
      const sectionTitle = item.sectionTitle?.trim() || "Roteiro da Sessão";
      const existingGroup = groups.find((group) => group.sectionTitle === sectionTitle);

      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({ sectionTitle, items: [item] });
      }

      return groups;
    }, []);
  }, [data?.items]);

  const fetchScript = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/president/session-script");
      const result: ScriptApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(("error" in result && result.error) || "Erro ao carregar roteiro");
      }

      if ("error" in result) {
        throw new Error(result.error);
      }

      setData(result);
      setNoteDrafts(
        Object.fromEntries(
          (result.items as ScriptItem[]).map((item) => [item.id, item.presidentNotes || ""])
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar roteiro");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchScript();
  }, [fetchScript]);

  const updateItemInState = (updatedItem: ScriptItem) => {
    setData((current) => {
      if (!current) return current;

      const nextItems = current.items.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      return {
        ...current,
        items: nextItems,
        summary: {
          total: nextItems.length,
          completed: nextItems.filter((item) => item.isCompleted).length,
        },
      };
    });
  };

  const patchItem = async (itemId: string, payload: { isCompleted?: boolean; presidentNotes?: string | null }) => {
    try {
      setSavingItemId(itemId);
      const response = await fetch("/api/president/session-script", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          ...payload,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erro ao atualizar item");
      }

      updateItemInState(result);
      return result as ScriptItem;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar item");
      return null;
    } finally {
      setSavingItemId(null);
    }
  };

  const handleToggle = async (item: ScriptItem, checked: boolean) => {
    const updatedItem = await patchItem(item.id, { isCompleted: checked });
    if (updatedItem) {
      toast.success(checked ? "Item marcado como realizado" : "Item desmarcado");
    }
  };

  const handleSaveNote = async (item: ScriptItem) => {
    const draft = noteDrafts[item.id] ?? "";
    const updatedItem = await patchItem(item.id, { presidentNotes: draft });
    if (updatedItem) {
      toast.success("Nota salva");
    }
  };

  const total = data?.summary?.total || 0;
  const completed = data?.summary?.completed || 0;
  const progressValue = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/president">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              <Badge variant="outline">Acompanhamento da Sessão</Badge>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Roteiro do Presidente</h1>
            <p className="text-gray-600">
              Marque os itens realizados e registre observações da condução da sessão.
            </p>
          </div>

          {data?.session && (
            <Card className="w-full md:w-auto">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">{data.session.title}</p>
                  <p className="text-sm text-gray-600">
                    {data.session.sessionNumber ? `Sessão ${data.session.sessionNumber} · ` : ""}
                    {new Date(data.session.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center gap-3 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando roteiro...
            </CardContent>
          </Card>
        ) : !data?.session ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">
              Nenhuma sessão disponível para acompanhar no momento.
            </CardContent>
          </Card>
        ) : data.items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-600">
              O administrador ainda não cadastrou um roteiro para esta sessão.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">Andamento do roteiro</p>
                    <p className="text-sm text-gray-600">
                      {completed} de {total} item(ns) concluídos
                    </p>
                  </div>
                  <Badge className="bg-green-600">{Math.round(progressValue)}%</Badge>
                </div>
                <Progress value={progressValue} />
              </CardContent>
            </Card>

            {groupedItems.map((group) => (
              <Card key={group.sectionTitle}>
                <CardHeader>
                  <CardTitle className="text-lg uppercase tracking-wide">{group.sectionTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.items.map((item) => {
                    const draft = noteDrafts[item.id] ?? "";
                    const isSaving = savingItemId === item.id;

                    return (
                      <div key={item.id} className="rounded-xl border bg-white p-4 space-y-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={item.isCompleted}
                            onCheckedChange={(checked) => void handleToggle(item, checked === true)}
                            disabled={isSaving}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                              <p className={`text-sm md:text-base ${item.isCompleted ? "text-gray-500 line-through" : "text-gray-900"}`}>
                                {item.content}
                              </p>
                              <div className="flex items-center gap-2">
                                {item.isCompleted ? (
                                  <Badge className="bg-green-600">
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    Realizado
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Pendente</Badge>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <NotebookPen className="h-4 w-4" />
                                Notas do presidente
                              </label>
                              <Textarea
                                rows={3}
                                value={draft}
                                onChange={(e) => setNoteDrafts((current) => ({ ...current, [item.id]: e.target.value }))}
                                placeholder="Ex: Indicação verbal do vereador Fulano sobre iluminação pública."
                                disabled={isSaving}
                              />
                              <div className="flex justify-end">
                                <Button variant="outline" onClick={() => void handleSaveNote(item)} disabled={isSaving}>
                                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                  Salvar nota
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
