import FaqManagerClient from "@/components/faqs/FaqManagerClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function FaqManagerPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin"]);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <FaqManagerClient />
    </main>
  );
}
