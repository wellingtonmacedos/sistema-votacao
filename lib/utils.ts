import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Nome de exibição do vereador/presidente: o apelido (nome de urna) tem
// precedência sobre o nome completo. Sem apelido, usa o nome completo.
export function getDisplayName(person: { nickname?: string | null; fullName: string }): string {
  return person.nickname?.trim() || person.fullName
}