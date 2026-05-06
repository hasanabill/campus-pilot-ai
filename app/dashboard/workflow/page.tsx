import WorkflowTasksClient from "@/components/workflow/WorkflowTasksClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function WorkflowTasksPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin", "faculty", "registrar"]);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <WorkflowTasksClient />
    </main>
  );
}
