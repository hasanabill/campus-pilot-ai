import type { UserRole } from "@/models/User";

export function hasRole(userRole: UserRole | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) {
    return false;
  }

  return allowedRoles.includes(userRole);
}
