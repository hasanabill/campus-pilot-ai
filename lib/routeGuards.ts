import { redirect } from "next/navigation";

type AppRole = "student" | "faculty" | "admin" | "registrar";

type SessionLike = {
  user?: {
    id?: string;
    role?: AppRole;
  };
} | null;

type AuthenticatedUser = {
  id: string;
  role: AppRole;
};

export function requireAuthenticatedUser(session: SessionLike): AuthenticatedUser {
  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    role: session.user.role,
  };
}

export function requireAnyRole(role: AppRole, allowedRoles: AppRole[]) {
  if (!allowedRoles.includes(role)) {
    redirect("/unauthorized");
  }
}
