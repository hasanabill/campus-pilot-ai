import TicketListClient from "@/components/tickets/TicketListClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function AdminTicketDashboardPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin", "faculty", "registrar"]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-zinc-50 p-6">
      <TicketListClient adminMode />
    </main>
  );
}
