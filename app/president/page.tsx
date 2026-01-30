
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PresidentDashboard } from "@/components/president-dashboard"

export default async function PresidentPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'PRESIDENT') {
    redirect('/login')
  }

  return <PresidentDashboard />
}
