import KnowledgeBaseUploadClient from "@/components/kb/KnowledgeBaseUploadClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function KnowledgeBasePage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin"]);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <KnowledgeBaseUploadClient defaultDepartmentId={session?.user?.department_id} />
    </main>
  );
}
