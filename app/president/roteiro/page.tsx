import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PresidentSessionScriptView } from "@/components/president-session-script-view";

export default async function PresidentScriptPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "PRESIDENT") {
    redirect("/login");
  }

  return <PresidentSessionScriptView />;
}
