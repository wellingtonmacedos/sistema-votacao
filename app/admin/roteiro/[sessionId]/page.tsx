import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminSessionScriptEditor } from "@/components/admin-session-script-editor";

export default async function AdminSessionScriptPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return <AdminSessionScriptEditor sessionId={params.sessionId} />;
}
