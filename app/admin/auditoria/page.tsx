"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  LayoutDashboard,
  Shield,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { toast } from "react-hot-toast"

interface AuditLogEntry {
  id: string
  action: string
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: { id: string; fullName: string; email: string; role: string } | null
}

interface AuditResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  actions: string[]
}

interface UserOption {
  id: string
  fullName: string
  email: string
}

const PAGE_SIZE = 20

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCESSO: "Login bem-sucedido",
  LOGIN_FALHA: "Falha de login",
  LOGIN_BLOQUEADO: "Login bloqueado",
  USUARIO_CRIADO: "Usuário criado",
  USUARIO_ATUALIZADO: "Usuário atualizado",
  USUARIO_EXCLUIDO: "Usuário excluído",
  VOTACAO_INICIADA: "Votação iniciada",
  VOTACAO_ENCERRADA: "Votação encerrada",
  SESSAO_CRIADA: "Sessão criada",
  SESSAO_INICIADA: "Sessão iniciada",
  SESSAO_ENCERRADA: "Sessão encerrada",
  SESSAO_FASE_ALTERADA: "Fase alterada",
  ALTERACAO_SENHA: "Alteração de senha",
  VIEW_REPORT: "Consulta de relatório",
}

const actionLabel = (action: string) => ACTION_LABELS[action] ?? action

const actionBadgeClass = (action: string) => {
  if (action.startsWith("LOGIN")) return "bg-blue-100 text-blue-700 border-blue-200"
  if (action.startsWith("USUARIO")) return "bg-indigo-100 text-indigo-700 border-indigo-200"
  if (action.startsWith("VOTACAO")) return "bg-purple-100 text-purple-700 border-purple-200"
  if (action.startsWith("SESSAO")) return "bg-emerald-100 text-emerald-700 border-emerald-200"
  return "bg-gray-100 text-gray-700 border-gray-200"
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" })

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [actionFilter, setActionFilter] = useState("all")
  const [userFilter, setUserFilter] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [queryInput, setQueryInput] = useState("")
  const [appliedQuery, setAppliedQuery] = useState("")

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(PAGE_SIZE))
      if (actionFilter !== "all") params.set("action", actionFilter)
      if (userFilter !== "all") params.set("userId", userFilter)
      if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString())
      if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString())
      if (appliedQuery.trim()) params.set("q", appliedQuery.trim())

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || "Falha ao carregar a auditoria")
      }
      const data: AuditResponse = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      if (data.actions.length > 0) setActions(data.actions)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar a auditoria")
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter, userFilter, from, to, appliedQuery])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch("/api/users")
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data)) {
          setUsers(data.map((u: UserOption) => ({ id: u.id, fullName: u.fullName, email: u.email })))
        }
      } catch {
        // Silencioso: o filtro por usuário é opcional.
      }
    }
    loadUsers()
  }, [])

  const applyQuery = () => {
    setPage(1)
    setAppliedQuery(queryInput)
  }

  const clearFilters = () => {
    setActionFilter("all")
    setUserFilter("all")
    setFrom("")
    setTo("")
    setQueryInput("")
    setAppliedQuery("")
    setPage(1)
  }

  return (
    <div className="container mx-auto py-6 px-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-rose-600" />
            Auditoria
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro das ações críticas realizadas no sistema
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Ação</label>
              <Select
                value={actionFilter}
                onValueChange={(value) => {
                  setActionFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {actionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Usuário</label>
              <Select
                value={userFilter}
                onValueChange={(value) => {
                  setUserFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">De</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Até</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Detalhes</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar nos detalhes"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyQuery()
                  }}
                />
                <Button variant="outline" size="icon" onClick={applyQuery} aria-label="Buscar">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="ghost" size="sm" className="gap-2" onClick={clearFilters}>
              <RefreshCw className="h-4 w-4" />
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Data/Hora</TableHead>
                <TableHead className="w-[200px]">Usuário</TableHead>
                <TableHead className="w-[170px]">Ação</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead className="w-[130px]">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhum registro encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.user ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{log.user.fullName}</span>
                          <span className="text-xs text-gray-500">{log.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Não identificado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={actionBadgeClass(log.action)}>
                        {actionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">{log.details ?? "—"}</TableCell>
                    <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                      {log.ipAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {total} registro{total === 1 ? "" : "s"} · Página {page} de {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
