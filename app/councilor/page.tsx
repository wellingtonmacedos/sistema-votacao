
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CouncilorDashboard } from "@/components/councilor-dashboard"

export default async function CouncilorPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'COUNCILOR') {
    redirect('/login')
  }

  return <CouncilorDashboard />
}
