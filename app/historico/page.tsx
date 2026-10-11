import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HistoryView } from "@/components/history-view";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !["ADMIN", "PRESIDENT"].includes(session.user.role)) {
    redirect("/login");
  }

  return <HistoryView />;
}
