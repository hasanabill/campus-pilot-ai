import ApprovalsQueueClient from "@/components/approvals/ApprovalsQueueClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function ApprovalsPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin", "registrar"]);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <ApprovalsQueueClient />
    </main>
  );
}
