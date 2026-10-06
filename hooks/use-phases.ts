"use client"

import { useCallback, useEffect, useState } from "react"
import type { PhaseDefinition } from "@/lib/phases"

export function usePhases(refreshMs = 30000) {
  const [phases, setPhases] = useState<PhaseDefinition[]>([])

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/phases', { cache: 'no-store' })
      if (response.ok) setPhases(await response.json())
    } catch (error) {
      console.error('Erro ao carregar fases:', error)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, refreshMs)
    return () => clearInterval(interval)
  }, [refresh, refreshMs])

  return { phases, refresh }
}
