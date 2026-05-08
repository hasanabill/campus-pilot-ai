import ProfileClient from "@/components/profile/ProfileClient";
import { auth } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function ProfilePage() {
  const session = await auth();
  requireAuthenticatedUser(session);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <ProfileClient />
    </main>
  );
}
