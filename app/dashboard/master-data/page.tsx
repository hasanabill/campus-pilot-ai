import MasterDataClient from "@/components/master-data/MasterDataClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function MasterDataPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin"]);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <MasterDataClient />
    </main>
  );
}
