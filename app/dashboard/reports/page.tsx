import ReportsClient from "@/components/reports/ReportsClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function ReportsDashboardPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["faculty", "admin", "registrar"]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-zinc-50 p-6">
      <ReportsClient />
    </main>
  );
}
