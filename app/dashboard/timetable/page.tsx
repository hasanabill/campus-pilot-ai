import RoutineGeneratorClient from "@/components/routine/RoutineGeneratorClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function TimetablePlannerPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin"]);

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-2 md:p-4">
      <RoutineGeneratorClient />
    </main>
  );
}
