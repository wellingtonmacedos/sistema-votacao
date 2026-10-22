"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type ScriptItemForm = {
  id?: string;
  sectionTitle: string;
  content: string;
  orderIndex: number;
};

type SessionScriptResponse = {
  id: string;
  title: string;
  sessionNumber: string;
  status: string;
  date: string;
  scriptItems: Array<{
    id: string;
    sectionTitle: string | null;
    content: string;
    orderIndex: number;
  }>;
};

type SessionScriptApiResponse = SessionScriptResponse | { error: string };
type SaveScriptApiResponse =
  | { success: boolean; items: Array<{ id: string; sectionTitle: string | null; content: string; orderIndex: number }> }
  | { error: string };

const emptyItem = (orderIndex: number): ScriptItemForm => ({
  sectionTitle: "",
  content: "",
  orderIndex,
});

export function AdminSessionScriptEditor({ sessionId }: { sessionId: string }) {
  const [sessionData, setSessionData] = useState<SessionScriptResponse | null>(null);
  const [items, setItems] = useState<ScriptItemForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const groupedPreview = useMemo(() => {
    return items.reduce<Array<{ sectionTitle: string; items: ScriptItemForm[] }>>((groups, item) => {
      const sectionTitle = item.sectionTitle.trim() || "Roteiro da Sessão";
      const existingGroup = groups.find((group) => group.sectionTitle === sectionTitle);

      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({ sectionTitle, items: [item] });
      }

      return groups;
    }, []);
  }, [items]);

  const fetchScript = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/session-script?sessionId=${sessionId}`);
      const data: SessionScriptApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(("error" in data && data.error) || "Erro ao carregar roteiro");
      }

      if ("error" in data) {
        throw new Error(data.error);
      }

      setSessionData(data);
      setItems(
        data.scriptItems.length > 0
          ? data.scriptItems.map((item) => ({
              id: item.id,
              sectionTitle: item.sectionTitle || "",
              content: item.content,
              orderIndex: item.orderIndex,
            }))
          : [emptyItem(0)]
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar roteiro");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void fetchScript();
  }, [fetchScript]);

  const syncOrder = (nextItems: ScriptItemForm[]) => {
    return nextItems.map((item, index) => ({
      ...item,
      orderIndex: index,
    }));
  };

  const updateItem = (index: number, field: keyof ScriptItemForm, value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [...current, emptyItem(current.length)]);
  };

  const removeItem = (index: number) => {
    setItems((current) => {
      const filtered = current.filter((_, itemIndex) => itemIndex !== index);
      return syncOrder(filtered.length > 0 ? filtered : [emptyItem(0)]);
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const nextItems = [...current];
      const [moved] = nextItems.splice(index, 1);
      nextItems.splice(targetIndex, 0, moved);
      return syncOrder(nextItems);
    });
  };

  const handleSave = async () => {
    const cleanedItems = syncOrder(
      items
        .map((item) => ({
          ...item,
          sectionTitle: item.sectionTitle.trim(),
          content: item.content.trim(),
        }))
        .filter((item) => item.content)
    );

    if (cleanedItems.length === 0) {
      toast.error("Adicione pelo menos um item ao roteiro");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/admin/session-script", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          items: cleanedItems,
        }),
      });

      const data: SaveScriptApiResponse =
        await response.json();
      if (!response.ok) {
        throw new Error(("error" in data && data.error) || "Erro ao salvar roteiro");
      }

      if ("error" in data) {
        throw new Error(data.error);
      }

      toast.success("Roteiro salvo com sucesso");
      await fetchScript();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar roteiro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Link>
              </Button>
              <Badge variant="outline">Roteiro da Sessão</Badge>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Cadastro do Roteiro</h1>
            <p className="text-gray-600">
              Monte o passo a passo que o presidente vai acompanhar durante a sessão.
            </p>
          </div>

          {sessionData && (
            <Card className="w-full md:w-auto">
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">{sessionData.title}</p>
                  <p className="text-sm text-gray-600">
                    {sessionData.sessionNumber ? `Sessão ${sessionData.sessionNumber} · ` : ""}
                    {new Date(sessionData.date).toLocaleDateString("pt-BR")}
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
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Itens do Roteiro</CardTitle>
                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item, index) => (
                  <div key={`${item.id || "new"}-${index}`} className="rounded-xl border p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">Item {index + 1}</Badge>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="icon" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Seção</label>
                      <Input
                        value={item.sectionTitle}
                        onChange={(e) => updateItem(index, "sectionTitle", e.target.value)}
                        placeholder="Ex: Pequeno Expediente"
                      />
                      <p className="text-xs text-gray-500">
                        Repita a mesma seção nos itens seguintes para agrupá-los na visualização do presidente.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Item do roteiro</label>
                      <Textarea
                        rows={4}
                        value={item.content}
                        onChange={(e) => updateItem(index, "content", e.target.value)}
                        placeholder="Ex: Convidar a 1ª secretária para fazer a leitura do expediente da semana."
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar roteiro
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pré-visualização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {groupedPreview.length === 0 ? (
                  <p className="text-sm text-gray-500">Adicione itens para visualizar o roteiro.</p>
                ) : (
                  groupedPreview.map((group) => (
                    <div key={group.sectionTitle} className="space-y-3">
                      <div className="border-b pb-2">
                        <h3 className="font-semibold text-gray-900 uppercase tracking-wide text-sm">{group.sectionTitle}</h3>
                      </div>
                      <div className="space-y-3">
                        {group.items.map((item, index) => (
                          <div key={`${group.sectionTitle}-${index}`} className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                            {item.content || "Item vazio"}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
