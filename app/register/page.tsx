import RegisterFormClient from "@/components/auth/RegisterFormClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function RegisterPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin"]);

  return <RegisterFormClient />;
}
