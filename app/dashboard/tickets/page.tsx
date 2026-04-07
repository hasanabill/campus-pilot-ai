import TicketListClient from "@/components/tickets/TicketListClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function AdminTicketDashboardPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin", "faculty", "registrar"]);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <TicketListClient adminMode />
    </main>
  );
}
